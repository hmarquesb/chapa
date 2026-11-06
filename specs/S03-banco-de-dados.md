# S03 — Banco de dados e repositórios

| Campo | Valor |
|---|---|
| **ID** | S03 |
| **Status** | 🟢 Concluída |
| **Depende de** | S00 |
| **Chamadas reais de API** | Não. A aplicação da migração no Supabase `dev` é feita pela pessoa no checkpoint H2 |

## Escopo

Cria o schema do Postgres no Supabase (tabelas, busca híbrida em SQL, RLS) e os repositórios em `src/infra/db/` que implementam as portas do núcleo. É a única parte do código que fala com o banco.

**Entrega:**
- `supabase/config.toml` (gerado por `npx supabase init`) e a migração inicial em `supabase/migrations/`.
- Cliente `postgres` configurado para o pooler em modo transação.
- `ChunkRepository`, `SessionRepository` e `RateLimitRepository` em `src/infra/db/`.
- Funções puras de mapeamento linha → tipo, com testes.

**Fora do escopo:**
- Combinar `semantic` e `keyword` num score, filtrar por `minScore` e cortar em `topK`. Isso é TS puro na S04.
- Lógica de quando resumir a sessão (S05) e de quando bloquear por rate limit (S06).
- Aplicar a migração em `prod` (S09).

**Arquivos que podem ser criados ou alterados:**
- `supabase/config.toml`, `supabase/.gitignore` (gerados pelo `supabase init`)
- `supabase/migrations/<timestamp>_schema_inicial.sql`
- `src/infra/db/client.ts`
- `src/infra/db/chunk-repository.ts`
- `src/infra/db/session-repository.ts`
- `src/infra/db/rate-limit-repository.ts`
- `src/infra/db/mappers.ts` (+ `src/infra/db/mappers.test.ts`)
- `src/infra/db/index.ts`
- Remover `supabase/migrations/.gitkeep` e `src/infra/db/.gitkeep`

**Não tocar:**
- `src/core/`, `src/lib/` (contratos da S00)
- `src/config.ts`, `src/infra/llm/` (S01)
- `package.json`

## Contexto

- Seções do `ARCHITECTURE.md`: "Banco de dados" e "Infraestrutura".
- Problema que resolve: a Vercel não guarda arquivos entre requisições, então memória, trechos e rate limit precisam de um banco gerenciado. O Postgres do Supabase traz `pgvector` para a parte semântica e busca textual em português para a parte de palavras-chave.
- Decisões já tomadas:
  - Driver `postgres` direto pelo pooler do Supabase em **modo transação** (porta 6543), com `prepare: false`. Nada de `supabase-js` nem chave `anon`.
  - RLS ligado em todas as tabelas, **sem nenhuma policy**. O servidor conecta com o usuário dono das tabelas, que ignora o RLS. A API REST pública do Supabase (`anon`/`authenticated`) fica sem acesso a nada.
  - Dois projetos Supabase, `dev` e `prod`, na região `sa-east-1`. Local, testes manuais e eval usam o `dev`.
  - Mensagens ordenadas por `id`, nunca por `created_at` (duas mensagens podem ter o mesmo instante).
  - Nenhum trecho recuperado vai para `messages`. Só a pergunta original, a resposta final, o status e os **nomes de arquivo** das fontes (para mostrar os badges ao recarregar o histórico).
  - Sem índice vetorial: com menos de 500 trechos, a busca exata é rápida. Se a base crescer, entra um índice HNSW.
  - Cada conjunto de trechos é identificado por `embedding_model` + `chunk_config`. Toda busca filtra pelos dois. Assim, vetores de modelos diferentes nunca se comparam, e os trechos da configuração `baseline` e da `padrao` convivem no `dev` para a avaliação.

### Contratos

**Usa** (criados na S00, em `src/core/types.ts`):

