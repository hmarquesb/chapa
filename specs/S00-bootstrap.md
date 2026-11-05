# S00 — Bootstrap do projeto Next.js

| Campo | Valor |
|---|---|
| **ID** | S00 |
| **Status** | 🟢 Concluída |
| **Depende de** | Commit 0 (documentação e specs, feito pela pessoa) |
| **Chamadas reais de API** | Não |

## Escopo

Cria o esqueleto do projeto: Next.js com App Router, TypeScript, Tailwind, shadcn/ui, Biome, Vitest e tsx, a estrutura de pastas do `ARCHITECTURE.md`, os tipos compartilhados que as outras specs consomem e a CI no GitHub Actions. Nenhuma lógica do assistente entra aqui.

**Entrega:**
- Projeto Next.js na raiz do repositório, com `lint`, `typecheck`, `test` e `build` passando sem rede e sem variáveis de ambiente.
- Todas as dependências de runtime do projeto já instaladas, para que specs paralelas não disputem o `package.json`.
- Os contratos compartilhados em `src/lib/types.ts`, `src/core/types.ts`, `src/core/errors.ts`, `src/core/usage.ts` e `src/infra/env.ts`.
- Um teste de arquitetura que garante as regras de importação entre camadas.
- Workflow de CI e `.env.example`.

**Fora do escopo:**
- Componentes do shadcn (a S07 adiciona os que usar).
- Schema do banco e `supabase init` (S03).
- `vercel.json` e headers de segurança (S06).
- A página de chat (S07). Aqui fica só uma página provisória.

**Arquivos que podem ser criados ou alterados:**
- `package.json`, `package-lock.json`, `tsconfig.json`, `next.config.ts`, `next-env.d.ts`, `postcss.config.mjs`, `components.json`, `biome.json`, `vitest.config.ts`
- `.gitignore`, `.env.example`, `.github/workflows/ci.yml`
- `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`, `src/app/favicon.ico` (pode remover)
- `src/lib/utils.ts` (gerado pelo shadcn), `src/lib/types.ts`
- `src/core/types.ts`, `src/core/errors.ts`, `src/core/usage.ts` (+ `src/core/usage.test.ts`)
- `src/infra/env.ts` (+ `src/infra/env.test.ts`)
- `src/architecture.test.ts`
- `test/stubs/server-only.ts`
- `.gitkeep` em `src/components/chat/`, `src/infra/llm/`, `src/infra/db/`, `scripts/`, `knowledge-base/`, `eval/resultados/`, `supabase/migrations/`
- `public/` (pode apagar os SVGs de exemplo do create-next-app)

**Não tocar:**
- `README.md`, `AGENTS.md`, `CLAUDE.md`, `ARCHITECTURE.md`, `specs/`, `docs/`, `.claude/`, `.github/pull_request_template.md`

## Contexto

- Seções do `ARCHITECTURE.md`: "Arquitetura do projeto", "Front-end", "Automação".
- Problema que resolve: as specs seguintes rodam em paralelo com subagentes. Elas precisam de um projeto que já compila, de dependências instaladas e de tipos fixos para não se bloquearem nem editarem os mesmos arquivos.
- Decisões já tomadas:
  - Um projeto Next.js só, com front e API, publicado na Vercel. Node 24.
  - Biome substitui ESLint e Prettier.
  - Vitest para testes e tsx para os scripts locais, porque o Node puro não resolve o alias `@/`.
  - `core/` e `infra/` importam `server-only`. Esse pacote lança erro quando é importado fora do React Server, então os scripts rodam com `--conditions=react-server` e o Vitest troca o pacote por um stub vazio.
  - O repositório git já existe (commit 0 com a documentação). Esta spec não faz `git init` nem commit.

### Como criar o projeto num diretório que não está vazio

O `create-next-app` recusa diretórios com arquivos que ele não conhece. Gere o projeto num diretório temporário (por exemplo, o scratchpad da sessão) com as opções TypeScript, Tailwind, App Router, `src/` e alias `@/*`, sem ESLint. Depois copie os arquivos para a raiz, sem sobrescrever os arquivos do commit 0 (em especial o `README.md`, que o create-next-app também gera). Descarte o `README.md` gerado. Junte o `.gitignore` gerado com o descrito abaixo.

### Contratos

