# Tasks

As tarefas marcadas **(pessoa)** dependem de conta, de segredo ou do painel da Vercel. O orquestrador as marca quando a pessoa confirmar. As marcadas **(autorização)** chamam banco ou API reais no `dev` e só rodam com autorização escrita na tarefa. Nenhuma tarefa toca o `prod`.

## 1. Projeto no Neon

- [x] 1.1 **(pessoa)** Criar o projeto no Neon Free com Postgres 17 e gravar no `.env.local` do checkout principal o `DATABASE_URL` (string com pooler, host com `-pooler`) e o `DATABASE_URL_UNPOOLED` (string direta), tirando a string antiga do Supabase `dev`. Feito em 10/11/2026: `chapa-dev` (`plain-block-39762891`), `aws-sa-east-1`, branch `main`, servidor 17.11; strings gravadas com `neon env pull` (decisão 1), sem imprimi-las; o pooler respondeu com `vector` e `unaccent` disponíveis.
- [x] 1.2 Conferir na página de preços e no FAQ do Neon os limites do plano gratuito (projetos, armazenamento, computação, scale-to-zero) e anotar a URL e a data de consulta para a tabela da tarefa 4.3. Verificar: os quatro valores têm fonte e data.

## 2. Bootstrap e migração no `dev`

- [x] 2.1 Criar `supabase/dev-bootstrap.sql` com o conteúdo exato da decisão 2 do `design.md`. Verificar com `git diff --no-index /dev/null supabase/dev-bootstrap.sql` que o arquivo tem a guarda do `supabase_admin`, o `create schema if not exists extensions` e os dois papéis `nologin`.
- [x] 2.2 Acrescentar a `DATABASE_URL_UNPOOLED` comentada e generalizar o comentário do `DATABASE_URL` no `.env.example`, como na decisão 3. Verificar com `git diff .env.example` que nenhuma outra linha mudou e que nenhum valor foi preenchido.
- [x] 2.3 **(autorização)** Rodar o bootstrap no Neon com o comando da decisão 4 duas vezes seguidas. Verificar que as duas execuções terminam sem erro, o que mostra que o script é idempotente.
- [x] 2.4 **(autorização)** Rodar o `db push --dry-run` da decisão 4 e verificar que ele lista só `20261106003144_schema_inicial.sql`. Se falhar por um motivo que o bootstrap não cobre, parar e reportar (decisão 5), sem aplicar a migração à mão.
- [x] 2.5 **(autorização)** Rodar o `db push --yes` da decisão 4 e, com o `db query --read-only` da decisão 4, as duas consultas do passo 3 do `DEPLOY.md`. Verificar: a migração é aplicada sem erro, `relrowsecurity = true` nas 4 tabelas e `policies = 0`. Rodar o `--dry-run` de novo e verificar que não há migração pendente.
- [x] 2.6 **(autorização)** Rodar `npm run ingest` (preset `padrao`). Verificar: a linha `Banco:` mostra um host `*.neon.tech`, e o `Total gravado` é igual ao `count` impresso.
- [x] 2.7 **(autorização)** Rodar `npm run chat -- --nome "Pizzaria Bella" --debug` com uma pergunta coberta pela base (por exemplo, sobre repasse). Verificar: a resposta tem status `answered` e cita fontes, e o debug mostra trechos com score semântico e textual.

## 3. ADRs

- [x] 3.1 Criar `docs/adr/0017-neon-como-banco-dev.md` no modelo do `docs/adr/README.md`, com o conteúdo da decisão 6 do `design.md`. Verificar que ele tem as seções Contexto, Decisão, Alternativas consideradas e Consequências.
- [x] 3.2 Trocar só a linha de status dos ADRs 0006 e 0001 pelos textos da decisão 6. Verificar com `git diff docs/adr/0006-bancos-dev-e-prod-separados.md docs/adr/0001-supabase-postgres-pgvector.md` que só essas duas linhas mudaram.
- [x] 3.3 Atualizar o índice `docs/adr/README.md` (linhas do 0001 e do 0006 e a linha nova do 0017). Verificar que todos os links da tabela apontam para arquivos que existem.

