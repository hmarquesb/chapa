-- Preparação do banco dev (Neon) para as migrações de supabase/migrations/.
-- Cria o que o Supabase já traz pronto e a migração inicial espera.
-- Idempotente. Nunca rode no prod: no Supabase esses objetos já existem.
-- Um único comando, porque o `db query -f` da Supabase CLI não aceita vários.
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_admin') then
    raise exception 'dev-bootstrap.sql é só para o banco dev (Neon), não para um projeto Supabase';
  end if;

  create schema if not exists extensions;

  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
end
$$;
