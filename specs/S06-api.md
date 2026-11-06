# S06 — API: rotas, rate limit, logs e cron

| Campo | Valor |
|---|---|
| **ID** | S06 |
| **Status** | 🟢 Concluída |
| **Depende de** | S05 |
| **Chamadas reais de API** | Só com autorização: teste manual local com `npm run dev` contra o `dev` (algumas chamadas) |

## Escopo

Expõe o assistente por HTTP com Route Handlers do Next.js no runtime Node.js. Cuida do que é de borda: tamanho do corpo, validação, rate limit por IP, mapeamento de erros, logs sem conteúdo, headers de segurança e a limpeza diária via Vercel Cron.

**Entrega:**
- `POST /api/chat`, `GET /api/sessions/[id]/messages`, `GET /api/health` e `GET /api/cron/cleanup`.
- Handlers testáveis criados por fábricas que recebem as dependências.
- `vercel.json` com região e cron.
- Headers de segurança no `next.config.ts`.

**Fora do escopo:**
- Interface (S07).
- Lógica do assistente (S05).
- Deploy e variáveis na Vercel (S09).

**Arquivos que podem ser criados ou alterados:**
- `src/app/api/chat/route.ts`
- `src/app/api/sessions/[id]/messages/route.ts`
- `src/app/api/health/route.ts`
- `src/app/api/cron/cleanup/route.ts`
- `src/app/api/_lib/handlers.ts` (+ `.test.ts`)
- `src/app/api/_lib/http.ts` (+ `.test.ts`): leitura do corpo com limite e respostas JSON
- `src/app/api/_lib/validate.ts` (+ `.test.ts`)
- `src/app/api/_lib/rate-limit.ts` (+ `.test.ts`)
- `src/app/api/_lib/log.ts`
- `src/app/api/_lib/errors.ts`: textos de erro em PT-BR
- `next.config.ts` (só `headers()` e `poweredByHeader`)
- `vercel.json`

**Não tocar:**
- `src/core/`, `src/infra/`, `src/lib/`, `src/config.ts`
- `src/app/page.tsx`, `src/app/layout.tsx`, `src/components/` (S07)

## Contexto

- Seções do `ARCHITECTURE.md`: "Back-end" (rotas, rate limit, corpo máximo, logs), "Infraestrutura" (região `gru1`, variáveis) e "Automação" (cron diário).
- Problema que resolve: a demo é pública e roda no plano gratuito do Gemini. Sem limite por IP e sem corpo máximo, qualquer pessoa esgota a cota. Sem logs estruturados, não dá para ver latência e consumo.
- Decisões já tomadas:
  - Runtime Node.js. As rotas exportam `runtime = "nodejs"` e `dynamic = "force-dynamic"`, para o build não executar nada.
  - Sem streaming. A resposta só sai depois do guardrail de saída.
  - Rate limit no Postgres, guardando o HMAC-SHA256 do IP com `IP_HASH_SECRET`. O IP em claro nunca é gravado nem logado.
  - Corpo máximo de 4 KB (`config.limits.maxBodyBytes`).
  - Logs com status, latência e tokens. Nunca o conteúdo das mensagens, o perfil, o `sessionId` ou o IP.
  - O link de continuação (`/?sessao=<id>`) funciona como credencial. Por isso a página usa `Referrer-Policy: no-referrer`.
  - Cron diário apaga sessões sem atividade há mais de `config.sessionTtlDays` dias e linhas antigas de `rate_limits`.

### Contratos

**Dona:** contrato HTTP. Os tipos estão em `src/lib/types.ts` (S00).

```
POST /api/chat
  req:  ChatRequest  { sessionId: uuid, message: string, profile?: RestaurantProfile }
  200:  ChatResponse { status, answer, sources }
  400:  ApiErrorResponse  JSON inválido ou campos inválidos
  413:  ApiErrorResponse  corpo maior que 4 KB
  415:  ApiErrorResponse  Content-Type diferente de application/json
  429:  ApiErrorResponse  rate limit por IP (com Retry-After) ou cota do Gemini
  503:  ApiErrorResponse  Gemini ou banco indisponível
  500:  ApiErrorResponse  erro inesperado

GET /api/sessions/[id]/messages
  200:  SessionHistoryResponse { sessionId, profile, messages: HistoryMessage[] }
  400:  id não é UUID
  404:  sessão não existe (expirou ou nunca existiu)

GET /api/health
  200:  HealthResponse { ok: true, chunks, embeddingModel }
  503:  { ok: false, chunks: 0, embeddingModel }   banco indisponível

GET /api/cron/cleanup
  Authorization: Bearer <CRON_SECRET>
  200:  { deletedSessions: number, deletedRateLimits: number }
  401:  ApiErrorResponse
```