```ts
export type Chunk = { source: string; section: string; content: string }
export type ChunkSetKey = { embeddingModel: string; chunkConfig: string }
export type ChunkCandidate = Chunk & { id: number; semantic: number; keyword: number }

export interface ChunkRepository {
  replaceAll(key: ChunkSetKey, chunks: Array<Chunk & { embedding: number[] }>): Promise<number>
  search(input: { key: ChunkSetKey; embedding: number[]; query: string; limit: number }): Promise<ChunkCandidate[]>
  count(key: ChunkSetKey): Promise<number>
}

export type SessionRecord = {
  id: string; channel: Channel; profile: RestaurantProfile
  summary: string | null; summaryUntilId: number | null
  createdAt: Date; lastActivityAt: Date
}
export type StoredMessage = {
  id: number; role: "user" | "assistant"; content: string
  status: ReplyStatus | null; sources: string[]; createdAt: Date
}

export interface SessionRepository {
  get(id: string): Promise<SessionRecord | null>
  touch(input: { id: string; channel: Channel; profile?: RestaurantProfile }): Promise<SessionRecord>
  listMessages(sessionId: string, opts?: { afterId?: number }): Promise<StoredMessage[]>
  appendTurn(sessionId: string, turn: { user: string; assistant: string; status: ReplyStatus; sources: string[] }): Promise<void>
  saveSummary(sessionId: string, summary: string, untilId: number): Promise<void>
  deleteInactive(olderThan: Date): Promise<number>
}

export type RateLimitBucket = "minute" | "day"
export interface RateLimitRepository {
  hit(input: { ipHash: string; bucket: RateLimitBucket; windowStart: Date }): Promise<number>
  deleteBefore(date: Date): Promise<number>
}
```

Também usa `requireEnv` (`src/infra/env.ts`) e os tipos `Channel`, `ReplyStatus` e `RestaurantProfile` de `src/lib/types.ts`.

**Dona:** `src/infra/db/index.ts`.

```ts
export function getSql(): Sql // singleton do cliente postgres
export function createChunkRepository(sql: Sql): ChunkRepository
export function createSessionRepository(sql: Sql): SessionRepository
export function createRateLimitRepository(sql: Sql): RateLimitRepository
export async function closeSql(): Promise<void> // usado pelos scripts ao terminar
```

**Dona:** schema SQL (migração).

```sql
-- Extensões (no Supabase ficam no schema "extensions")
create extension if not exists vector with schema extensions;
create extension if not exists unaccent with schema extensions;

-- Configuração de busca textual: português, sem diferenciar acentos
create text search configuration public.pt_unaccent (copy = pg_catalog.portuguese);
alter text search configuration public.pt_unaccent
  alter mapping for hword, hword_part, word with extensions.unaccent, portuguese_stem;

create table public.sessions (
  id uuid primary key,
  channel text not null check (channel in ('web', 'cli', 'eval')),
  profile jsonb not null default '{}'::jsonb,
  summary text,
  summary_until_id bigint,
  created_at timestamptz not null default now(),
  last_activity_at timestamptz not null default now()
);
create index sessions_last_activity_idx on public.sessions (last_activity_at);

create table public.messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  status text check (status in ('answered', 'fallback', 'blocked_input', 'blocked_output')),
  sources text[] not null default '{}',
  created_at timestamptz not null default now()
);
create index messages_session_id_idx on public.messages (session_id, id);

create table public.document_chunks (
  id bigint generated always as identity primary key,
  source text not null,
  section text not null default '',
  content text not null,
  embedding_model text not null,
  chunk_config text not null,
  embedding extensions.vector(768) not null,
  tsv tsvector generated always as (to_tsvector('public.pt_unaccent', content)) stored,
  created_at timestamptz not null default now()
);
create index document_chunks_set_idx on public.document_chunks (embedding_model, chunk_config);

create table public.rate_limits (
  ip_hash text not null,
  bucket text not null check (bucket in ('minute', 'day')),
  window_start timestamptz not null,
  count integer not null default 0,
  primary key (ip_hash, bucket, window_start)
);

alter table public.sessions enable row level security;
alter table public.messages enable row level security;
alter table public.document_chunks enable row level security;
alter table public.rate_limits enable row level security;
```

Função de busca (mesma migração):

```sql
create or replace function public.match_chunks(
  query_embedding extensions.vector(768),
  query_text text,
  p_embedding_model text,
  p_chunk_config text,
  p_limit integer
) returns table (
  id bigint, source text, section text, content text,
  semantic double precision, keyword double precision
)
language sql stable security invoker
set search_path = public, extensions
as $$
  with q as (
    select tsvector_to_array(to_tsvector('public.pt_unaccent', query_text)) as terms
  ),
  scored as (
    select c.id, c.source, c.section, c.content,
           1 - (c.embedding <=> query_embedding) as semantic,
           case when cardinality(q.terms) = 0 then 0
                else cardinality(array(
                       select unnest(q.terms)
                       intersect
                       select unnest(tsvector_to_array(c.tsv))
                     ))::double precision / cardinality(q.terms)
           end as keyword
    from public.document_chunks c, q
    where c.embedding_model = p_embedding_model
      and c.chunk_config = p_chunk_config
  )
  select * from scored
  order by greatest(semantic, keyword) desc, id
  limit p_limit
$$;

revoke execute on function public.match_chunks from public, anon, authenticated;
```

