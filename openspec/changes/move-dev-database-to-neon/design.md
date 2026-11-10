# Design

## Context

A motivação está no `proposal.md` ("Why"). Estado atual, levantado na `main` (`0cf8521`):

- **O código não depende do provedor.** `src/infra/db/client.ts` abre o `postgres` com `requireEnv("DATABASE_URL")` e `prepare: false`, que funciona em qualquer pooler em modo transação (PgBouncer do Neon incluído). Os códigos de "banco indisponível" de `src/app/api/_lib/handlers.ts` são do Postgres e do Node, não do Supabase.
- **A migração `20261106003144_schema_inicial.sql` tem duas dependências do Supabase:** `create extension ... with schema extensions`, que exige o schema `extensions`, e `revoke execute on function public.match_chunks from public, anon, authenticated`, que exige os papéis `anon` e `authenticated`. O resto (pgvector, `unaccent`, a configuração `portuguese`, RLS e coluna gerada) é Postgres padrão e existe no Neon.
- **O `prod` roda Postgres 17** (`supabase/config.toml`, `major_version = 17`).
- **A Supabase CLI 3.0.0 já é devDependency.** `db push` e `db query` aceitam `--remote=<url>`, e `db query` aceita `-f <arquivo>`, então não é preciso `psql` nem `supabase link` para o `dev`.
- **`scripts/ingest.ts` e `scripts/eval.ts` imprimem `Banco: <host>`.** Hoje o host é igual no `dev` e no `prod` (mesmo pooler da região). Com o Neon, o host do `dev` termina em `neon.tech`, o que distingue os dois ambientes.
- **Plano gratuito do Neon:** segundo a página de preços e o FAQ do Neon, até 100 projetos, scale-to-zero sempre ligado (a computação suspende após 5 min ocioso e acorda na próxima conexão) e 1 GB de armazenamento por projeto (conferido em 10/11/2026 na tarefa 1.2). A base tem cerca de 35 trechos de 768 dimensões, bem abaixo do limite. A implementação confere os números na fonte e registra a data no `DEPLOY.md`.

## Goals / Non-Goals

**Goals:**

- O `dev` no Neon aceita a migração existente sem alterá-la, e o resultado é igual ao do `prod` nas 4 tabelas, na função `match_chunks`, no RLS ligado e em 0 policies.
- Nenhum comando documentado para o `dev` consegue atingir o `prod` por engano.
- O preview da Vercel volta a passar no smoke (7 ✅) contra o `dev` novo.

**Non-Goals:**

- Fazer o Neon imitar o Supabase além do que a migração exige: nada de `auth`, `storage`, `service_role` ou extensões que o Chapa não usa.
- Automatizar a criação do projeto no Neon ou as variáveis da Vercel. Isso fica com a pessoa.

## Decisions

### 1. Neon, um projeto e um branch só, sem a integração da Vercel

O `dev` é um único projeto Neon no branch padrão, com Postgres 17 (igual ao `prod`). Já foi criado na preparação desta change: projeto `chapa-dev` (`plain-block-39762891`), região `aws-sa-east-1` (São Paulo, a mesma do `prod`), branch padrão `main`, servidor 17.11, com `vector` e `unaccent` disponíveis. As strings foram gravadas no `.env.local` do checkout principal com `neon env pull --project-id plain-block-39762891 --branch main --file .env.local -e DATABASE_URL,DATABASE_URL_UNPOOLED`, que só atualiza as variáveis da Neon e preserva as outras linhas. Não há `.neon` nem `neon.ts` no repositório: o `neon init` e o `neon deploy` ficaram de fora porque o `neon.ts` puxaria dependências que a change não prevê.

Alternativas consideradas:

- **Integração Neon + Vercel (Marketplace), com branch por preview:** cria e sobrescreve variáveis sozinha, inclusive em Production. Um erro de configuração apontaria a demo para o `dev`. Também fica mais difícil limpar os dados.
- **Outros Postgres gratuitos (Aiven, Xata, Nile):** não mostraram vantagem para este caso, e o Neon tem a documentação mais clara sobre pgvector e scale-to-zero.
- **Schema separado dentro do `prod`:** o preview continuaria preso ao projeto de produção.

