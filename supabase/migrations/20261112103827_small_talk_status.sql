-- Acrescenta o status small_talk (cumprimento respondido pela regra local) ao check de messages.
-- A constraint da migração inicial é inline e sem nome, então o Postgres usou o nome padrão
-- messages_status_check. Só alarga o check: o código anterior segue funcionando.
alter table public.messages drop constraint messages_status_check;
alter table public.messages add constraint messages_status_check
  check (status in ('answered', 'small_talk', 'fallback', 'blocked_input', 'blocked_output'));
