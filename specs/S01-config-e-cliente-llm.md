# S01 — Configuração e cliente do Gemini

| Campo | Valor |
|---|---|
| **ID** | S01 |
| **Status** | 🟢 Concluída |
| **Depende de** | S00 |
| **Chamadas reais de API** | Só com autorização (H1): um teste de fumaça com 1 `generate` e 1 `embed` |

## Escopo

Centraliza os nomes de modelo e os parâmetros do RAG em `src/config.ts` e cria a única porta de saída para o Gemini em `src/infra/llm/`, com retry, timeout, lotes de embedding e contagem de tokens por chamada.

**Entrega:**
- `src/config.ts` com `loadConfig`, `config`, os presets de RAG e `chunkConfigKey`.
- `src/infra/llm/` com o cliente Gemini que implementa `LlmClient`, o `withRetry` e a fábrica `getLlmClient()`.
- Testes sem rede para tudo isso.

**Fora do escopo:**
- Prompts, guardrails e qualquer lógica de RAG (S04 e S05).
- Comparação com outro provedor. O projeto usa só o Gemini.

**Arquivos que podem ser criados ou alterados:**
- `src/config.ts` (+ `src/config.test.ts`)
- `src/infra/llm/gemini-client.ts` (+ `.test.ts`)
- `src/infra/llm/retry.ts` (+ `.test.ts`)
- `src/infra/llm/index.ts`
- `scripts/smoke-llm.ts` (fumaça manual, opcional)
- Remover `src/infra/llm/.gitkeep`

**Não tocar:**
- `src/core/types.ts`, `src/core/errors.ts`, `src/lib/types.ts` (contratos da S00)
- `src/infra/db/`, `supabase/`, `knowledge-base/`
- `package.json` (as dependências já foram instaladas na S00)

## Contexto

- Seções do `ARCHITECTURE.md`: "Back-end" (regras de modelo e de `src/infra/llm/`) e "Infraestrutura" (Gemini como único provedor).
- Problema que resolve: sem um ponto único, nomes de modelo se espalham pelo código e cada chamada trata erro e cota de um jeito. Com a porta única, trocar de modelo mexe só no `config.ts`, e trocar de provedor mexe só em `src/infra/llm/`.
- Decisões já tomadas:
  - SDK `@google/genai`. O embedding usa `taskType` diferente para consulta e documento, o que melhora a busca.
  - Embeddings com 768 dimensões (`outputDimensionality`), que é a dimensão da coluna `vector(768)` no banco (S03).
  - O uso de tokens é devolvido **por chamada**, não acumulado num estado global. Funções serverless atendem várias requisições ao mesmo tempo, e um contador global misturaria as contagens.
  - Importar `config.ts` nunca falha por falta de chave. A chave só é exigida na primeira chamada real.

### Contratos

**Dona:** `src/config.ts`.

```ts
export type ChunkStrategy = "markdown" | "fixed"

export type RagConfig = {
  topK: number // quantos trechos vão para o prompt
  minScore: number // score híbrido mínimo para um trecho contar
  alpha: number // peso do semântico no score híbrido (0 a 1)
  candidateLimit: number // quantos candidatos o SQL devolve antes do ranking em TS
  chunkStrategy: ChunkStrategy
  chunkSize: number // em caracteres
  chunkOverlap: number // em caracteres
  rewriteQuery: boolean // reescrever a pergunta com o histórico antes da busca
}

export type AppConfig = {
  models: {
    chat: string // gera a resposta
    fast: string // reescrita, resumo da sessão e juiz do eval
    embedding: string
    embeddingDimensions: number
  }
  rag: RagConfig
  memory: {
    recentMessages: number // mensagens recentes enviadas inteiras ao modelo
    summarizeAbove: number // acima disso, as mais antigas viram resumo
  }
  limits: {
    maxInputChars: number
    maxBodyBytes: number
    rateLimitPerMinute: number
    rateLimitPerDay: number
  }
  sessionTtlDays: number
  llm: {
    retries: number // tentativas no total, incluindo a primeira
    baseDelayMs: number
    timeoutMs: number
    embedBatchSize: number
  }
}

export const RAG_PRESETS: { padrao: RagConfig; baseline: RagConfig }
export function loadConfig(env: Record<string, string | undefined>): AppConfig
export const config: AppConfig // = loadConfig(process.env)
export function withRag(base: AppConfig, overrides: Partial<RagConfig>): AppConfig
export function chunkConfigKey(rag: RagConfig): string // ex.: "markdown:1200:150"
```

