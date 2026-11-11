-- Contas do login (change add-google-and-demo-login, ADR 0020).
-- RLS ligado e sem policies, como as demais tabelas (ADR 0005).
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('google', 'demo')),
  google_sub text unique,
  email text,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint accounts_kind_fields check (
    (kind = 'google' and google_sub is not null and email is not null and expires_at is null)
    or (kind = 'demo' and google_sub is null and email is null and expires_at is not null)
  )
);
create index accounts_demo_expires_idx on public.accounts (expires_at) where kind = 'demo';
create index accounts_google_last_seen_idx on public.accounts (last_seen_at) where kind = 'google';
alter table public.accounts enable row level security;

-- demo_day: contas demo criadas por IP por dia. account_day: mensagens por conta por dia
-- (usado na change move-profile-to-account).
alter table public.rate_limits drop constraint rate_limits_bucket_check;
alter table public.rate_limits add constraint rate_limits_bucket_check
  check (bucket in ('minute', 'day', 'demo_day', 'account_day'));
comment on column public.rate_limits.ip_hash is
  'Chave do contador: HMAC do IP (minute, day, demo_day) ou id da conta (account_day).';
