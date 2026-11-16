# Design

## Context

- `handleMessage` (`src/core/assistant.ts`) roda em sequência: guardrail de entrada → `touch` → cumprimento → memória (`listMessages` e, às vezes, `summarize`) → roteador (só mensagens curtas) → reescrita (só com histórico ou resumo) → `retrieve` → `buildContext` → geração (só com trechos) → guardrail de saída → `appendTurn`. Web, CLI e eval chamam a mesma função.
- `createChatHandler` (`src/app/api/_lib/handlers.ts`) faz sessão, `Content-Type`, corpo, rate limit, limite da conta e dono da conversa **antes** de chamar o assistente, e mapeia erros com `toPublicError` (404, 429, 503, 500). `startRequest` devolve um `finish` que grava uma linha de log.
- O `ThinkingIndicator` (`src/components/brand/`) fica dentro da região `role="log" aria-live="polite"` do `MessageList`, e o `BrandShowcase` de `/marca` também o usa, sem props.
- `sendMessage` (`src/lib/api-client.ts`) valida o JSON com `isChatResponse`. O `scripts/screenshots.ts` intercepta `/api/chat` com uma resposta JSON.

## Goals / Non-Goals

**Goals:** etapas reais, emitidas pelo núcleo no ponto em que cada uma começa; contrato JSON intacto para quem não pede NDJSON.

**Non-Goals:** etapas para o guardrail de saída ou a gravação (são instantâneas e sumiriam antes de aparecer); tempo mínimo de exibição por etapa.

## Decisions

### 1. Contratos em `src/lib/types.ts`

```ts
export type ProgressStep = "history" | "understanding" | "searching" | "writing"
export type ProgressEvent =
  | { step: "history" | "understanding" | "searching" }
  | { step: "writing"; documents: number }

export type ChatStreamEvent =
  | ({ type: "step" } & ProgressEvent)
  | ({ type: "reply" } & ChatResponse)
  | { type: "error"; error: string }

export const CHAT_STREAM_CONTENT_TYPE = "application/x-ndjson"
```

`src/core/types.ts`, em `HandleMessageInput`:

```ts
// web: avisado no início de cada etapa que de fato roda. Nunca recebe conteúdo do turno.
onProgress?: (event: ProgressEvent) => void
```

### 2. Onde o núcleo avisa

Um `emit` local chama `onProgress` dentro de `try/catch` e ignora a falha: um aviso quebrado nunca derruba o turno.

- `history`: logo antes do `listMessages` (depois do cumprimento).
- `understanding`: uma vez, antes do roteador ou, se ele não rodar, antes da reescrita; não sai se nenhum dos dois rodar.
- `searching`: antes do `retrieve`.
- `writing`: antes do `llm.generate`, com `documents = uniqueSources(context).length`.

*Alternativa descartada:* o handler adivinhar as etapas por tempo. Mostraria etapas que não aconteceram, como a busca num "obrigada".

### 3. Ramo NDJSON no handler

A negociação é pelo cabeçalho: `Accept` contém `application/x-ndjson`. Em `src/app/api/_lib/http.ts`, ao lado do `json()`:

```ts
export function wantsNdjson(headers: Headers): boolean
// Uma linha JSON terminada em "\n", já codificada.
export function encodeNdjsonLine(event: ChatStreamEvent): Uint8Array
```

Tudo antes do `handleMessage` não muda e responde em JSON. Depois:

- O handler monta um `ReadableStream<Uint8Array>` e responde 200 com `Content-Type: application/x-ndjson; charset=utf-8` e `Cache-Control: no-store`. O `start` do stream chama `handleMessage` com `onProgress` escrevendo `{"type":"step",…}\n`.
- No fim, escreve o `reply`, com o mesmo objeto montado hoje (extraído para uma função `toChatResponse(reply, sessionId, isNew)` usada pelos dois ramos), ou o `error` com `toPublicError(error).message`, e fecha.
- O `finish` roda uma vez, no fim do stream: com o `reply`, os campos de hoje; com o erro, `status` do `toPublicError` e `error: errorName(error)`.
- Escrever num stream que o navegador já fechou é ignorado (`try/catch` no `enqueue`): o turno termina e é gravado, como no JSON.

*Alternativas descartadas:* **SSE** (`text/event-stream`): o `EventSource` só faz GET, e o cliente teria de interpretar o formato de qualquer jeito; NDJSON é uma linha de JSON por evento, mais simples de testar. **Mudar o JSON para sempre em stream:** quebraria o smoke, o screenshots e o `curl` sem ganho.