### 2. Script de preparação fora de `supabase/migrations/`

A preparação fica em `supabase/dev-bootstrap.sql`, aplicada com `db query -f` antes do primeiro `db push`. Ela não entra como migração por três motivos: uma migração nova teria data posterior à inicial e rodaria tarde demais, o `prod` não precisa dela, e uma migração já aplicada não pode ser editada (`AGENTS.md`).

O script recusa rodar no Supabase: se o papel `supabase_admin` existir, ele levanta um erro. Assim, rodar o arquivo no `prod` por engano não muda nada.

Contrato do arquivo, por extenso:

```sql
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
```

O arquivo é um único bloco `do` porque o `db query -f` envia o arquivo como um só prepared statement, e o servidor recusa mais de um comando (`cannot insert multiple commands into a prepared statement`, descoberto na primeira execução, 10/11/2026). Como é um comando só, ele também é atômico: se a guarda dispara, nada é criado.

Os papéis são `nologin`: eles só existem para o `revoke` da migração funcionar. Ninguém se conecta com eles.

### 3. Duas strings de conexão: com pooler para o app, direta para a CLI

| Variável | Valor no `dev` | Quem usa |
|---|---|---|
| `DATABASE_URL` | String **com pooler** do Neon (host com `-pooler`), `sslmode=require` | App, `chat`, `eval`, `ingest`, Preview da Vercel |
| `DATABASE_URL_UNPOOLED` | String **direta** do Neon (sem `-pooler`) | Só a Supabase CLI (`db query`, `db push`) no `dev` |

O nome `DATABASE_URL_UNPOOLED` é o que o `neon env pull` grava, então o `.env.local` e o `.env.example` usam o mesmo nome da Neon. A CLI usa a conexão direta porque a migração roda DDL e a CLI usa prepared statements, que o PgBouncer em modo transação não garante. O app não lê `DATABASE_URL_UNPOOLED`: ela não entra no `src/`, na Vercel nem no `.env.prod.local`.

Linhas novas no `.env.example`, logo depois do `DATABASE_URL`, com o comentário do `DATABASE_URL` generalizado:

```bash
# Banco: connection string com pooler em modo transação
#   dev  -> Neon (host com -pooler);  prod -> Supabase (pooler, porta 6543)
DATABASE_URL=
# Opcional, só no dev: connection string direta do Neon (sem -pooler),
# usada pela Supabase CLI para aplicar migrações. O app não lê esta variável.
# DATABASE_URL_UNPOOLED=
```

### 4. Comandos do `dev`, sempre com `--remote="$DATABASE_URL_UNPOOLED"` num subshell

Os comandos carregam o `.env.local` num subshell, no mesmo padrão já usado para o `.env.prod.local` do H5, e passam a URL pela variável. A URL nunca aparece escrita no comando nem no relatório.

Dois ajustes, descobertos na primeira execução (10/11/2026):

- **`channel_binding`:** a string direta que o `neon env pull` grava traz `channel_binding=require` (hoje como primeiro parâmetro, antes do `sslmode`). O driver da Supabase CLI repassa esse parâmetro ao servidor, e o Neon o recusa (`unrecognized configuration parameter "channel_binding"`). Por isso o subshell tira o parâmetro antes de chamar a CLI, em qualquer posição da query string (`U="${DATABASE_URL_UNPOOLED/channel_binding=require&/}"; U="${U/&channel_binding=require/}"`, expansão do bash e do zsh). O `.env.local` continua igual ao que o `neon env pull` grava, e o `sslmode=require` se mantém.
- **`--yes` no `db query -f`:** a CLI pede confirmação antes de executar SQL que altera o banco e, sem terminal interativo, falha com `HostedMutationConsentRequiredError`. O bootstrap é idempotente e recusa rodar no Supabase, então leva `--yes`, como o `db push`. A consulta `--read-only` não precisa.