- `semantic` é a similaridade de cosseno (`1 - distância`).
- `keyword` é a fração dos termos distintos da consulta (já normalizados: minúsculas, sem acento, com radical e sem stopwords do dicionário `portuguese`) que aparecem no trecho. Vai de 0 a 1.
- O SQL **não** combina os dois. Ele devolve até `p_limit` candidatos ordenados pelo maior dos dois sinais, e a S04 faz o ranking em TS.

O SQL acima é a referência. Se algum detalhe não funcionar no Supabase (por exemplo, o nome qualificado do dicionário `unaccent`), ajuste o mínimo, teste no `dev` (H2) e registre o desvio.

## Requisitos funcionais

### RF1. Migração inicial

Rode `npx supabase init` (não precisa de Docker) e crie a migração com o SQL da seção "Contratos". O nome segue o padrão da CLI: `<AAAAMMDDHHMMSS>_schema_inicial.sql`.

- **Critério de aceite:** *(H2, feito pela pessoa)* Dado o projeto `dev` linkado, quando ela roda `npx supabase db push --remote`, então a migração aplica sem erro, e `select to_tsvector('public.pt_unaccent', 'Cartão de crédito')` devolve lexemas sem acento.

### RF2. Cliente `postgres`

`getSql()` cria o cliente uma única vez com `requireEnv("DATABASE_URL")` e as opções `prepare: false`, `max: 3`, `idle_timeout: 20`, `connect_timeout: 10`. Importar o módulo não abre conexão. `closeSql()` encerra o cliente (os scripts chamam ao terminar).

- **Critério de aceite:** Dado um ambiente sem `DATABASE_URL`, quando o teste importa `@/infra/db`, então nada é lançado. Chamar `getSql()` lança `MissingEnvError`.

### RF3. `ChunkRepository`

- `replaceAll(key, chunks)`: numa transação, apaga os trechos com aquele `embedding_model` + `chunk_config` e insere os novos. O vetor é enviado como texto `'[0.1,0.2,...]'` com cast para `extensions.vector`. Devolve quantos inseriu. Insere em lotes de no máximo 100 linhas por comando.
- `search({ key, embedding, query, limit })`: chama `match_chunks` e mapeia as linhas para `ChunkCandidate` (números convertidos de string, se o driver devolver assim).
- `count(key)`: `select count(*)` filtrado pelos dois campos.

- **Critério de aceite:** *(H2, com autorização para usar o `dev`)* Dado um script de verificação manual que insere 3 trechos com vetores feitos à mão, quando ele chama `search` com o vetor de um deles e uma consulta com uma palavra acentuada escrita sem acento, então esse trecho vem primeiro, com `semantic` próximo de 1 e `keyword` > 0. Ao final, o script apaga os trechos de teste (use `chunk_config = "teste"`).

### RF4. `SessionRepository`

- `get(id)`: devolve a sessão ou `null`.
- `touch({ id, channel, profile })`: `insert ... on conflict (id) do update` que atualiza `last_activity_at = now()` e, **só se `profile` vier**, substitui `profile`. O `channel` é gravado só na criação. Devolve o registro atualizado.
- `listMessages(sessionId, { afterId })`: mensagens da sessão com `id > afterId` (ou todas), ordenadas por `id` crescente.
- `appendTurn(sessionId, turn)`: numa transação, insere a mensagem `user` (status `null`, `sources` vazio), depois a `assistant` (com `status` e `sources`) e atualiza `last_activity_at`.
- `saveSummary(sessionId, summary, untilId)`: atualiza `summary` e `summary_until_id`.
- `deleteInactive(olderThan)`: apaga sessões com `last_activity_at < olderThan` (as mensagens caem em cascata) e devolve quantas apagou.