### 4. Cliente

`src/lib/chat-stream.ts`, puro:

```ts
// Junta o resto anterior ao pedaço novo e devolve as linhas completas e o novo resto.
export function splitLines(rest: string, chunk: string): { lines: string[]; rest: string }
// null para linha vazia; erro (InvalidStreamError) para JSON inválido ou evento desconhecido.
export function parseStreamEvent(line: string): ChatStreamEvent | null
```

`sendMessage(req, options?: { onProgress?: (event: ProgressEvent) => void }, fetchFn?)` manda `Accept: application/x-ndjson`. Se a resposta tem `Content-Type` NDJSON, lê o corpo com `getReader()` e `TextDecoder`, chama `onProgress` a cada etapa e devolve `ok` no `reply` ou `{ ok: false, status: 500, error }` no `error`. Corpo que termina sem `reply` nem `error`, ou com linha inválida, dá o `INVALID_RESPONSE_MESSAGE`. Qualquer outra resposta segue o caminho JSON de hoje. A ordem dos parâmetros muda: os chamadores que passam `fetchFn` (os testes) passam `undefined` no meio.

`src/lib/progress-steps.ts`, puro: `progressLabel(event: ProgressEvent): string`, com os textos do delta de `chat-ui` ("documento" no singular só com 1).

`src/lib/chat-state.ts`: `ChatState.steps: ProgressEvent[]` (começa `[]`) e a ação `{ type: "progress"; event: ProgressEvent }`, aceita só com `sending`. `send_started`, `send_succeeded`, `send_failed` e `reset` zeram `steps`.

### 5. Indicador

`ThinkingIndicator` ganha `steps?: ProgressEvent[]`. Sem etapas, fica igual ao de hoje (o `/marca` não muda). Com etapas, mostra o avatar e uma `<ol>` com um item por etapa: as anteriores com o ícone `CheckIcon` (lucide, `aria-hidden`) e o texto, a última com os três pontos (`aria-hidden`, `motion-reduce:hidden`) e o texto. Como o indicador está dentro da região de log, cada item novo é anunciado uma vez, sem `aria-live` próprio. O `MessageList` recebe `steps` e o repassa; o `chat-app` passa `onProgress` que despacha `progress`, só se a conversa não mudou (`sessionRef.current === id`).

## Arquivos

Criados: `src/lib/chat-stream.ts` e `.test.ts`, `src/lib/progress-steps.ts` e `.test.ts`, `docs/adr/0028-etapas-do-turno-em-ndjson.md`.

Alterados: `src/lib/types.ts`, `src/core/types.ts`, `src/core/assistant.ts` e `.test.ts`, `src/app/api/_lib/handlers.ts` e `.test.ts`, `src/app/api/_lib/http.ts` e `.test.ts`, `src/lib/api-client.ts` e `.test.ts`, `src/lib/chat-state.ts` e `.test.ts`, `src/components/brand/thinking-indicator.tsx`, `src/components/chat/message-list.tsx`, `src/components/chat/chat-app.tsx`.

Documentos:
- `docs/adr/0028-etapas-do-turno-em-ndjson.md` (novo, no formato do 0027, citando o 0004 como complementado, não substituído) e a linha nova na tabela de `docs/adr/README.md`.
- `AGENTS.md`, "Regras de IA e RAG", regra 8: "Sem streaming do texto: a resposta só sai depois do guardrail de saída. As etapas do turno podem ir antes, sem conteúdo ([ADR 0028](docs/adr/0028-etapas-do-turno-em-ndjson.md))."
- `docs/architecture.md`: "Front-end" (o indicador com as etapas) e "Back-end" (o ramo NDJSON de `POST /api/chat` e a linha de log no fim do stream).
- `docs/qa.md`, "Verificação manual local": no item do chat, conferir as etapas numa pergunta, num cumprimento e num fallback.

## Risks / Trade-offs

- [Algum proxy segura o stream e entrega tudo no fim] → a interface continua funcionando, só sem etapas no meio. A verificação no deploy da Vercel fica como pendência da pessoa.
- [Etapas rápidas piscam] → aceito: são as etapas reais. A lista mantém as feitas com ✓, então nada some antes da resposta.
- [Log com `status: 503` num HTTP 200] → é o desfecho do turno, que é o que o log serve para medir. Fica escrito no ADR.