```bash
# na raiz do checkout principal (ou no worktree com o link .env.local)
( set -a; . ./.env.local; set +a; U="${DATABASE_URL_UNPOOLED/channel_binding=require&/}"; U="${U/&channel_binding=require/}"; npx supabase db query --remote="$U" --yes -f supabase/dev-bootstrap.sql )
( set -a; . ./.env.local; set +a; U="${DATABASE_URL_UNPOOLED/channel_binding=require&/}"; U="${U/&channel_binding=require/}"; npx supabase db push --remote="$U" --dry-run )
( set -a; . ./.env.local; set +a; U="${DATABASE_URL_UNPOOLED/channel_binding=require&/}"; U="${U/&channel_binding=require/}"; npx supabase db push --remote="$U" --yes )
( set -a; . ./.env.local; set +a; U="${DATABASE_URL_UNPOOLED/channel_binding=require&/}"; U="${U/&channel_binding=require/}"; npx supabase db query --remote="$U" --read-only "<consulta de RLS do DEPLOY.md>" )
npm run ingest   # lê o DATABASE_URL do .env.local, que agora é o Neon
```

Se a CLI pedir senha ou uma confirmação interativa, ou se imprimir a connection string, a pessoa é chamada, e nada da saída com a string entra no relatório.

**`db push --remote` sem URL passa a significar sempre o `prod`**, porque o `prod` é o único projeto linkado. Para evitar um push acidental, o `DEPLOY.md` passa a mandar rodar `npx supabase unlink` ao fim do passo 3. A frase "para voltar ao `dev`, rode `supabase link --project-ref <ref-do-dev>`" sai.

### 5. Se o `db push` não funcionar no Neon, parar

Se o `--dry-run` ou o `db push` falhar por um motivo que o bootstrap não cobre (por exemplo, a CLI exigir objetos do Supabase para gravar o histórico de migrações), o implementador **para e reporta**. Ele não aplica a migração à mão com `db query -f`, porque isso deixaria o `dev` sem histórico de migrações e mudaria o fluxo deste design. A decisão volta para a pessoa.

### 6. ADR 0017 substitui o 0006; o 0001 ganha uma nota no status

- **ADR 0006:** o status vira `Substituído por [0017](0017-neon-como-banco-dev.md)`. O corpo não muda.
- **ADR 0001:** a decisão de usar o Supabase continua valendo para o `prod`. Seguindo o precedente do 0015/0016, só o status muda: `Aceito (o banco dev passou para o Neon pelo [ADR 0017](0017-neon-como-banco-dev.md))`.
- **ADR 0017**, no modelo do `docs/adr/README.md`, com status `Aceito` e data do merge:
  - **Título:** `0017. Usar o Neon como banco dev e o Supabase só no prod`
  - **Contexto:** o limite de 2 projetos ativos no Supabase Free, a vontade de liberar uma vaga e a necessidade de manter o preview com banco.
  - **Decisão:** `dev` (local, CLI, eval, ingest e Preview) num projeto Postgres 17 do Neon Free, preparado com `supabase/dev-bootstrap.sql` e migrado pela Supabase CLI com `--remote=<url>`; `prod` continua no Supabase.
  - **Alternativas consideradas:** Supabase local com Docker (fidelidade alta, mas sem banco para o preview e com mais um ambiente para manter); um só projeto Supabase; schema de preview dentro do `prod`; integração da Vercel com o Neon; segunda conta no Supabase.
  - **Consequências:** o `dev` deixa de ser idêntico ao `prod` (o bootstrap cobre as diferenças conhecidas); a primeira conexão depois de 5 min ocioso é mais lenta; o `dev` não pausa por inatividade como o Supabase; `db push --remote` sem URL vale só para o `prod`; o Supabase fica com uma vaga livre.