## 4. Documentação

- [x] 4.1 `AGENTS.md`: aplicar as duas linhas da tabela da decisão 7. Verificar com `git diff AGENTS.md` que só a Stack e o bloco de Comandos mudaram.
- [x] 4.2 `CLAUDE.md`: aplicar a linha da tabela da decisão 7 nas autorizações prévias, incluindo a linha nova do bootstrap e do `db push` no `dev`. Verificar com `git diff CLAUDE.md` que nenhuma outra seção mudou e que a linha do H5 continua igual.
- [x] 4.3 `DEPLOY.md`: aplicar todas as linhas da decisão 7 que citam o `DEPLOY.md`, incluindo a tabela "Neon Free" com os dados da tarefa 1.2, a seção nova "Banco `dev` no Neon" com os comandos da decisão 4 e a subseção no "Registro da execução" com os resultados das tarefas 2.3 a 2.7 (só hosts e contagens, nunca strings de conexão). Verificar: `git grep -n "Supabase \`dev\`\|ref-do-dev" DEPLOY.md` só encontra o "Registro da execução" antigo e o texto sobre pausar o projeto antigo, e os comandos da seção nova são idênticos aos que rodaram em 2.3 a 2.6.
- [x] 4.4 `README.md`: atualizar "Como rodar localmente" e "Planos gratuitos" como na decisão 7. Verificar que os comandos do bloco de código são os mesmos da seção nova do `DEPLOY.md`.
- [x] 4.5 `docs/architecture.md` e `docs/qa.md`: aplicar as linhas da decisão 7. Verificar com `git diff docs/` que nenhum outro trecho mudou.
- [x] 4.6 Varredura final. Rodar `git grep -nE "Supabase \`dev\`|dois projetos|2 projetos|ref-do-dev|Projetos \`dev\` e \`prod\`" -- ':!openspec/changes' ':!docs/history' ':!docs/adr/000*' ':!docs/adr/001[0-6]*' ':!eval/resultados'` e verificar que só sobram as menções históricas do "Registro da execução" do `DEPLOY.md`, cada uma conferida à mão e citada no relatório.

## 5. Preview na Vercel

- [ ] 5.1 **(pessoa)** Na Vercel, trocar o `DATABASE_URL` de **Preview** (Sensitive) pela string com pooler do Neon, sem tocar em Production, e fazer Redeploy do preview do PR desta change. Verificar: no painel, o `DATABASE_URL` de Production continua com o host do pooler do Supabase.
- [ ] 5.2 **(pessoa, ou orquestrador com autorização)** Rodar `npm run smoke -- --url <preview do PR>` com o segredo de bypass, como no passo 7 do `DEPLOY.md`. Verificar: 7 ✅, e o total de trechos do primeiro passo é igual ao da tarefa 2.6. Se só a primeira chamada falhar por timeout, repetir uma vez (cold start) e registrar no relatório.

## 6. Verificação final

- [x] 6.1 Rodar `npx openspec validate move-dev-database-to-neon --strict` e verificar que a change é válida.
- [x] 6.2 Rodar `npm run lint`, `npm run typecheck` e `npm test` e verificar que os três passam.

## Workflow follow-up

- **(pessoa)** Depois do smoke da tarefa 5.2, pausar o projeto Supabase `dev` no painel. Isso já libera a vaga do plano gratuito.
- **(pessoa)** Depois de alguns dias sem problema no `dev` novo, excluir o projeto Supabase `dev`. Até a exclusão, o rollback do `design.md` continua possível.
- Depois do merge do PR, arquivar a change num PR próprio (`docs(openspec): archive move-dev-database-to-neon`). Como a change declara `skip_specs`, o archive não altera `openspec/specs/`.
- Remover o worktree `../chapa-worktrees/move-dev-database-to-neon` e a branch `chore/move-dev-database-to-neon`.