Esta spec é **dona** dos arquivos abaixo. Escreva-os exatamente assim (ajustes de formatação do Biome são permitidos). Outras specs só os consomem. Mudar um contrato depois exige parar e reportar ao orquestrador.

`src/lib/types.ts` — tipos que o navegador e o servidor compartilham. Não importa nada de `core/` nem de `infra/`.

```ts
export type ReplyStatus = "answered" | "fallback" | "blocked_input" | "blocked_output"

export type Channel = "web" | "cli" | "eval"

export type RestaurantProfile = {
  name?: string
  plan?: string
  cuisine?: string
  city?: string
  hours?: string
}

export const PROFILE_FIELDS = ["name", "plan", "cuisine", "city", "hours"] as const
export const PROFILE_FIELD_MAX_CHARS = 60

// POST /api/chat
export type ChatRequest = {
  sessionId: string
  message: string
  profile?: RestaurantProfile
}

export type ChatResponse = {
  status: ReplyStatus
  answer: string
  sources: string[]
}

// GET /api/sessions/[id]/messages
export type HistoryMessage = {
  id: number
  role: "user" | "assistant"
  content: string
  status: ReplyStatus | null // só nas mensagens do assistente
  sources: string[]
  createdAt: string // ISO 8601
}

export type SessionHistoryResponse = {
  sessionId: string
  profile: RestaurantProfile
  messages: HistoryMessage[]
}

// GET /api/health
export type HealthResponse = {
  ok: boolean
  chunks: number
  embeddingModel: string
}

// Qualquer resposta de erro da API
export type ApiErrorResponse = {
  error: string
}
```

`src/core/types.ts` — portas do núcleo. Começa com `import "server-only"`.

```ts
import "server-only"
import type { Channel, ReplyStatus, RestaurantProfile } from "@/lib/types"

// ---------- LLM ----------
export type ChatMessage = { role: "user" | "assistant"; content: string }

export type Usage = { calls: number; inputTokens: number; outputTokens: number }

export type GenerateInput = {
  model: string
  system?: string
  messages: ChatMessage[] // não vazio e começa com "user"
  temperature?: number
  maxOutputTokens?: number
  json?: boolean // true pede a resposta em JSON (application/json)
}

export type EmbedTask = "query" | "document"

export type EmbedInput = {
  model: string
  texts: string[]
  task: EmbedTask
  dimensions: number
}

export interface LlmClient {
  generate(input: GenerateInput): Promise<{ text: string; usage: Usage }>
  embed(input: EmbedInput): Promise<{ vectors: number[][]; usage: Usage }>
}

// ---------- Base de conhecimento ----------
export type Chunk = {
  source: string // nome do arquivo, ex.: "02-repasse-financeiro.md"
  section: string // título "## ..." da seção ("" se não houver)
  content: string // texto do trecho, já com o cabeçalho "Título — Seção"
}

// Identifica um conjunto de trechos: o modelo de embedding e a forma de fatiar.
export type ChunkSetKey = { embeddingModel: string; chunkConfig: string }

export type ChunkCandidate = Chunk & {
  id: number
  semantic: number // similaridade de cosseno, de -1 a 1
  keyword: number // fração dos termos da consulta presentes no trecho, de 0 a 1
}

export type RetrievedChunk = ChunkCandidate & { score: number }

export interface ChunkRepository {
  replaceAll(key: ChunkSetKey, chunks: Array<Chunk & { embedding: number[] }>): Promise<number>
  search(input: {
    key: ChunkSetKey
    embedding: number[]
    query: string
    limit: number
  }): Promise<ChunkCandidate[]>
  count(key: ChunkSetKey): Promise<number>
}

// ---------- Sessões e mensagens ----------
export type SessionRecord = {
  id: string
  channel: Channel
  profile: RestaurantProfile
  summary: string | null
  summaryUntilId: number | null // último messages.id incorporado ao resumo
  createdAt: Date
  lastActivityAt: Date
}

export type StoredMessage = {
  id: number
  role: "user" | "assistant"
  content: string
  status: ReplyStatus | null
  sources: string[]
  createdAt: Date
}

export interface SessionRepository {
  get(id: string): Promise<SessionRecord | null>
  touch(input: { id: string; channel: Channel; profile?: RestaurantProfile }): Promise<SessionRecord>
  listMessages(sessionId: string, opts?: { afterId?: number }): Promise<StoredMessage[]>
  appendTurn(
    sessionId: string,
    turn: { user: string; assistant: string; status: ReplyStatus; sources: string[] },
  ): Promise<void>
  saveSummary(sessionId: string, summary: string, untilId: number): Promise<void>
  deleteInactive(olderThan: Date): Promise<number>
}

// ---------- Rate limit ----------
export type RateLimitBucket = "minute" | "day"

export interface RateLimitRepository {
  hit(input: { ipHash: string; bucket: RateLimitBucket; windowStart: Date }): Promise<number>
  deleteBefore(date: Date): Promise<number>
}

// ---------- Assistente ----------
export type HandleMessageInput = {
  sessionId: string
  message: string
  channel: Channel
  profile?: RestaurantProfile
}

export type AssistantReply = {
  status: ReplyStatus
  answer: string
  sources: string[] // arquivos únicos, na ordem do score; [] se status !== "answered"
  retrieved: RetrievedChunk[] // para eval e debug; a API não expõe
  searchQuery: string // pergunta usada na busca (reescrita ou original)
  usage: Usage // soma das chamadas de LLM do turno
  latencyMs: number
}

export interface Assistant {
  handleMessage(input: HandleMessageInput): Promise<AssistantReply>
}
```

