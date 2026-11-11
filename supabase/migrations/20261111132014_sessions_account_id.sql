-- Conversas por conta (change scope-conversations-to-accounts, ADR 0021).
-- Só acrescenta: o código anterior, que grava conversas web sem conta, continua funcionando
-- até o deploy. A restrição "web tem conta" entra na migração da change move-profile-to-account,
-- depois que este código estiver em produção.
alter table public.sessions
  add column account_id uuid references public.accounts (id) on delete cascade;
create index sessions_account_activity_idx
  on public.sessions (account_id, last_activity_at desc)
  where account_id is not null;