**Dona:** `src/infra/llm/`.

```ts
// retry.ts
export type RetryOptions = {
  retries: number
  baseDelayMs: number
  sleep?: (ms: number) => Promise<void>
}
export function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T>
export function classifyError(error: unknown): "quota" | "unavailable" | "request"

// gemini-client.ts
export type GeminiSdk = {
  models: {
    generateContent(params: unknown): Promise<{
      text?: string
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
    }>
    embedContent(params: unknown): Promise<{ embeddings?: Array<{ values?: number[] }> }>
  }
}
export function createGeminiClient(opts: {
  sdk: GeminiSdk
  retries: number
  baseDelayMs: number
  embedBatchSize: number
  sleep?: (ms: number) => Promise<void>
}): LlmClient

// index.ts
export function getLlmClient(): LlmClient // singleton; cria o SDK com requireEnv("GEMINI_API_KEY")
```

**Usa** (criados na S00):

```ts
// src/core/types.ts
export type ChatMessage = { role: "user" | "assistant"; content: string }
export type Usage = { calls: number; inputTokens: number; outputTokens: number }
export type GenerateInput = {
  model: string; system?: string; messages: ChatMessage[]
  temperature?: number; maxOutputTokens?: number; json?: boolean
}
export type EmbedTask = "query" | "document"
export type EmbedInput = { model: string; texts: string[]; task: EmbedTask; dimensions: number }
export interface LlmClient {
  generate(input: GenerateInput): Promise<{ text: string; usage: Usage }>
  embed(input: EmbedInput): Promise<{ vectors: number[][]; usage: Usage }>
}
// src/core/errors.ts: LlmQuotaError, LlmUnavailableError, LlmRequestError, MissingEnvError
// src/core/usage.ts: emptyUsage(), addUsage(...)
// src/infra/env.ts: requireEnv(name, env?)
```

## Requisitos funcionais

### RF1. Valores padrão do `config.ts`

| Campo | Padrão |
|---|---|
| `models.chat` | modelo **Flash** estável mais recente do Gemini disponível no plano gratuito |
| `models.fast` | modelo **Flash-Lite** estável mais recente do Gemini disponível no plano gratuito |
| `models.embedding` | `gemini-embedding-001` (ou o sucessor estável indicado na documentação) |
| `models.embeddingDimensions` | `768` |
| `memory.recentMessages` | `10` |
| `memory.summarizeAbove` | `16` |
| `limits.maxInputChars` | `1000` |
| `limits.maxBodyBytes` | `4096` |
| `limits.rateLimitPerMinute` | `10` |
| `limits.rateLimitPerDay` | `100` |
| `sessionTtlDays` | `7` |
| `llm.retries` | `3` |
| `llm.baseDelayMs` | `1000` |
| `llm.timeoutMs` | `25000` |
| `llm.embedBatchSize` | `50` |

Os nomes de modelo precisam ser **conferidos na documentação oficial** no dia da implementação (`ai.google.dev/gemini-api/docs/models` e a página de cotas do plano gratuito). Registre num comentário acima de `models`: `// conferido em DD/MM/AAAA em <URL>`.

- **Critério de aceite:** Dado `loadConfig({})`, quando o teste roda, então devolve os valores da tabela e `rag` igual a `RAG_PRESETS.padrao`.

### RF2. Presets de RAG

| Campo | `padrao` | `baseline` |
|---|---|---|
| `topK` | 5 | 5 |
| `minScore` | 0.5 | 0.7 |
| `alpha` | 0.7 | 0.7 |
| `candidateLimit` | 30 | 30 |
| `chunkStrategy` | `"markdown"` | `"fixed"` |
| `chunkSize` | 1200 | 500 |
| `chunkOverlap` | 150 | 100 |
| `rewriteQuery` | `true` | `false` |

O `baseline` é a configuração ingênua (fatia fixa por caracteres, corte alto e sem reescrita) que serve de ponto de partida na avaliação. O `padrao` é o candidato inicial. A S08 atualiza os valores do `padrao` com o resultado da calibração.

- **Critério de aceite:** Dado `chunkConfigKey(RAG_PRESETS.baseline)`, quando o teste roda, então devolve `"fixed:500:100"`. Para o `padrao`, devolve `"markdown:1200:150"`.

### RF3. Sobrescrita por ambiente

