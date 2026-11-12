-- Guarda quando a conta fechou o card de boas-vindas. Nullable e sem default: as contas
-- existentes veem o card uma vez. O código anterior ignora a coluna, então a migração pode ir antes.
alter table public.accounts add column welcome_seen_at timestamptz;
comment on column public.accounts.welcome_seen_at is
  'Quando a conta fechou o card de boas-vindas pela primeira vez. Nulo: ainda não fechou. Demo não grava.';
