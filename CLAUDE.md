# CLAUDE.md

Guia para o Claude Code trabalhar neste repositório.

## Idioma

Projeto de um usuário brasileiro. Comunique-se em português. Commits, toasts e
comentários no código em PT-BR.

## O que é

Plataforma standalone para criar **funis de vendas baseados em quiz** (estilo
inlead.digital). Dois tipos de funil reaproveitam a mesma engine: **Tipo A**
(diagnóstico/captura de lead) e **Tipo B** (qualificação para oferta). MVP
**single-tenant** (um usuário admin; sem multi-conta ainda). Feito para, no
futuro, integrar via **webhook** com CRM/WhatsApp/e-mail.

## Commands

```bash
npm run dev      # localhost:3000
npm run build    # SEMPRE rode antes de assumir que o deploy passa (roda tsc via next build)
npm run lint
```

Sem suíte de testes. A verificação é `npm run build` — a Vercel falha em qualquer
erro de tipo.

⚠️ **No ambiente do Claude Code (Windows), rode o build pelo Bash tool**, não pelo
PowerShell (o wrapper do PowerShell mata o processo com exit 255). Para parar o dev
server e liberar o `.next`: `netstat -ano | grep :3005` + `taskkill /PID <pid> /T /F`.

## Deploy & Infra

- **Push para `main` → deploy automático na Vercel.**
- **Banco**: Supabase (Postgres). Mudanças de schema exigem rodar SQL manual no SQL
  Editor — o schema completo está em `supabase/schema.sql`. Sempre forneça o SQL e
  peça para o usuário rodar.
- **Env vars** (Vercel + `.env.local`): `NEXT_PUBLIC_SUPABASE_URL`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.

## Arquitetura

### Público vs. Admin (o ponto central de design)

As telas do quiz são **públicas** (tráfego de anúncios, sem login); o painel é
**autenticado**. O RLS libera apenas `authenticated` a ler/escrever as tabelas
direto. O acesso anônimo é mediado por rotas **`/api/public/*`** que usam
`adminClient()` (service role, ignora RLS):

- `GET /api/public/quiz/[slug]` — quiz ativo + perguntas + resultados (só `status='active'`).
- `POST /api/public/submit` — calcula pontuação/resultado (no servidor), grava o
  lead + evento `completed` e **dispara o webhook** (best-effort, timeout 5s, nunca
  quebra o resultado do lead).
- `POST /api/public/event` — grava eventos de funil (`view`/`start`/`question_answered`/`completed`/`abandoned`).

`middleware.ts` protege tudo **exceto** `/login`, `/q/*` e `/api/public/*`.
**Modo demonstração**: sem env do Supabase (`isSupabaseConfigured()` em
`lib/supabase/config.ts`), o middleware libera tudo e o painel entra sem login —
serve para pré-visualizar o UI. Em produção nunca ativa.

### Supabase clients (`lib/supabase/`)

- `client.ts` — browser (`createBrowserClient`), usado no painel (client components).
- `server.ts` — server components/route handlers autenticados (cookies).
- `admin.ts` — service role, **só** em `/api/public/*` (nunca importar no client).

### Camada de dados

- `lib/quizzes.ts` — CRUD de quizzes/questions/results (browser client, roda no painel).
- `lib/public.ts` — `getPublicQuiz(slug)` (service role, `server-only`), usado pela
  página `/q/[slug]` e pela rota de API.
- `lib/scoring.ts` — **engine de pontuação pura** (sem deps): `computeScores`,
  `resolveResult`, `winningCategory`. Usada no servidor (submit). Fonte única da regra.
- `lib/metrics.ts` — agrega `quiz_events` + `leads` em contadores (count queries).

### Modelo de dados (`types/index.ts` + `supabase/schema.sql`)

- **quizzes**: `type` (A/B), `status` (draft/active), `webhook_url`,
  `lead_capture_position` (start/middle/end), `settings` jsonb.
  - `settings.categories: string[]` — **categorias de pontuação** definidas no nível
    do quiz. As opções somam pesos nelas; os resultados decidem por elas.
- **questions**: `type` (multiple_choice/scale/text), `options` jsonb muda de forma
  conforme o type:
  - multiple_choice → `Option[]` (label, `scores` por categoria, `next_question_id`
    ou `end_result_id` = lógica condicional "pular"/"encerrar").
  - scale → `ScaleConfig` (min/max/labels/`scores_per_point`).
  - text → `TextConfig` (placeholder; não pontua).
- **results**: `score_condition` (interface única, não union — para não quebrar o
  narrowing do TS): `winning_category` (categoria de maior score) OU `category`+`min`/`max`
  (faixa) OU `{}` (fallback). Avaliados por `order`, primeiro que casa vence.
- **leads**: `answers`, `scores`, `result_id`.
- **quiz_events**: analytics do funil.

### Rotas

- `app/(admin)/` (route group autenticado): `dashboard`, `quizzes`, `quizzes/[id]`
  (editor com abas Configurações/Perguntas/Resultados/Métricas).
- `app/q/[slug]/` (público): `QuizRunner` (client) roda a experiência mobile-first.
- `app/login/`, `app/page.tsx` (redireciona).

### Estilo

Tailwind CSS (diferente de outros projetos do usuário que usam inline + CSS vars).
Cor de marca padrão: emerald (`#10b981`); cada quiz pode ter `primary_color` próprio.

## Telas

- **Painel** (`components/quizzes/`): `QuizzesView` (lista/criar/excluir),
  `QuizEditor` (shell + abas), `SettingsTab`, `QuestionsTab` (perguntas + opções +
  pontuação + lógica condicional), `ResultsTab`, `MetricsTab`.
- **Público** (`components/public/QuizRunner.tsx`): máquina de estados
  intro→lead→question→submitting→result, com navegação condicional, barra de
  progresso e captura de lead na posição configurada.