- **`docs/adr/README.md`:** a linha do 0006 passa a mostrar `Substituído por 0017`, a do 0001 recebe a nota, e entra a linha do 0017.

### 7. Edições na documentação

Só o que cita o Supabase `dev`, o pooler de porta 6543 como único formato ou o fluxo de `link` do `dev`. Os textos históricos ficam como estão (ver "Fora do escopo" na proposta).

| Arquivo | Onde | O que muda |
|---|---|---|
| `AGENTS.md` | Stack, linha 30 | "Projetos `dev` e `prod`" vira "`prod` no Supabase; `dev` num Postgres do Neon ([ADR 0017](docs/adr/0017-neon-como-banco-dev.md))" |
| `AGENTS.md` | Comandos, linha 49 | O comentário do `db push --remote` diz "no `prod` (único projeto linkado, só no checkpoint)"; entra uma linha para o `dev` com `--remote="$DATABASE_URL_UNPOOLED"`, apontando para o `DEPLOY.md` |
| `CLAUDE.md` | Autorizações prévias | "Supabase `dev`" vira "banco `dev` (Neon)". Entra uma linha: bootstrap e `db push` no `dev` com `--remote="$DATABASE_URL_UNPOOLED"`, só no `dev`, nunca com o `.env.prod.local` carregado |
| `DEPLOY.md` | Introdução e "Regras" | O link do ADR 0006 vira o do 0017; "Local e preview usam o Supabase `dev`" vira "o `dev` no Neon" |
| `DEPLOY.md` | Passo 1, "Supabase Free" | Linha "Projetos": "só o `prod`: sobra uma vaga". A linha "Pausa por inatividade" perde a parte do `dev`. Entra a tabela "Neon Free", com projetos, armazenamento, computação e scale-to-zero, com fonte e data de consulta |
| `DEPLOY.md` | Passo 3 | Troca a frase de voltar ao `dev` por `npx supabase unlink` ao final |
| `DEPLOY.md` | Passo 4 | A frase sobre o `Banco:` igual nos dois ambientes passa a dizer que o host do `dev` termina em `neon.tech` e o do `prod` é o pooler do Supabase |
| `DEPLOY.md` | Passo 5, tabela de variáveis | `DATABASE_URL` de Preview: "string com pooler do **`dev`** (Neon)". A verificação RNF2 confere que o host é do Neon, não `postgres.<ref>` do Supabase |
| `DEPLOY.md` | Passo 7 | "contra o `dev`" continua; o total do passo 1 é o do Neon |
| `DEPLOY.md` | "Migração" (operação) | "aplicada primeiro no `dev` (ver "Banco `dev` no Neon") e depois no `prod` (passo 3)" |
| `DEPLOY.md` | "Segredo vazado" | Inclui "Neon → Roles → Reset password" para o `dev` |
| `DEPLOY.md` | Nova seção "Banco `dev` no Neon", antes de "Registro da execução" | Quem faz o quê, criação do projeto (Postgres 17, região), as duas strings no `.env.local`, os comandos da decisão 4, a verificação de RLS e policies, a ingestão e o que fazer com o Supabase `dev` antigo (pausar e depois excluir) |
| `DEPLOY.md` | "Registro da execução" | Entra a subseção da execução no Neon com a data, no formato da tabela existente |
| `README.md` | "Como rodar localmente" | Pré-requisito "um Postgres 17 com pgvector (o `dev` usa o Neon Free; o Supabase também serve)". Os comandos usam o bootstrap e o `db push --remote="$DATABASE_URL_UNPOOLED"`. O bullet do `.env.local` cita as duas strings |
| `README.md` | "Planos gratuitos" (linha 345) | Vercel Hobby, Supabase Free (só o `prod`), Neon Free (`dev`) e Gemini |
| `README.md` | Metodologia (linha 253) | "com o banco `dev`" continua (o nome do ambiente não muda) |
| `docs/architecture.md` | Banco (linhas 89 e 91) | "pelo pooler do Supabase" vira "pelo pooler em modo transação (Supabase no `prod`, Neon no `dev`)"; o schema é aplicado com a Supabase CLI, e no `dev` depois do `supabase/dev-bootstrap.sql` |
| `docs/architecture.md` | Infraestrutura (linha 96) | "Supabase: só o `prod`, em `sa-east-1`. Neon: o `dev`, usado no local e no preview" |
| `docs/qa.md` | Linhas 8, 42 e 55 | Sem mudança de texto obrigatória ("banco `dev`" continua certo). Entra uma nota curta, na verificação manual, de que a primeira requisição depois de 5 min ocioso pode demorar alguns segundos (scale-to-zero do Neon) |

