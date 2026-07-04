# camaleaoquiz

Plataforma de funis de vendas interativos baseados em quiz (estilo inlead.digital).
Painel administrativo autenticado + página pública do quiz, com pontuação,
captura de lead, webhook de integração e dashboard de métricas.

## Stack

Next.js 14 (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres + Auth) · Vercel.

## Rodando localmente

```bash
npm install
cp .env.local.example .env.local   # preencha as chaves do Supabase
npm run dev                        # http://localhost:3000
```

Rode o SQL de `supabase/schema.sql` no SQL Editor do Supabase para criar as tabelas.
Crie um usuário admin em Authentication → Users → Add user (Auto Confirm).

## Variáveis de ambiente

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (secreta — usada nas rotas `/api/public/*`)

## Comandos

```bash
npm run dev     # desenvolvimento
npm run build   # build de produção (roda tsc — falha em erro de tipo)
npm run lint    # ESLint
npm start       # roda o build
```