`src/core/errors.ts` — erros que atravessam camadas. Começa com `import "server-only"`.

```ts
// 429 do provedor que persistiu depois dos retries (cota ou limite por minuto).
export class LlmQuotaError extends Error {}
// 5xx, timeout ou falha de rede que persistiu depois dos retries.
export class LlmUnavailableError extends Error {}
// Qualquer outro erro do provedor (4xx), por exemplo chave inválida.
export class LlmRequestError extends Error {}
// Variável de ambiente obrigatória ausente.
export class MissingEnvError extends Error {}
```

Cada classe define `name` igual ao nome da classe, para aparecer certo nos logs.

`src/core/usage.ts`:

```ts
export function emptyUsage(): Usage // { calls: 0, inputTokens: 0, outputTokens: 0 }
export function addUsage(...items: Usage[]): Usage // soma campo a campo
```

`src/infra/env.ts`:

```ts
// Lê process.env (ou o env passado). Lança MissingEnvError com a mensagem
// "Defina <NOME> no .env.local" se a variável estiver ausente ou vazia.
export function requireEnv(name: string, env?: Record<string, string | undefined>): string
```

## Requisitos funcionais

### RF1. Projeto Next.js com a estrutura do `ARCHITECTURE.md`

App Router com `src/`, alias `@/*` apontando para `./src/*` e Tailwind (versão que o create-next-app instalar). Pastas `src/app`, `src/components/ui`, `src/components/chat`, `src/core`, `src/infra/llm`, `src/infra/db`, `src/lib`, `scripts`, `knowledge-base`, `eval/resultados` e `supabase/migrations` existem (com `.gitkeep` quando vazias). O shadcn é inicializado com `npx shadcn@latest init`, cor base neutra e variáveis CSS, o que gera `components.json` e `src/lib/utils.ts`.

- **Critério de aceite:** Dado um clone limpo, quando a pessoa roda `npm ci && npm run build`, então o build termina sem erro e sem nenhuma variável de ambiente definida.

### RF2. Dependências instaladas de uma vez

Runtime: `next`, `react`, `react-dom`, `@google/genai`, `postgres`, `server-only` e as que o shadcn instala no `init`. Desenvolvimento: `typescript`, `@types/node`, `@types/react`, `@types/react-dom`, `@biomejs/biome`, `vitest`, `tsx`, `supabase` (CLI) e as do Tailwind. Remova ESLint e a configuração dele, se o create-next-app tiver criado.

- **Critério de aceite:** Dado o `package.json`, quando o revisor lista as dependências, então todas as acima estão presentes e não há `eslint`, `prettier`, `zod`, `date-fns`, `openai` nem `@supabase/supabase-js`.

### RF3. Scripts npm