### Arquivos que podem ser criados ou alterados

O implementador não toca em mais nada:

- **Criar:** `supabase/dev-bootstrap.sql` e `docs/adr/0017-neon-como-banco-dev.md`
- **Alterar:** `.env.example`, `AGENTS.md`, `CLAUDE.md`, `DEPLOY.md`, `README.md`, `docs/architecture.md`, `docs/qa.md`, `docs/adr/README.md`, `docs/adr/0006-bancos-dev-e-prod-separados.md` (só o status), `docs/adr/0001-supabase-postgres-pgvector.md` (só o status) e `openspec/changes/move-dev-database-to-neon/tasks.md` (marcar as tarefas)

## Risks / Trade-offs

- **A CLI pode não aceitar um Postgres que não é Supabase no `db push`.** → Primeiro roda o `--dry-run`. Se falhar, para e reporta (decisão 5).
- **O `dev` diverge do `prod` em versão menor e em extensões.** → Mesmo major (17). O bootstrap cobre as diferenças conhecidas, e o `db push` no `prod` continua sendo checkpoint humano, quando um erro ainda aparece antes de chegar à demo.
- **Cold start do scale-to-zero:** a primeira conexão depois de 5 min ocioso demora mais. O `connect_timeout: 10` do driver deve bastar. → Se o smoke do preview falhar só na primeira chamada, repetir antes de concluir. Isso fica documentado no `qa.md`.
- **`db push --remote` sem URL vai para o `prod`.** → `supabase unlink` ao fim do passo 3, o bootstrap recusa rodar no Supabase, e os comandos do `dev` sempre passam `--remote="$DATABASE_URL_UNPOOLED"`.
- **Vazamento da string do Neon em log ou relatório.** → A URL só vive no `.env.local` e na Vercel (Sensitive), e é passada por variável num subshell. O relatório mostra só o host (`*.neon.tech`), nunca o usuário nem a senha.
- **Excluir o Supabase `dev` cedo demais.** → Primeiro pausar (já libera a vaga) e só excluir depois que o smoke do preview passar e houver alguns dias de uso.
- **Limites do Neon Free mudam.** → A tabela do `DEPLOY.md` traz a fonte e a data, como as outras.

## Migration Plan

1. Feito na preparação (10/11/2026): projeto `chapa-dev` criado e as duas strings gravadas no `.env.local` do checkout principal com `neon env pull`, que substituiu o `DATABASE_URL` antigo do Supabase `dev`. O `npm run dev` local fica sem dados até o passo 2.
2. Orquestrador (autorizado na tarefa): bootstrap, `db push --dry-run`, `db push --yes`, conferência de RLS e policies, `npm run ingest` e `npm run chat` com uma pergunta da base.
3. Pessoa: troca o `DATABASE_URL` de Preview na Vercel e faz Redeploy de um preview; smoke contra o preview (7 ✅, total de trechos igual ao do Neon).
4. Pessoa: pausa o projeto Supabase `dev`. Depois de alguns dias sem problema, exclui.

**Rollback:** enquanto o Supabase `dev` estiver só pausado, voltar é restaurar o projeto no painel, recolocar a string antiga no `.env.local` e no Preview da Vercel e reverter o PR da documentação. Depois da exclusão, o rollback seria criar outro projeto Supabase e repetir o fluxo antigo, se houver vaga.