`CHAT_MODEL`, `FAST_MODEL` e `EMBEDDING_MODEL` sobrescrevem os modelos quando definidas e não vazias. Nenhuma outra variável altera o `config`. Parâmetros de RAG mudam só por código (`withRag`), e os scripts de ingestão e eval os recebem por argumento de linha de comando.

- **Critério de aceite:** Dado `loadConfig({ CHAT_MODEL: "x" })`, então `models.chat === "x"`. Dado `loadConfig({ CHAT_MODEL: "" })`, então vale o padrão.

### RF4. `withRag` e validação

`withRag(base, overrides)` devolve um novo `AppConfig` (sem mutar o original) com `rag` mesclado e validado. A validação lança `Error` com mensagem clara em PT-BR quando: `topK` não é inteiro ≥ 1; `minScore` ou `alpha` estão fora de [0, 1]; `chunkSize` não é inteiro ≥ 100; `chunkOverlap` é negativo ou ≥ `chunkSize`; `chunkStrategy` não é `markdown` nem `fixed`.

- **Critério de aceite:** Dado `withRag(config, { chunkOverlap: 600, chunkSize: 500 })`, então lança erro citando `chunkOverlap`. Dado `withRag(config, { topK: 3 })`, então o resultado tem `topK: 3` e `config.rag.topK` continua 5.

### RF5. Importar o `config.ts` nunca exige chave

O `config.ts` não lê `GEMINI_API_KEY`, `DATABASE_URL` nem outros segredos, e não importa `server-only` (ele não tem segredo e é usado pelos scripts).

- **Critério de aceite:** Dado um ambiente sem nenhuma variável, quando o teste importa `@/config`, então não há erro.

### RF6. `withRetry`

Executa `fn` até `retries` vezes no total. Entre as tentativas espera `baseDelayMs * 2^(tentativa - 1)` (1 s, depois 2 s com os padrões), usando o `sleep` injetado. Só tenta de novo quando `classifyError` devolve `"quota"` ou `"unavailable"`. Esgotadas as tentativas, lança o erro traduzido: `LlmQuotaError` para `"quota"` e `LlmUnavailableError` para `"unavailable"`. Erros `"request"` viram `LlmRequestError` na hora, sem nova tentativa. A mensagem do erro traduzido é genérica e nunca inclui o conteúdo do prompt.

`classifyError`:
- `"quota"`: erro com `status` ou `code` 429, ou mensagem contendo `RESOURCE_EXHAUSTED`.
- `"unavailable"`: `status` ≥ 500, timeout (`AbortError`, `TimeoutError`) ou erro de rede (`ECONNRESET`, `ETIMEDOUT`, `ENOTFOUND`, `fetch failed`).
- `"request"`: qualquer outro caso.

- **Critério de aceite:** Dado um `fn` que falha com 429 duas vezes e depois resolve, quando roda com `retries: 3` e `sleep` falso, então resolve e o `sleep` foi chamado com 1000 e 2000. Dado um `fn` que falha com 400, então lança `LlmRequestError` após 1 chamada. Dado um `fn` que sempre falha com 503, então lança `LlmUnavailableError` após 3 chamadas.

### RF7. `generate`

Converte `messages` para o formato do Gemini (`assistant` → `model`), passa `system` como `systemInstruction`, `temperature`, `maxOutputTokens` e, com `json: true`, `responseMimeType: "application/json"`. Aplica o timeout de `llm.timeoutMs` (via opção de HTTP do SDK ou `AbortSignal`). Envolve a chamada em `withRetry`. Devolve `text` (string vazia se o SDK não trouxer texto, por exemplo num bloqueio de segurança) e `usage` com `calls: 1`, `inputTokens = promptTokenCount ?? 0` e `outputTokens = candidatesTokenCount ?? 0`.

Se o modelo configurado tiver "thinking" ligado por padrão, desligue ou reduza ao mínimo que o modelo aceita, para economizar cota e latência. Registre no relatório o que foi feito.

Valida a entrada: `messages` não pode ser vazio e a primeira mensagem precisa ser `user`. Caso contrário, lança `Error` antes de chamar o SDK.

- **Critério de aceite:** Dado um SDK falso que devolve `{ text: "oi", usageMetadata: { promptTokenCount: 7, candidatesTokenCount: 2 } }`, quando `generate` roda com uma mensagem `assistant` no histórico, então o SDK recebeu `role: "model"` nessa mensagem e o retorno é `{ text: "oi", usage: { calls: 1, inputTokens: 7, outputTokens: 2 } }`.

### RF8. `embed`