```json
{
  "dev": "next dev",
  "build": "next build",
  "start": "next start",
  "lint": "biome check .",
  "format": "biome check --write .",
  "typecheck": "tsc --noEmit",
  "test": "vitest run",
  "test:watch": "vitest",
  "ingest": "node --conditions=react-server --env-file-if-exists=.env.local --import tsx scripts/ingest.ts",
  "chat": "node --conditions=react-server --env-file-if-exists=.env.local --import tsx scripts/chat.ts",
  "eval": "node --conditions=react-server --env-file-if-exists=.env.local --import tsx scripts/eval.ts",
  "smoke": "node --env-file-if-exists=.env.local --import tsx scripts/smoke.ts",
  "db": "supabase"
}
```

`ingest`, `chat`, `eval` e `smoke` apontam para arquivos que outras specs criam. Eles entram já nesta spec para nenhuma outra precisar editar o `package.json` por causa de scripts. O `--env-file-if-exists` não sobrescreve variáveis já definidas no shell, então `DATABASE_URL=<prod> npm run ingest` funciona.

`package.json` também tem `"name": "chapa"`, `"private": true` e `"engines": { "node": ">=24 <25" }`.

- **Critério de aceite:** Dado o projeto, quando a pessoa roda `npm run lint`, `npm run typecheck` e `npm test`, então os três passam.

### RF4. TypeScript estrito

`tsconfig.json` com `strict: true`, `noUncheckedIndexedAccess: true` e `include` cobrindo `src`, `scripts`, `test` e os arquivos de configuração. Mantenha o resto do que o Next gerar.

- **Critério de aceite:** Dado um arquivo com acesso a índice sem checagem (`const x: string = arr[0]`), quando roda `npm run typecheck`, então o tsc acusa erro. (Teste manual, não deixe o arquivo no projeto.)

### RF5. Biome

`biome.json` com formatter de 2 espaços, `lineWidth` 100, aspas duplas e ponto e vírgula só quando necessário. Lint com as regras recomendadas. Ignora `.next`, `node_modules`, `next-env.d.ts` e `supabase/.temp`. Em `src/components/ui/` (código gerado pelo shadcn) o lint fica desligado e só o formatter roda.

- **Critério de aceite:** Dado o projeto recém-criado, quando roda `npm run lint`, então não há erro nem aviso.

### RF6. Vitest

`vitest.config.ts` com ambiente `node`, `include: ["src/**/*.test.ts", "scripts/**/*.test.ts"]`, alias `@` → `src` e alias `server-only` → `test/stubs/server-only.ts` (arquivo vazio com `export {}`).

- **Critério de aceite:** Dado um teste que importa `@/core/usage`, quando roda `npm test`, então o teste passa (o import de `server-only` não quebra).

### RF7. Contratos compartilhados

Os arquivos da seção "Contratos" existem com o conteúdo descrito. `usage.ts` e `env.ts` têm testes.

- **Critério de aceite:** Dado `addUsage({calls:1,inputTokens:10,outputTokens:5},{calls:2,inputTokens:1,outputTokens:1})`, quando o teste roda, então o resultado é `{calls:3,inputTokens:11,outputTokens:6}`. Dado `requireEnv("X", {})`, então lança `MissingEnvError` com a mensagem `Defina X no .env.local`.

### RF8. Teste de arquitetura

`src/architecture.test.ts` lê os arquivos `.ts` e `.tsx` do projeto (fora de `node_modules` e `.next`) e falha quando:

1. Um arquivo em `src/components/` ou `src/lib/` importa `@/core`, `@/infra`, `@google/genai` ou `postgres`.
2. Um arquivo fora de `src/infra/llm/` importa `@google/genai`.
3. Um arquivo fora de `src/infra/db/` importa `postgres`.
4. Um arquivo de `src/core/` ou `src/infra/` (exceto `*.test.ts`) não tem `import "server-only"` na primeira linha de import.
5. Um arquivo de `src/core/` importa `next` ou `next/*`.
6. Algum arquivo de código usa uma variável `NEXT_PUBLIC_` com nome que contenha `KEY`, `SECRET`, `TOKEN` ou `DATABASE`.

A mensagem de falha cita o arquivo e a regra violada.

- **Critério de aceite:** Dado um arquivo temporário `src/components/chat/x.tsx` com `import "@/core/types"`, quando roda `npm test`, então o teste falha citando o arquivo. Removido o arquivo, o teste volta a passar.

### RF9. Variáveis de ambiente e `.gitignore`

`.env.example`, sem valores reais:

```bash
# Gemini (Google AI Studio, plano gratuito, sem cartão)
GEMINI_API_KEY=
# Supabase: connection string do pooler em modo transação (porta 6543)
DATABASE_URL=
# Segredo do HMAC do IP no rate limit (gere com: openssl rand -hex 32)
IP_HASH_SECRET=
# Segredo que a Vercel Cron envia em Authorization (gere com: openssl rand -hex 32)
CRON_SECRET=
# Opcionais: sobrescrevem os modelos definidos em src/config.ts
# CHAT_MODEL=
# FAST_MODEL=
# EMBEDDING_MODEL=
```

`.gitignore` cobre: `node_modules`, `.next`, `out`, `build`, `coverage`, `.vercel`, `*.tsbuildinfo`, `next-env.d.ts`, `.DS_Store`, `.vscode/`, `.idea/`, `.env*` com a exceção `!.env.example`, `supabase/.temp` e `supabase/.branches`.

- **Critério de aceite:** Dado um arquivo `.env.local` criado para teste, quando roda `git status --porcelain`, então ele não aparece. `git check-ignore .env.example` não devolve nada.

### RF10. CI no GitHub Actions

`.github/workflows/ci.yml` roda em `push` e `pull_request`: checkout, `actions/setup-node` com Node 24 e cache de npm, `npm ci`, `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`. Nenhum secret configurado e nenhuma chamada de rede além do `npm ci`.

- **Critério de aceite:** Dado o workflow, quando o revisor lê o arquivo, então os cinco passos estão lá, sem `env:` com segredos. (A primeira execução real acontece no PR desta spec.)

### RF11. Página provisória

`src/app/layout.tsx` com `<html lang="pt-BR">`, `metadata.title = "Chapa"` e uma descrição curta em PT-BR. `src/app/page.tsx` mostra só "Chapa — em construção". A S07 substitui os dois.

- **Critério de aceite:** Dado `npm run dev`, quando a pessoa abre `http://localhost:3000`, então vê o texto provisório em PT-BR.

## Requisitos não funcionais

- **RNF1. Testes:** `npm test`, `npm run typecheck` e `npm run lint` passam sem rede e sem chave de API. *Verificação:* rodar os três com `env -i PATH="$PATH" HOME="$HOME"`.
- **RNF2. Build sem segredos:** `npm run build` passa sem nenhuma variável de ambiente. *Verificação:* mesmo comando acima com `npm run build`.
- **RNF3. Segurança:** nenhum arquivo `.env*` real é criado ou lido. *Verificação:* `git status` não mostra `.env*` além do `.env.example`.

## Você deve

- Seguir as regras do `AGENTS.md` e as camadas descritas no `ARCHITECTURE.md`.
- Gerar o projeto num diretório temporário e copiar para a raiz, sem sobrescrever os arquivos de documentação.
- Registrar no relatório as versões instaladas de Next, React, Tailwind, Biome, Vitest e tsx.
- Rodar `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` antes de entregar.
- Entregar um relatório com: arquivos alterados, cada critério de aceite com a evidência (comando + saída resumida), desvios da spec e pendências humanas.

## Você não deve

- Editar arquivos fora da lista de "Arquivos que podem ser criados ou alterados".
- Adicionar dependências que não estão na seção "Tecnologias".
- Escrever lógica de assistente, RAG, banco ou API.
- Criar `.env.local` com valores reais ou ler `.env*`.
- Fazer `git init`, commit ou push.

## Tecnologias

| Tecnologia | Uso nesta spec |
|---|---|
| Next.js (nova, versão estável atual) | App Router, front e API no mesmo projeto |
| React (nova) | Interface |
| TypeScript (nova) | Linguagem, com `strict` e `noUncheckedIndexedAccess` |
| Tailwind CSS (nova) | Estilos |
| shadcn/ui (nova, só `init`) | Base de componentes |
| Biome (nova) | Lint e formatação |
| Vitest (nova) | Testes unitários |
| tsx (nova) | Executar os scripts locais com o alias `@/` |
| `server-only` (nova) | Impedir que `core/` e `infra/` entrem no bundle do navegador |
| `@google/genai` (nova, só instalação) | Usado pela S01 |
| `postgres` (nova, só instalação) | Usado pela S03 |
| Supabase CLI, pacote `supabase` (nova, dev) | Usado pela S03 e no deploy |
| GitHub Actions | CI |
