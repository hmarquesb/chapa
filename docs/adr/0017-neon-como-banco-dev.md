# 0017. Usar o Neon como banco dev e o Supabase só no prod

- **Status:** Aceito
- **Data:** 2026-11-10

## Contexto

O [ADR 0006](0006-bancos-dev-e-prod-separados.md) separou o banco em dois projetos Supabase, `dev` e `prod`. O plano gratuito do Supabase permite só 2 projetos ativos por conta, e o Chapa ocupava os dois. A pessoa quer liberar uma vaga para outro projeto.

O ambiente de desenvolvimento precisa continuar tendo banco: o uso local, os scripts `chat`, `eval` e `ingest` e o Preview da Vercel, que roda o smoke antes de cada produção. A demo está em produção desde 06/11/2026, então o `dev` pode mudar de provedor sem afetar quem usa a demo.

## Decisão

- O `dev` (local, CLI, `eval`, `ingest` e Preview da Vercel) passa a usar um projeto **Postgres 17 do Neon Free** (`chapa-dev`, região `aws-sa-east-1`), no branch padrão.
- O banco é preparado com `supabase/dev-bootstrap.sql`, que cria o que a migração espera e só o Supabase traz pronto: o schema `extensions` e os papéis `anon` e `authenticated` (`nologin`). O script é idempotente e recusa rodar num projeto Supabase.
- As migrações de `supabase/migrations/` são aplicadas no Neon com a Supabase CLI, com `--remote=<url>` e a conexão direta (`DATABASE_URL_UNPOOLED`). O app usa a string com pooler no `DATABASE_URL`.
- O `prod` continua no Supabase, como no [ADR 0001](0001-supabase-postgres-pgvector.md). As migrações não mudam.

## Alternativas consideradas

- **Supabase local com Docker:** fidelidade alta ao `prod`, mas não dá banco para o Preview da Vercel e acrescenta mais um ambiente para manter.
- **Um só projeto Supabase para `dev` e `prod`:** os testes, os previews e as avaliações sujariam os dados da demo.
- **Schema de preview dentro do projeto `prod`:** o preview continuaria preso ao projeto de produção.
- **Integração da Vercel com o Neon (Marketplace), com branch por preview:** ela cria e sobrescreve variáveis sozinha, inclusive em Production, e um erro de configuração apontaria a demo para o `dev`.
- **Segunda conta no Supabase:** contorna o limite do plano em vez de resolvê-lo e espalha as credenciais por duas contas.

## Consequências

- O `dev` deixa de ser idêntico ao `prod`. O bootstrap cobre as diferenças conhecidas, e o `db push` no `prod` continua sendo um checkpoint humano.
- A primeira conexão depois de 5 min ocioso é mais lenta, por causa do scale-to-zero do Neon.
- O `dev` não pausa por inatividade, como acontecia no Supabase Free.
- `db push --remote` sem URL vale só para o `prod`, que é o único projeto linkado. Os comandos do `dev` sempre passam `--remote="$U"`, e o passo 3 do `DEPLOY.md` termina com `npx supabase unlink`.
- O Supabase fica com uma vaga livre depois que a pessoa pausar o projeto `dev` antigo.