**Dona:** `src/app/api/_lib/`.

```ts
// handlers.ts — cada fábrica devolve (req: Request, ctx?) => Promise<Response>
export function createChatHandler(deps: {
  assistant: Assistant
  rateLimits: RateLimitRepository
  config: AppConfig
  ipHashSecret: () => string
  now?: () => Date
  log?: (entry: LogEntry) => void
}): (req: Request) => Promise<Response>

export function createHistoryHandler(deps: { sessions: SessionRepository; log?: ... }):
  (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>

export function createHealthHandler(deps: { chunks: ChunkRepository; config: AppConfig; log?: ... }):
  (req: Request) => Promise<Response>

export function createCleanupHandler(deps: {
  sessions: SessionRepository
  rateLimits: RateLimitRepository
  config: AppConfig
  cronSecret: () => string
  now?: () => Date
  log?: ...
}): (req: Request) => Promise<Response>

// rate-limit.ts
export function getClientIp(headers: Headers): string
export function hashIp(ip: string, secret: string): string // HMAC-SHA256 em hex
export function windowStarts(now: Date): { minute: Date; day: Date } // truncados em UTC
export function checkRateLimit(input: {
  ipHash: string
  now: Date
  repo: RateLimitRepository
  perMinute: number
  perDay: number
}): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }>

// http.ts
export class HttpError extends Error { constructor(status: number, publicMessage: string) }
export function readJsonBody(req: Request, maxBytes: number): Promise<unknown>
export function json(body: unknown, init?: ResponseInit): Response

// validate.ts
export function isUuid(value: unknown): value is string
export function parseChatRequest(body: unknown):
  { ok: true; value: ChatRequest } | { ok: false; error: string }

// log.ts
export type LogEntry = {
  route: string
  method: string
  status: number
  latencyMs: number
  replyStatus?: ReplyStatus
  llmCalls?: number
  inputTokens?: number
  outputTokens?: number
  error?: string // só o nome da classe do erro
}
export function logRequest(entry: LogEntry): void // console.log(JSON.stringify(entry))
```

**Usa:**

```ts
// src/core/types.ts (S00)
export interface Assistant { handleMessage(input: HandleMessageInput): Promise<AssistantReply> }
export type HandleMessageInput = { sessionId; message; channel: "web" | "cli" | "eval"; profile? }
export type AssistantReply = { status; answer; sources; retrieved; searchQuery; usage; latencyMs }
export interface SessionRepository { get(id); listMessages(sessionId, opts?); deleteInactive(olderThan); ... }
export interface RateLimitRepository {
  hit(input: { ipHash: string; bucket: "minute" | "day"; windowStart: Date }): Promise<number>
  deleteBefore(date: Date): Promise<number>
}
export interface ChunkRepository { count(key: ChunkSetKey): Promise<number>; ... }
// src/core/errors.ts (S00): LlmQuotaError, LlmUnavailableError, LlmRequestError, MissingEnvError
// src/lib/types.ts (S00): ChatRequest, ChatResponse, HistoryMessage, SessionHistoryResponse,
//   HealthResponse, ApiErrorResponse, PROFILE_FIELDS, PROFILE_FIELD_MAX_CHARS
// src/config.ts (S01): config, chunkConfigKey
// src/infra/container.ts (S05): getContainer() → { config, llm, chunks, sessions, rateLimits, assistant }
// src/infra/env.ts (S00): requireEnv(name)
```

## Requisitos funcionais

### RF1. `POST /api/chat`