- **Critério de aceite:** *(H2, com autorização para usar o `dev`)* Dado um script de verificação manual, quando ele cria uma sessão, grava 2 turnos e lista as mensagens, então recebe 4 mensagens na ordem de inserção, com `status` e `sources` só nas do assistente. `deleteInactive(new Date(Date.now() + 1000))` apaga a sessão e as mensagens.

### RF5. `RateLimitRepository`

- `hit({ ipHash, bucket, windowStart })`: `insert ... values (..., 1) on conflict (ip_hash, bucket, window_start) do update set count = rate_limits.count + 1 returning count`. É atômico e devolve a contagem depois do incremento.
- `deleteBefore(date)`: apaga linhas com `window_start < date` e devolve quantas.

- **Critério de aceite:** *(H2, com autorização para usar o `dev`)* Dadas 3 chamadas de `hit` com os mesmos argumentos, então elas devolvem 1, 2 e 3.

### RF6. Mapeadores puros

`mappers.ts` converte linhas do banco em `SessionRecord`, `StoredMessage` e `ChunkCandidate`: `bigint`/string → `number`, `snake_case` → `camelCase`, `profile` filtrado para as chaves de `PROFILE_FIELDS` com valor string, `sources` nulo → `[]`.

- **Critério de aceite:** Dada uma linha de mensagem `{ id: "12", session_id: "...", role: "assistant", content: "x", status: "answered", sources: null, created_at: <Date> }`, quando o teste chama o mapeador, então recebe `{ id: 12, role: "assistant", content: "x", status: "answered", sources: [], createdAt: <Date> }`. Um `profile` com chave desconhecida ou valor numérico tem essa chave descartada.

## Requisitos não funcionais

- **RNF1. Testes:** `npm test`, `npm run typecheck` e `npm run lint` passam sem rede e sem banco. Os testes automatizados cobrem só os mapeadores e a não abertura de conexão no import. *Verificação:* rodar com `env -i PATH="$PATH" HOME="$HOME"`.
- **RNF2. Isolamento:** só `src/infra/db/` importa `postgres`. *Verificação:* teste de arquitetura da S00.
- **RNF3. SQL seguro:** toda query usa os parâmetros do template `sql\`...\`` do driver. Nenhuma concatenação de string com dados de entrada. *Verificação:* `grep -n "sql.unsafe" src/infra/db` volta vazio.
- **RNF4. Privacidade:** nenhum log com conteúdo de mensagem, perfil ou trecho. *Verificação:* `grep -n "console\." src/infra/db` volta vazio.
- **RNF5. Superfície pública:** com RLS ligado e sem policies, a API REST do Supabase não lê nenhuma tabela. *Verificação (H2):* a pessoa confere no painel do Supabase (Authentication → Policies, ou o Security Advisor) que as 4 tabelas estão com RLS ligado.

## Você deve

- Seguir as regras do `AGENTS.md` e as camadas descritas no `ARCHITECTURE.md`.
- Começar todos os arquivos de `src/infra/db/` com `import "server-only"`.
- Escrever os testes dos mapeadores antes da implementação.
- Usar transação (`sql.begin`) em `replaceAll` e `appendTurn`.
- Se tiver autorização para usar o `dev`, criar um script de verificação temporário no scratchpad (fora do repositório) para os critérios RF3 a RF5 e apagar os dados de teste ao final.
- Rodar `npm test`, `npm run typecheck` e `npm run lint` antes de entregar.
- Entregar um relatório com: arquivos alterados, cada critério de aceite com a evidência (comando + saída resumida), desvios da spec e pendências humanas (H2).

## Você não deve

- Editar arquivos fora da lista de "Arquivos que podem ser criados ou alterados".
- Adicionar dependências ou usar `supabase-js`.
- Criar policies de RLS ou usar a chave `anon`/`service_role`.
- Criar índice vetorial.
- Rodar `supabase db push` ou `supabase link` sem autorização. Essa etapa é da pessoa (H2).
- Conectar no projeto `prod`.
- Fazer commit ou push.

## Tecnologias

| Tecnologia | Uso nesta spec |
|---|---|
| Supabase (Postgres) | Banco gerenciado, projetos `dev` e `prod` |
| `pgvector` | Coluna `vector(768)` e distância de cosseno |
| Busca textual do Postgres (`portuguese` + `unaccent`) | Score de palavras-chave |
| `postgres` (driver) | Acesso pelo pooler em modo transação |
| Supabase CLI | `init` e migrações |
| Vitest | Testes dos mapeadores |
