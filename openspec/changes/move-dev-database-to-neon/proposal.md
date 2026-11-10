# Proposal

## Why

O plano gratuito do Supabase permite dois projetos ativos por conta, e o Chapa ocupa os dois (`dev` e `prod`, [ADR 0006](../../../docs/adr/0006-bancos-dev-e-prod-separados.md)). A pessoa quer liberar uma vaga para outro projeto sem perder o ambiente de desenvolvimento nem os previews da Vercel com banco. A demo está em produção desde 06/11/2026, então o `dev` pode mudar de provedor sem afetar quem usa a demo.

## What Changes

- O ambiente `dev` (local, `npm run chat`, `npm run eval`, `npm run ingest` e o Preview da Vercel) passa a usar um projeto **Postgres gratuito no Neon** em vez do projeto Supabase `dev`. O Supabase fica **só com o `prod`**.
- Entra um **script SQL de preparação, idempotente** (`supabase/dev-bootstrap.sql`), rodado no Neon antes das migrações. Ele cria o que a migração espera e que só o Supabase traz pronto: o schema `extensions` e os papéis `anon` e `authenticated` (sem login). As migrações existentes não mudam.
- As migrações são aplicadas no Neon com a Supabase CLI que já está no projeto (`db push --remote=<url>`), pela conexão direta, sem pooler. O app continua usando a string **com pooler** do Neon no `DATABASE_URL`, e o driver já roda com `prepare: false`.
- O `.env.example` ganha a variável opcional `DATABASE_URL_UNPOOLED`, usada só para aplicar migrações no `dev`. O app não a lê.
- Novo **ADR 0017**, "Usar o Neon como banco `dev` e o Supabase só no `prod`", que substitui o ADR 0006. O status do ADR 0001 registra que o `dev` mudou de provedor.
- Atualização da documentação que cita o Supabase `dev`: `AGENTS.md`, `CLAUDE.md` (autorizações prévias), `DEPLOY.md`, `README.md`, `docs/architecture.md`, `docs/qa.md` e `docs/adr/README.md`.
- O projeto Supabase `dev` é pausado (o que libera a vaga) e só é excluído depois que o `dev` no Neon passar no smoke do preview. As duas ações são da pessoa.

Nenhuma mudança de comportamento do sistema: as rotas, o fluxo da mensagem, o schema e as regras de RAG continuam iguais.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

Nenhuma. A mudança é de infraestrutura de desenvolvimento e de documentação, e nenhum requisito de `openspec/specs/` muda. O cenário de RLS da `chat-api`, que fala da chave pública do Supabase, continua valendo para o `prod`. Por isso a change declara `skip_specs: true`.

## Fora do escopo

- **Supabase local com Docker.** Foi discutido e pode virar uma change própria. Aqui o `dev` continua sendo um banco remoto só.
- **Branch do Neon por preview** e a integração da Vercel com o Neon pelo Marketplace. A integração cria variáveis sozinha, inclusive em Production, o que poderia apontar a produção para o `dev`. As variáveis continuam sendo definidas à mão.
- **Copiar os dados do Supabase `dev`.** As sessões de teste são descartáveis, e os trechos da base são ingeridos de novo. Os resultados das avaliações já estão em `eval/resultados/`.
- **Qualquer mudança no `prod`**, no código de `src/` e `scripts/`, nas migrações e no cron.
- Reescrever o histórico: `eval/resultados/CALIBRACAO.md`, o registro de execução do `DEPLOY.md`, os ADRs 0002 a 0016 e `docs/history/` continuam citando o `dev` antigo, o que é correto para a época.

## Chamadas reais e checkpoints humanos

A mudança chama banco e API reais, sempre no `dev` novo e nunca no `prod`:

1. **Pessoa (feito em 10/11/2026):** criar a conta e o projeto no Neon (`chapa-dev`, Postgres 17, `aws-sa-east-1`) e colocar as duas strings no `.env.local` do checkout principal: `DATABASE_URL` (com pooler) e `DATABASE_URL_UNPOOLED` (direta). As strings foram gravadas pelo `neon env pull`, sem passar pela conversa.
2. **Orquestrador, com autorização nesta tarefa:** rodar o bootstrap e o `db push` no Neon, conferir o RLS e as policies (somente leitura), rodar o `npm run ingest` no Neon e fazer a verificação manual com `npm run chat`.
3. **Pessoa:** trocar o `DATABASE_URL` de **Preview** na Vercel para a string com pooler do Neon e fazer Redeploy do preview. Depois, rodar o smoke contra o preview, ou autorizar que o orquestrador rode.
4. **Pessoa:** pausar o projeto Supabase `dev`, o que já libera a vaga. Excluir só depois de alguns dias de uso sem problema, porque a exclusão não tem volta.

As autorizações prévias do `CLAUDE.md` que citam o "Supabase `dev`" passam a valer para o `dev` no Neon depois do merge. Até lá, os passos 2 e 3 precisam de autorização explícita na tarefa.

## Impact

- **Código e dependências:** nenhum arquivo de `src/` ou `scripts/` muda e nenhuma dependência nova entra. A Supabase CLI já é devDependency.
- **Arquivos novos:** `supabase/dev-bootstrap.sql` e `docs/adr/0017-neon-como-banco-dev.md`.
- **Arquivos alterados:** `.env.example`, `AGENTS.md`, `CLAUDE.md`, `DEPLOY.md`, `README.md`, `docs/architecture.md`, `docs/qa.md`, `docs/adr/README.md`, `docs/adr/0006-bancos-dev-e-prod-separados.md` (só o status) e `docs/adr/0001-supabase-postgres-pgvector.md` (só o status).
- **Serviços:** uma conta nova no Neon (plano gratuito). O Supabase passa de dois projetos para um.
- **Risco aceito:** o `dev` deixa de ser idêntico ao `prod` em versão do Postgres e em extensões. As diferenças conhecidas são cobertas pelo bootstrap, e o `db push` no `prod` continua sendo um checkpoint humano.