Ordem:
1. `Content-Type` precisa começar com `application/json`, senão 415.
2. `readJsonBody(req, config.limits.maxBodyBytes)`: recusa logo pelo `Content-Length` quando ele existe e passa do limite; senão lê o stream contando bytes e aborta ao passar do limite. Passou → 413. JSON inválido → 400.
3. `parseChatRequest`: `sessionId` é UUID; `message` é string; `profile`, se vier, é objeto só com chaves de `PROFILE_FIELDS` e valores string de até `PROFILE_FIELD_MAX_CHARS`. Qualquer outra coisa → 400. Tamanho e conteúdo da mensagem ficam com o guardrail do assistente, que responde com `blocked_input`.
4. Rate limit: `checkRateLimit` com o hash do IP, `perMinute` e `perDay` do config. Negado → 429 com header `Retry-After`.
5. `assistant.handleMessage({ sessionId, message, profile, channel: "web" })`.
6. 200 com **só** `{ status, answer, sources }`. `retrieved`, `searchQuery` e `usage` nunca saem na resposta.

Mapeamento de erros:

| Erro | HTTP | Texto (`errors.ts`) |
|---|---|---|
| Rate limit do IP | 429 | "Muitas mensagens em pouco tempo. Aguarde um pouco e tente de novo." |
| `LlmQuotaError` | 429 | "A demo atingiu o limite de uso do provedor de IA. Tente mais tarde." |
| `LlmUnavailableError` ou erro de conexão com o banco | 503 | "O assistente está indisponível agora. Tente de novo em instantes." |
| `HttpError` | o status dele | a mensagem pública dele |
| Qualquer outro (`LlmRequestError`, `MissingEnvError`, inesperados) | 500 | "Algo deu errado do nosso lado. Tente de novo." |

Também exporta `maxDuration = 60`. Confira o limite do plano Hobby da Vercel no dia e registre no relatório.

- **Critério de aceite:** Dado o `handlers.test.ts` com assistant falso: requisição válida → 200 com exatamente 3 chaves; corpo de 5 KB → 413; `sessionId` inválido → 400; `profile` com chave desconhecida → 400; `Content-Type: text/plain` → 415; assistant que lança `LlmQuotaError` → 429 com o texto da tabela; 11ª requisição do mesmo IP no mesmo minuto → 429 com `Retry-After`.

### RF2. Rate limit

- `getClientIp`: primeiro valor de `x-forwarded-for` (aparado), senão `x-real-ip`, senão `"unknown"`.
- `hashIp`: `createHmac("sha256", secret).update(ip).digest("hex")`, com `node:crypto`.
- `windowStarts`: minuto e dia truncados em UTC.
- `checkRateLimit`: chama `repo.hit` para `minute` e para `day`. Se a contagem do minuto passar de `perMinute`, nega com `retryAfterSeconds` = segundos até o próximo minuto. Se a do dia passar de `perDay`, nega com os segundos até a meia-noite UTC. Senão, permite.
- O segredo vem de `requireEnv("IP_HASH_SECRET")`, lido só na primeira requisição.

- **Critério de aceite:** Dado um `RateLimitRepository` em memória e relógio fixo, então a 10ª requisição no minuto é permitida e a 11ª negada; no minuto seguinte volta a ser permitida; IPs diferentes são independentes; a 101ª do dia é negada. `hashIp("1.2.3.4", "s")` é determinístico e diferente de `hashIp("1.2.3.4", "t")`.

### RF3. `GET /api/sessions/[id]/messages`

Valida o UUID (400), busca a sessão (404 com "Esta conversa não existe mais. Começamos uma nova."), lista todas as mensagens por `id` e devolve `SessionHistoryResponse` com `createdAt` em ISO 8601. Não atualiza `last_activity_at`.

- **Critério de aceite:** Dado um `SessionRepository` falso com 1 sessão e 2 mensagens, então a resposta tem `profile` e as 2 mensagens na ordem, com `status` `null` na do usuário. Id inexistente → 404.

### RF4. `GET /api/health`

Conta os trechos do conjunto atual (`{ embeddingModel: config.models.embedding, chunkConfig: chunkConfigKey(config.rag) }`). Não chama o LLM.

- **Critério de aceite:** Dado um `ChunkRepository` falso com `count` = 42, então devolve 200 `{ ok: true, chunks: 42, embeddingModel: ... }`. Se `count` lançar, devolve 503 com `ok: false`.

### RF5. `GET /api/cron/cleanup`

Confere `Authorization: Bearer <CRON_SECRET>` com comparação de tempo constante (`timingSafeEqual`, tratando tamanhos diferentes como falha). Falhou → 401. Passou → `sessions.deleteInactive(now - sessionTtlDays)` e `rateLimits.deleteBefore(now - 2 dias)`, e devolve as contagens.

