-- Toda conversa web pertence a uma conta, e as de cli e eval nunca têm (ADR 0021).
-- Adiada pela change scope-conversations-to-accounts para depois do deploy dela, quando todo
-- código em produção já grava o account_id. O delete garante que nenhuma conversa anônima
-- sobrou da época sem login (a limpeza diária já as apaga).
delete from public.sessions where channel = 'web' and account_id is null;
alter table public.sessions add constraint sessions_account_by_channel
  check ((channel = 'web') = (account_id is not null));