Divide `texts` em lotes de até `llm.embedBatchSize`, chama `embedContent` uma vez por lote com `taskType` `RETRIEVAL_QUERY` (para `"query"`) ou `RETRIEVAL_DOCUMENT` (para `"document"`) e `outputDimensionality = dimensions`. Mantém a ordem da entrada. Cada lote passa por `withRetry`. Lança `Error` se algum vetor vier com tamanho diferente de `dimensions` ou se a quantidade de vetores de um lote não bater com a de textos. `usage.calls` é o número de lotes, e os tokens ficam em 0 (a API de embedding não devolve contagem).

- **Critério de aceite:** Dado um SDK falso e 120 textos com `embedBatchSize: 50`, quando `embed` roda, então o SDK é chamado 3 vezes (50, 50, 20), a saída tem 120 vetores na ordem da entrada e `usage.calls === 3`. Dado um vetor com 767 posições, então lança erro citando a dimensão.

### RF9. `getLlmClient()`

Cria o `GoogleGenAI` só na primeira chamada, com `requireEnv("GEMINI_API_KEY")`, e reaproveita a mesma instância depois. Usa os valores de `config.llm`.

- **Critério de aceite:** Dado um ambiente sem `GEMINI_API_KEY`, quando o código chama `getLlmClient()`, então lança `MissingEnvError` com `Defina GEMINI_API_KEY no .env.local`. Importar o módulo não lança nada.

### RF10. Fumaça manual (só com autorização)

`scripts/smoke-llm.ts` chama `generate` com "Responda só: ok" usando `models.fast` e `embed` com um texto curto, e imprime o texto, a dimensão do vetor e o `usage`. Roda com `node --conditions=react-server --env-file-if-exists=.env.local --import tsx scripts/smoke-llm.ts`.

- **Critério de aceite:** *(Só com autorização e chave, depois do H1)* A saída mostra uma resposta não vazia, dimensão 768 e `usage.calls` ≥ 1.

## Requisitos não funcionais

- **RNF1. Testes:** `npm test`, `npm run typecheck` e `npm run lint` passam sem rede e sem chave de API. *Verificação:* rodar com `env -i PATH="$PATH" HOME="$HOME"`.
- **RNF2. Isolamento do SDK:** só arquivos de `src/infra/llm/` importam `@google/genai`. *Verificação:* o teste de arquitetura da S00 passa, e `grep -rn "@google/genai" src scripts --include=*.ts | grep -v "src/infra/llm/"` volta vazio.
- **RNF3. Nenhum nome de modelo fora do config:** *Verificação:* `grep -rnE "gemini-[0-9]|gemini-embedding|embedding-0" src scripts --include='*.ts' | grep -v "src/config"` volta vazio. O padrão não usa só `gemini-` porque o nome de arquivo `gemini-client.ts`, exigido pela spec, casaria.
- **RNF4. Privacidade:** nenhum log ou mensagem de erro inclui o conteúdo de `messages`, `system` ou `texts`. *Verificação:* teste que força um erro com um texto marcado (`"SEGREDO-123"`) e confere que a mensagem do erro lançado não o contém.

## Você deve

- Seguir as regras do `AGENTS.md` e as camadas descritas no `ARCHITECTURE.md`.
- Escrever o teste antes da implementação em `config.ts`, `retry.ts` e `gemini-client.ts`, usando SDK falso e `sleep` falso.
- Conferir na documentação oficial do Gemini os nomes de modelo, o formato do `embedContent` em lote e o nome da opção de timeout do SDK, e registrar as URLs e a data.
- Começar `gemini-client.ts`, `retry.ts` e `index.ts` com `import "server-only"`.
- Rodar `npm test`, `npm run typecheck` e `npm run lint` antes de entregar.
- Entregar um relatório com: arquivos alterados, cada critério de aceite com a evidência (comando + saída resumida), desvios da spec e pendências humanas.

## Você não deve

- Editar arquivos fora da lista de "Arquivos que podem ser criados ou alterados".
- Adicionar dependências.
- Guardar contagem de tokens em variável global ou de módulo.
- Ler ou imprimir `.env*` ou `../api-key.md`.
- Rodar a fumaça sem autorização explícita.
- Fazer commit ou push.

## Tecnologias

| Tecnologia | Uso nesta spec |
|---|---|
| TypeScript | Configuração e cliente |
| `@google/genai` | Chat (`generateContent`) e embeddings (`embedContent`) |
| Vitest | Testes com SDK falso |
| tsx | Script de fumaça |