- **Critério de aceite:** Dado o teste, sem header ou com segredo errado → 401 e nenhum repositório é chamado; com o segredo certo → 200, e `deleteInactive` recebe a data de 7 dias antes do relógio fixo.

### RF6. Logs

Cada handler chama `log` uma vez por requisição com `LogEntry`. No chat, inclui `replyStatus` e o `usage` do turno. Em erro, inclui só o `name` do erro.

- **Critério de aceite:** Dado um teste que envia a mensagem `"MARCADOR-SECRETO-123"` com um perfil `{ name: "MARCADOR-PERFIL" }`, então nenhuma entrada de log capturada contém esses textos, o `sessionId` ou o IP.

### RF7. `vercel.json` e headers

```json
{
  "regions": ["gru1"],
  "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 6 * * *" }]
}
```

`next.config.ts`: `poweredByHeader: false` e, para todas as rotas, `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Frame-Options: DENY` e `Permissions-Policy: camera=(), microphone=(), geolocation=()`.

- **Critério de aceite:** Dado `npm run build && npm run start`, quando a pessoa roda `curl -sI localhost:3000/`, então os 4 headers aparecem e não há `X-Powered-By`.

### RF8. Route handlers finos

Cada `route.ts` só exporta `runtime`, `dynamic` (e `maxDuration` no chat) e repassa a requisição para a fábrica com as dependências de `getContainer()`, criadas na primeira requisição.

- **Critério de aceite:** Dado `npm run build` sem variáveis de ambiente, então o build passa.

## Requisitos não funcionais

- **RNF1. Testes:** `npm test`, `npm run typecheck` e `npm run lint` passam sem rede, sem banco e sem chave. *Verificação:* rodar com `env -i PATH="$PATH" HOME="$HOME"`.
- **RNF2. Segurança:** nenhuma rota devolve stack trace, `retrieved`, `searchQuery` ou mensagem de erro do provedor. *Verificação:* testes do RF1 e leitura do código.
- **RNF3. Privacidade:** nenhum `console.*` fora de `log.ts`. *Verificação:* `grep -rn "console\." src/app/api | grep -v "_lib/log.ts"` volta vazio.
- **RNF4. Manual local:** *(Com autorização)* `npm run dev`, `curl -s localhost:3000/api/health` e um `curl -X POST localhost:3000/api/chat` com uma pergunta no escopo contra o `dev`. *Verificação:* saídas no relatório.

## Você deve

- Seguir as regras do `AGENTS.md` e as camadas descritas no `ARCHITECTURE.md`.
- Escrever o teste antes da implementação em `validate`, `rate-limit`, `http` e `handlers`, usando `new Request(...)` e fakes.
- Usar `node:crypto` para HMAC e comparação em tempo constante.
- Rodar `npm test`, `npm run typecheck`, `npm run lint` e `npm run build` antes de entregar.
- *(Com autorização, no teste manual local)* Refazer contra a API real, com `npm run dev` e o `dev`, as verificações RF4 (diálogo de continuação), RF6 (exemplo fora da base → fallback sem fontes) e RF8 (teclado e modo escuro) da S07, que ficaram pendentes no PR #8. A interface só grava um `sessionId` novo depois que o servidor confirma a sessão (desvio 1 da S07), então o `GET /api/sessions/[id]/messages` devolve 404 para uma sessão que ainda não recebeu mensagem.
- Entregar um relatório com: arquivos alterados, cada critério de aceite com a evidência (comando + saída resumida), desvios da spec e pendências humanas.

## Você não deve

- Editar arquivos fora da lista de "Arquivos que podem ser criados ou alterados".
- Adicionar dependências (nada de `zod` ou middleware de rate limit).
- Logar conteúdo de mensagem, perfil, `sessionId` ou IP.
- Gravar o IP em claro.
- Expor `retrieved` ou `searchQuery` em qualquer rota.
- Usar o Edge runtime.
- Fazer commit ou push.

## Tecnologias

| Tecnologia | Uso nesta spec |
|---|---|
| Next.js Route Handlers (runtime Node.js) | Rotas da API |
| `node:crypto` | HMAC do IP e comparação do segredo do cron |
| Vercel (`vercel.json`) | Região `gru1` e cron diário |
| Vitest | Testes dos handlers com fakes |
