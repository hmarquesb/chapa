# Design

## Context

- `handleMessage` (`src/core/assistant.ts`) faz, nesta ordem: guardrail de entrada → `sessions.touch` e perfil (`cleanProfile`) → `listMessages` + `planMemory` + `summarize` → `rewriteQuery` → `retrieve` → geração → `validateOutput` → `appendTurn`. O resumo pode chamar o Flash-Lite em qualquer turno.
- `normalize` (`src/core/text.ts`) tira acentos e caixa, mas mantém pontuação e emojis.
- `messages.status` tem o `check (status in ('answered', 'fallback', 'blocked_input', 'blocked_output'))` desde a migração inicial.
- `LogEntry.route` já é o modelo da rota HTTP. O cliente do navegador valida o `status` contra uma lista fechada em `src/lib/api-client.ts`.
- No `message-item.tsx`, `answered` (e `null`) usa o `Card` com fontes; os outros status usam o `Alert`, com `bg-muted` no fallback.

## Goals / Non-Goals

**Goals:** a regra de cumprimento é uma função pura testada por tabela; o turno de cumprimento não toca no `LlmClient` nem no `ChunkRepository`; os tipos `ReplyStatus` e `ReplyRoute` já nascem no formato que a change 2 estende.

**Non-Goals:** mexer em prompts, config ou presets; calcular métricas de rota no eval.

## Decisions

### 1. Contratos

```ts
// src/lib/types.ts
export type ReplyStatus = "answered" | "small_talk" | "fallback" | "blocked_input" | "blocked_output"

// src/core/types.ts
export type ReplyRoute = "cumprimento" | "rag"   // a change 2 acrescenta "conversa"
export type AssistantReply = {
  // ...campos atuais, sem mudança
  route: ReplyRoute | null   // null só no blocked_input
}

// src/core/router/greeting.ts
export type GreetingKind = "bom_dia" | "boa_tarde" | "boa_noite" | "neutro"
export type GreetingMatch = { kind: GreetingKind; asksHowAreYou: boolean }
export function normalizeGreeting(message: string): string   // normalize + sem pontuação e emojis
export function matchGreeting(message: string): GreetingMatch | null

// src/core/messages.ts
export function greetingReply(match: GreetingMatch, name: string | undefined): string

// src/app/api/_lib/log.ts — LogEntry ganha:
replyRoute?: ReplyRoute
```

- `ReplyRoute` fica em `src/core/types.ts`, e não em `src/lib/types.ts`, porque não sai do servidor. O `log.ts` (em `src/app/api/`) pode importar tipos de `src/core/`.
- `route: null` no bloqueio, em vez de um valor `"bloqueio"`: a mensagem bloqueada não chega à decisão, e a change 3 conta o acerto de rota só onde houve decisão.

### 2. A regra local

- `normalizeGreeting` reaproveita o `normalize` e depois troca tudo o que não é letra, dígito ou espaço por espaço (`\p{L}`, `\p{N}`), o que remove pontuação e emojis, e colapsa os espaços.
- `matchGreeting` consome a frase da esquerda para a direita: exatamente um cumprimento no começo e, depois, zero ou mais complementos, cada um no máximo uma vez. Os termos de duas palavras (`bom dia`, `e ai`, `tudo bem`) são comparados como sequência de palavras. Se sobrar qualquer palavra, devolve `null`. Por isso "bom dia e boa sorte…" falha (`e` não é complemento) e "oi, ignore…" também.
- Alongamento: uma palavra casa com um termo do vocabulário se, depois de reduzir as letras repetidas no fim a uma só, for igual a ele (`oiii` → `oi`, `olaaa` → `ola`, `boaaa noite` → `boa noite`). Só as letras finais de cada palavra são reduzidas, para não criar falso positivo no meio.
- `asksHowAreYou` é verdadeiro quando um dos complementos é `tudo bem`, `tudo bom`, `tudo certo` ou `como vai`. `chapa` e `pessoal` não mudam a resposta.
- O vocabulário fica em constantes no próprio `greeting.ts`. É regra de linguagem, não parâmetro de RAG, por isso não vai para `src/config.ts`.
- **Por que regra local e não o LLM para o cumprimento:** custo zero, resposta determinística e testável, e o cumprimento puro é o caso mais comum. A change 2 cobre o que a regra não alcança.

### 3. O turno de cumprimento

