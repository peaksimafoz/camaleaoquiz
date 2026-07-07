-- ═══════════════════════════════════════════════════════════════════════════
-- camaleaoquiz — schema do banco (rodar no SQL Editor do Supabase)
-- ═══════════════════════════════════════════════════════════════════════════
-- Modelo single-tenant (sem separação por user_id no MVP). O acesso público
-- (página do quiz) é mediado por rotas de API com service role, então o RLS
-- libera apenas usuários AUTENTICADOS a ler/escrever direto nas tabelas.

-- Extensão para gerar UUIDs
create extension if not exists "pgcrypto";

-- ── quizzes ──────────────────────────────────────────────────────────────────
create table if not exists quizzes (
  id                    uuid primary key default gen_random_uuid(),
  name                  text not null,
  slug                  text not null unique,
  type                  text not null default 'A' check (type in ('A','B')),
  status                text not null default 'draft' check (status in ('draft','active')),
  webhook_url           text,
  lead_capture_position text not null default 'end' check (lead_capture_position in ('start','middle','end')),
  settings              jsonb not null default '{}'::jsonb,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ── questions ────────────────────────────────────────────────────────────────
create table if not exists questions (
  id       uuid primary key default gen_random_uuid(),
  quiz_id  uuid not null references quizzes(id) on delete cascade,
  "order"  int not null default 0,
  text     text not null default '',
  type     text not null default 'multiple_choice' check (type in ('multiple_choice','scale','text')),
  options  jsonb not null default '[]'::jsonb
);
create index if not exists questions_quiz_id_idx on questions (quiz_id, "order");

-- ── results ──────────────────────────────────────────────────────────────────
create table if not exists results (
  id              uuid primary key default gen_random_uuid(),
  quiz_id         uuid not null references quizzes(id) on delete cascade,
  name            text not null default '',
  text            text not null default '',
  cta_label       text,
  cta_url         text,
  score_condition jsonb not null default '{}'::jsonb,
  "order"         int not null default 0
);
create index if not exists results_quiz_id_idx on results (quiz_id, "order");

-- ── leads ────────────────────────────────────────────────────────────────────
create table if not exists leads (
  id         uuid primary key default gen_random_uuid(),
  quiz_id    uuid not null references quizzes(id) on delete cascade,
  name       text,
  email      text,
  whatsapp   text,
  instagram  text,
  answers    jsonb not null default '{}'::jsonb,
  scores     jsonb not null default '{}'::jsonb,
  result_id  uuid references results(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists leads_quiz_id_idx on leads (quiz_id, created_at desc);

-- ── quiz_events ──────────────────────────────────────────────────────────────
create table if not exists quiz_events (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid not null references quizzes(id) on delete cascade,
  lead_id     uuid references leads(id) on delete set null,
  event_type  text not null check (event_type in ('view','start','question_answered','completed','abandoned')),
  question_id uuid,
  created_at  timestamptz not null default now()
);
create index if not exists quiz_events_quiz_type_idx on quiz_events (quiz_id, event_type);

-- ── updated_at automático em quizzes ─────────────────────────────────────────
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists quizzes_set_updated_at on quizzes;
create trigger quizzes_set_updated_at
  before update on quizzes
  for each row execute function set_updated_at();

-- ── RLS ──────────────────────────────────────────────────────────────────────
-- Só usuários autenticados (painel admin) acessam as tabelas diretamente.
-- As rotas /api/public/* usam a service role, que ignora o RLS.
alter table quizzes     enable row level security;
alter table questions   enable row level security;
alter table results     enable row level security;
alter table leads       enable row level security;
alter table quiz_events enable row level security;

do $$
declare t text;
begin
  foreach t in array array['quizzes','questions','results','leads','quiz_events']
  loop
    execute format('drop policy if exists "auth_all" on %I;', t);
    execute format(
      'create policy "auth_all" on %I for all to authenticated using (true) with check (true);',
      t
    );
  end loop;
end $$;