- Em `handleMessage`, logo depois de resolver a sessão e o perfil limpo, e antes do `listMessages`: se `matchGreeting(message)` casa, o turno grava `appendTurn` com `status: "small_talk"`, `sources: []`, e devolve `route: "cumprimento"`, `retrieved: []`, `searchQuery: ""`, `usage: emptyUsage()`.
- O cumprimento vem depois do `touch` porque o nome do perfil, no `cli` e no `eval`, pode vir da conversa salva. Vem antes do `listMessages` para não disparar o resumo, que chama o modelo.
- O nome passado ao `greetingReply` é o `profile.name` do perfil já limpo pelo `cleanProfile`, que descarta o nome recusado pelo filtro da ADR 0023.
- Todos os outros caminhos devolvem `route: "rag"`, e o bloqueio de entrada devolve `route: null`.

### 4. Banco

- Migração nova (`npm run db -- migration new small_talk_status`): `alter table messages drop constraint messages_status_check` e o `add constraint` com os cinco valores. O nome da constraint gerado pela migração inicial é `messages_status_check`; o implementador confere no `supabase/migrations/20261106003144_schema_inicial.sql` e, se não houver nome explícito, usa o nome padrão do Postgres.
- Nada mais muda: `appendTurn` já grava o status que recebe.

### 5. API, interface e CLI

- `handlers.ts` passa `replyRoute: reply.route ?? undefined` ao log do `POST /api/chat`. O corpo da resposta não muda.
- `api-client.ts` acrescenta `small_talk` à lista de status aceitos.
- `message-item.tsx`: a condição que escolhe o `Card` passa a incluir `small_talk`. O `SourceBadges` já some com a lista vazia.
- `brand-showcase.tsx`: uma mensagem nova, depois da resposta com fontes, com `status: "small_talk"` e um texto ilustrativo no formato da resposta fixa (os componentes não importam `src/core/`).
- `scripts/chat.ts`: no `--debug`, imprime a rota. Fora do debug, o `small_talk` já sai como `[small_talk] …`, e fica assim.

### 6. Documentação

- `docs/architecture.md`, "Arquitetura do projeto": o item "Fluxo de uma mensagem" ganha "regra de cumprimento" entre o guardrail de entrada e o histórico, com a nota de que o cumprimento pula direto para salvar.
- `docs/business.md`, "Como o restaurante usa": uma frase sobre o cumprimento respondido com o nome do restaurante.
- `AGENTS.md`, "Onde mexer": linha nova "Cumprimento e roteador de conversa" → `src/core/router/`, `src/core/messages.ts`, com o cuidado "a regra só reconhece a mensagem inteira; acrescente o caso que deve seguir para o RAG nos testes".

### Arquivos que a change pode criar ou alterar

- Novos: `src/core/router/greeting.ts`, `src/core/router/greeting.test.ts` e a migração `supabase/migrations/<timestamp>_small_talk_status.sql`.
- Alterados: `src/core/messages.ts` e `messages.test.ts`, `src/core/assistant.ts` e `assistant.test.ts`, `src/core/types.ts`, `src/lib/types.ts`, `src/lib/api-client.ts` (e o teste, se existir), `src/app/api/_lib/log.ts`, `src/app/api/_lib/handlers.ts` (e o teste), `src/components/chat/message-item.tsx`, `src/components/brand/brand-showcase.tsx`, `scripts/chat.ts`, `docs/architecture.md`, `docs/business.md` e `AGENTS.md`.

## Risks / Trade-offs

- [Vocabulário estreito deixa "salve" ou "bom diaaa, pessoal!!" de fora] → essas mensagens seguem para o RAG como hoje (fallback), sem regressão; a change 2 cobre o resto com o Flash-Lite.
- [Falso cumprimento que esconde uma dúvida] → só a mensagem inteira casa; os testes fixam os três contraexemplos do PRD.
- [Deploy do código antes da migração] → no `prod`, a migração é aplicada antes do merge (proposta, checkpoint 2).
- [Resumo adiado num cumprimento] → o próximo turno que passa pela memória resume tudo; o cumprimento não é perdido.

## Migration Plan

1. Aplicar a migração no `dev` e no `prod` antes do merge. Ela só alarga o `check`, então o código atual segue funcionando.
2. Merge e deploy.
3. Rollback do código: o código anterior nunca grava `small_talk` e lê o histórico com um status que o cliente antigo não conhece; nesse caso, o cliente antigo recusa a resposta do histórico como inválida. Por isso, num rollback, as conversas com `small_talk` ficam ilegíveis até o código voltar. Aceitável para a demo; a migração não precisa ser revertida.
