# S05 — Assistente: guardrails, memória, prompts e CLI

| Campo | Valor |
|---|---|
| **ID** | S05 |
| **Status** | ✅ Aprovada |
| **Depende de** | S01, S03, S04 |
| **Chamadas reais de API** | Só com autorização: sessão manual na CLI contra o `dev` (cerca de 10 a 20 chamadas) |

## Escopo

Junta guardrails, memória da sessão, reescrita da pergunta, recuperação e geração num único ponto de entrada, `handleMessage`. A API (S06), o eval (S08) e a CLI chamam esse mesmo código.

**Entrega:**
- `createAssistant(deps)` com o fluxo completo de uma mensagem.
- Guardrails de entrada e de saída baseados em padrões.
- Prompts (persona, RAG, reescrita, resumo) e textos fixos.
- Memória com resumo persistido por sessão.
- `getContainer()`, que monta as dependências reais.
- CLI de desenvolvimento `scripts/chat.ts` com `--debug`.

**Fora do escopo:**
- Rotas HTTP, rate limit e logs da API (S06).
- Interface web (S07).
- Avaliação (S08).
- Streaming. A resposta só sai depois do guardrail de saída.

**Arquivos que podem ser criados ou alterados:**
- `src/core/assistant.ts` (+ `.test.ts`)
- `src/core/messages.ts`
- `src/core/prompts.ts` (+ `.test.ts`)
- `src/core/guardrails.ts` (+ `.test.ts`)
- `src/core/memory.ts` (+ `.test.ts`)
- `src/core/rewrite-query.ts` (+ `.test.ts`)
- `src/core/text.ts` (+ `.test.ts`): normalização de texto
- `src/infra/container.ts`
- `scripts/chat.ts`

**Não tocar:**
- `src/core/types.ts`, `src/core/errors.ts`, `src/core/usage.ts`, `src/lib/` (S00)
- `src/core/rag/` (S04), `src/config.ts` e `src/infra/llm/` (S01), `src/infra/db/` (S03)

## Contexto

- Seções do `ARCHITECTURE.md`: "Arquitetura do projeto" (fluxo de uma mensagem e regras de fallback e persistência) e "Back-end" (guardrail de entrada).
- Problema que resolve: sem um ponto único, cada canal (web, CLI, eval) reimplementaria o fluxo e o eval mediria algo diferente do que roda em produção.
- Decisões já tomadas:
  - Fluxo: guardrail de entrada → histórico + resumo da sessão → reescrita da pergunta → embedding → busca híbrida → geração → guardrail de saída → salvar.
  - Se nenhum trecho passar do `minScore`, a resposta é a mensagem de fallback **sem chamar o LLM de resposta**.
  - Salva só a pergunta original e a resposta final (com status e nomes de arquivo das fontes). Os trechos recuperados nunca vão para o banco.
  - O guardrail de entrada bloqueia **padrões** de dado sensível e pedidos de senha, não palavras soltas. "O repasse cai via Pix?" e "Preciso informar o CNPJ para emitir nota?" têm que passar.
  - Sem estado em memória entre chamadas. Histórico e resumo vêm do `SessionRepository` a cada mensagem, o que funciona em serverless.
  - O assistente explica como fazer, mas não executa ações (não altera cardápio, não abre chamado).
  - Sem login. O perfil do restaurante vem do formulário e fica em `sessions.profile`.

### Contratos

**Dona:**

```ts
// src/core/assistant.ts
export type AssistantDeps = {
  llm: LlmClient
  chunks: ChunkRepository
  sessions: SessionRepository
  config: AppConfig
  now?: () => number // padrão: Date.now (para medir latência nos testes)
}
export function createAssistant(deps: AssistantDeps): Assistant

// src/core/messages.ts
export const FALLBACK_MESSAGE =
  "Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Portal do Parceiro."
export const BLOCKED_INPUT_MESSAGES: Record<InputBlockReason, string>
export const BLOCKED_OUTPUT_MESSAGE: string
export const OUTPUT_BLOCK_SIGNALS: string[]

// src/core/guardrails.ts
export type InputBlockReason = "empty" | "too_long" | "sensitive_data" | "credential_request"
export type GuardrailResult<R> = { ok: true } | { ok: false; reason: R }
export function validateInput(message: string, maxChars: number): GuardrailResult<InputBlockReason>
export function validateOutput(answer: string): GuardrailResult<"sensitive_data" | "output_signal">
export function containsCpf(text: string): boolean
export function containsCardNumber(text: string): boolean // com checagem de Luhn

// src/core/text.ts
export function normalize(text: string): string // minúsculas, sem acentos, espaços colapsados
export function includesNormalized(haystack: string, needle: string): boolean

// src/core/memory.ts
export function planMemory(
  pending: StoredMessage[],
  opts: { recentMessages: number; summarizeAbove: number },
): { toSummarize: StoredMessage[]; recent: StoredMessage[] }
export function summarize(input: {
  previousSummary: string | null
  messages: StoredMessage[]
  llm: LlmClient
  model: string
}): Promise<{ summary: string; usage: Usage }>

// src/core/rewrite-query.ts
export function rewriteQuery(input: {
  question: string
  history: ChatMessage[]
  summary: string | null
  llm: LlmClient
  model: string
}): Promise<{ query: string; usage: Usage }>

// src/core/prompts.ts
export const SYSTEM_PROMPT: string
export function buildSystemInstruction(input: { profile: RestaurantProfile; summary: string | null }): string
export function buildRagPrompt(question: string, results: RetrievedChunk[]): string
export function formatProfile(profile: RestaurantProfile): string // "" se vazio
export const REWRITE_PROMPT: string
export const SUMMARY_PROMPT: string

// src/infra/container.ts
export type Container = {
  config: AppConfig
  llm: LlmClient
  chunks: ChunkRepository
  sessions: SessionRepository
  rateLimits: RateLimitRepository
  assistant: Assistant
}
export function getContainer(): Container // singleton preguiçoso; não conecta nem lê segredo no import
```

**Usa:**

```ts
// src/lib/types.ts (S00)
export type ReplyStatus = "answered" | "fallback" | "blocked_input" | "blocked_output"
export type Channel = "web" | "cli" | "eval"
export type RestaurantProfile = { name?: string; plan?: string; cuisine?: string; city?: string; hours?: string }
export const PROFILE_FIELDS: readonly ["name", "plan", "cuisine", "city", "hours"]

// src/core/types.ts (S00)
export type ChatMessage = { role: "user" | "assistant"; content: string }
export type Usage = { calls: number; inputTokens: number; outputTokens: number }
export interface LlmClient { generate(...); embed(...) }
export interface ChunkRepository { replaceAll(...); search(...); count(...) }
export type RetrievedChunk = { id; source; section; content; semantic; keyword; score }
export type SessionRecord = { id; channel; profile; summary; summaryUntilId; createdAt; lastActivityAt }
export type StoredMessage = { id; role; content; status; sources; createdAt }
export interface SessionRepository {
  get(id); touch({ id, channel, profile? }); listMessages(sessionId, { afterId? })
  appendTurn(sessionId, { user, assistant, status, sources }); saveSummary(sessionId, summary, untilId)
  deleteInactive(olderThan)
}
export type HandleMessageInput = { sessionId: string; message: string; channel: Channel; profile?: RestaurantProfile }
export type AssistantReply = {
  status: ReplyStatus; answer: string; sources: string[]; retrieved: RetrievedChunk[]
  searchQuery: string; usage: Usage; latencyMs: number
}
export interface Assistant { handleMessage(input: HandleMessageInput): Promise<AssistantReply> }

// src/core/usage.ts (S00): emptyUsage(), addUsage(...)
// src/core/rag/retrieve.ts (S04): retrieve({ query, config, llm, chunks }) → { results, usage }
// src/config.ts (S01): AppConfig, config, withRag
// src/infra (S01, S03): getLlmClient(), getSql(), create*Repository(sql), closeSql()
```

## Requisitos funcionais

### RF1. Fluxo do `handleMessage` (ordem obrigatória)

1. Marca o início com `now()`.
2. **Guardrail de entrada** (`validateInput(message, config.limits.maxInputChars)`). Se bloquear: devolve `status: "blocked_input"` com a mensagem de `BLOCKED_INPUT_MESSAGES[reason]`, `sources: []`, `retrieved: []`, `searchQuery: ""` e `usage` vazio. **Não chama o LLM, não toca no banco e não persiste nada**, porque a mensagem pode conter CPF ou cartão.
3. `sessions.touch({ id: sessionId, channel, profile })`. O perfil vale o que veio na entrada; se não veio, vale o da sessão. Valores do perfil são aparados (`trim`) e campos vazios descartados.
4. **Memória:** `pending = sessions.listMessages(sessionId, { afterId: session.summaryUntilId ?? undefined })` e `planMemory(pending, config.memory)`. Se `toSummarize` não estiver vazio, chama `summarize` com `config.models.fast` e grava com `sessions.saveSummary(sessionId, summary, último id de toSummarize)`. Se o resumo falhar, segue com o resumo antigo e com `recent` (o turno não cai) e não grava nada.
5. **Reescrita:** se `config.rag.rewriteQuery` estiver ligado **e** houver `recent` ou resumo, `searchQuery = rewriteQuery(...)` com `config.models.fast`. Caso contrário, `searchQuery = message`.
6. **Recuperação:** `retrieve({ query: searchQuery, config, llm, chunks })`. Uma única busca por turno.
7. **Sem resultados:** `answer = FALLBACK_MESSAGE`, `status = "fallback"`, sem chamar o `generate` de resposta. Vai direto para o passo 10.
8. **Geração:** `llm.generate({ model: config.models.chat, system: buildSystemInstruction({ profile, summary }), messages: [...recent como ChatMessage, { role: "user", content: buildRagPrompt(message, results) }], temperature: 0.2, maxOutputTokens: 800 })`. Se `recent` começar com uma mensagem `assistant`, descarta essa primeira para a lista começar com `user`.
9. **Pós-geração:**
   - Resposta vazia (só espaços) ou que contém `FALLBACK_MESSAGE` (`includesNormalized`) → `status = "fallback"`, `answer = FALLBACK_MESSAGE`.
   - Senão, `validateOutput(answer)`. Se bloquear → `status = "blocked_output"`, `answer = BLOCKED_OUTPUT_MESSAGE`.
   - Senão → `status = "answered"`.
10. **Persistência:** `sessions.appendTurn(sessionId, { user: message, assistant: answer, status, sources })`, com a mensagem **original** do usuário e o `answer` **final**.
11. Devolve `AssistantReply`: `sources` são os `source` únicos de `results` na ordem do score, só quando `status === "answered"` (senão `[]`); `retrieved = results`; `usage` é a soma de todas as chamadas do turno (resumo, reescrita, embedding, geração); `latencyMs = now() - início`.

Erros do LLM (`LlmQuotaError`, `LlmUnavailableError`, `LlmRequestError`) na reescrita **não** derrubam o turno (ver RF5). Na recuperação ou na geração, sobem para quem chamou, sem persistir nada.

- **Critério de aceite:** Dados fakes de `LlmClient`, `ChunkRepository` e `SessionRepository` em memória, quando os cenários do RNF2 rodam, então todos passam.

### RF2. Guardrail de entrada

Compara sobre `normalize(message)`.

| Regra | Motivo (`reason`) |
|---|---|
| Vazio ou só espaços | `empty` |
| Mais de `maxChars` caracteres | `too_long` |
| CPF: `\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b` | `sensitive_data` |
| Cartão: sequência de 13 a 19 dígitos, com espaços ou hífens opcionais entre grupos, que passa na checagem de Luhn | `sensitive_data` |
| "minha senha (é\|e) …" | `sensitive_data` |
| Pedido de senha: `qual (e )?(a )?(minha )?senha`, `(me )?(passa\|diz\|informa\|mostra\|envia\|manda)( pra mim\| para mim)?( a)?( minha)? senha` | `credential_request` |

Palavras soltas como "cpf", "cnpj", "pix", "cartão" e "senha" **não** bloqueiam.

`BLOCKED_INPUT_MESSAGES`, em PT-BR:
- `empty`: "Escreva sua dúvida para eu poder ajudar."
- `too_long`: "Sua mensagem ficou muito longa. Resuma em até 1.000 caracteres."
- `sensitive_data`: "Por segurança, não envie CPF, número de cartão ou senha por aqui. Reescreva a pergunta sem esses dados."
- `credential_request`: "Não tenho acesso a senhas e nunca peço senha. Para recuperar o acesso, use a opção de recuperação de senha do Portal do Parceiro."

- **Critério de aceite:** Dado o teste de `validateInput`, então **permite** "Preciso informar o CNPJ para emitir nota?", "O repasse cai via Pix?", "Como troco a senha do Wi-Fi da loja?", "Esqueci a senha do portal, como recupero?" e "Paguei 1234 de comissão este mês?"; e **bloqueia** "Meu CPF é 123.456.789-09, pode verificar?" (`sensitive_data`), "4111 1111 1111 1111" (`sensitive_data`), "minha senha é abc123" (`sensitive_data`), "Qual a senha do meu portal?" (`credential_request`), "me passa a senha" (`credential_request`), "   " (`empty`) e um texto de 1001 caracteres (`too_long`).

### RF3. Guardrail de saída

Bloqueia (`sensitive_data`) se a resposta contém CPF ou cartão (mesmas regras do RF2). Bloqueia (`output_signal`) se `normalize(answer)` contém algum item de `OUTPUT_BLOCK_SIGNALS`:

```ts
export const OUTPUT_BLOCK_SIGNALS = [
  "eu acho que voce deveria",
  "o meu conselho para voce e",
  "como modelo de linguagem",
  "informe sua senha",
  "me envie sua senha",
  "digite sua senha aqui",
]
```

`BLOCKED_OUTPUT_MESSAGE`: "Não consegui montar uma resposta segura para essa pergunta. Tente reformular ou fale com o suporte pelo Portal do Parceiro."

- **Critério de aceite:** Dado o teste de `validateOutput`, então bloqueia "EU ACHO QUE VOCÊ DEVERIA mudar de plano" e uma resposta com "123.456.789-09", e **não** bloqueia "Você deve fazer a contestação pelo portal em até 7 dias."

### RF4. Prompts

`SYSTEM_PROMPT` (persona do Chapa), em PT-BR:
- Assistente para donos e gerentes de restaurantes que **já são parceiros** do app de delivery.
- Tom simples, cordial e direto. No máximo ~150 palavras. Passo a passo numerado para procedimentos.
- Responde **apenas** com base no contexto da base de conhecimento enviado na mensagem. Não inventa números, prazos, nomes de plano ou de tela.
- Usa o perfil do restaurante para personalizar ("no seu plano…") sem inventar dados que o perfil não traz.
- Não pede nem aceita dados sensíveis (CPF, cartão, senha).
- Não executa ações. Explica como a pessoa faz.
- Não lista as fontes no texto, porque a interface já mostra os arquivos usados.
- Quando a resposta não está no contexto, ou a pergunta foge do escopo (inclusive cadastro de novos restaurantes), responde **exatamente** `FALLBACK_MESSAGE`.

`buildSystemInstruction({ profile, summary })` = `SYSTEM_PROMPT` + bloco "Perfil do restaurante:" (só se `formatProfile` não for vazio) + bloco "Resumo da conversa até aqui:" (só se houver resumo).

`formatProfile` produz linhas como `Nome: Pizzaria Bella`, `Plano: ...`, `Cozinha: ...`, `Cidade: ...`, `Horário: ...`, só para os campos preenchidos.

`buildRagPrompt(question, results)`:
- Cada trecho rotulado como `[Fonte: 02-repasse-financeiro.md › Ciclo de repasse]` (sem o `›` quando a seção é `""`), separados por `---`.
- Instruções: responder só com base no contexto; se não estiver lá, responder exatamente `FALLBACK_MESSAGE`; não mostrar raciocínio; não inventar números.
- Dois exemplos curtos (few-shot) com contexto fictício e genérico: um respondido a partir do contexto e um que cai no fallback.
- No fim, a pergunta original.

`REWRITE_PROMPT`: pede para reescrever a última pergunta como uma pergunta autossuficiente em PT-BR, usando o histórico e o resumo, e devolver **só a pergunta**.

`SUMMARY_PROMPT`: pede um parágrafo de até 120 palavras que junte o resumo anterior e as mensagens novas, mantendo fatos sobre o restaurante, dúvidas já respondidas e o que ficou em aberto, sem copiar dados sensíveis.

- **Critério de aceite:** Dado o teste de `prompts`, então `buildRagPrompt` contém os rótulos `[Fonte: ...]` de todos os trechos e a frase exata de `FALLBACK_MESSAGE`; `buildSystemInstruction` sem perfil e sem resumo é igual a `SYSTEM_PROMPT`; `formatProfile({ name: "X", city: "SP" })` tem 2 linhas.

### RF5. Reescrita da pergunta

Usa as últimas 6 mensagens do histórico e o resumo. Chama `generate` com `REWRITE_PROMPT` como `system`, `temperature: 0` e `maxOutputTokens: 100`. Devolve a pergunta original quando a saída vem vazia, passa de 300 caracteres ou a chamada lança erro.

- **Critério de aceite:** Dado um LLM falso que lança erro, então `rewriteQuery` devolve a pergunta original. Dado um LLM falso que devolve `"  Qual a comissão do plano básico?  "`, então devolve o texto aparado.

### RF6. Memória

`planMemory(pending, { recentMessages, summarizeAbove })`:
- Com `pending.length <= summarizeAbove`: `toSummarize = []` e `recent = pending`.
- Senão: `recent` = as últimas `recentMessages` e `toSummarize` = todas as anteriores.

`summarize` chama `generate` com `SUMMARY_PROMPT` como `system`, uma mensagem `user` com o resumo anterior (se houver) e as mensagens formatadas (`Parceiro: ...` / `Assistente: ...`), `temperature: 0.2` e `maxOutputTokens: 300`.

- **Critério de aceite:** Dadas 17 mensagens pendentes com `recentMessages: 10` e `summarizeAbove: 16`, então `toSummarize` tem as 7 primeiras e `recent` as 10 últimas. Com 16, `toSummarize` fica vazio.

### RF7. `getContainer()`

Monta, uma única vez por processo, `config`, `getLlmClient()`, os três repositórios com `getSql()` e `createAssistant`. Começa com `import "server-only"`. Importar o módulo não lê segredo nem abre conexão.

- **Critério de aceite:** Dado um ambiente sem variáveis, quando o teste importa `@/infra/container`, então nada é lançado.

### RF8. CLI `scripts/chat.ts`

```bash
npm run chat -- --nome "Pizzaria Bella" --plano "Plano Básico" --cidade "São Paulo"
npm run chat -- --sessao <uuid> --debug
```

- Argumentos (via `scripts/lib/args.ts`): `--sessao`, `--nome`, `--plano`, `--cozinha`, `--cidade`, `--horario`, `--debug`.
  - O `parseArgs` só trata como flag sem valor as chaves de um conjunto fixo (`debug`, `judge`, `compare`). Qualquer outra `--chave` consome o próximo argumento como valor. Os valores chegam como `string`: `--plano` e os demais campos do perfil passam direto, e `--debug` vira `true`.
- Sem `--sessao`, gera um id com `crypto.randomUUID()`. Usa `channel: "cli"`.
- Cabeçalho: modelo de chat, `chunkConfig` e total de trechos no banco (`chunks.count`). Se for 0, avisa para rodar `npm run ingest` e sai.
- Loop com `node:readline/promises`. Mostra a resposta e, quando `status === "answered"`, `Fontes: a.md, b.md`. Para os outros status, mostra o status entre colchetes antes da resposta.
- `--debug`: depois de cada resposta, mostra a `searchQuery`, cada trecho recuperado (`[score | sem | kw] source › section`) e o `usage`.
- `sair` (ou Ctrl+D) encerra mostrando `Para retomar: npm run chat -- --sessao <id>` e chama `closeSql()`.
- Erros do LLM aparecem como mensagem amigável em PT-BR e o loop continua.

- **Critério de aceite:** *(Com autorização, depois do H2 e da ingestão)* Sessão manual: 1 pergunta no escopo com fontes, 1 fora do escopo com fallback, 1 com CPF bloqueada e, depois de `sair`, retomar com `--sessao` e fazer uma pergunta que depende do contexto anterior ("e no outro plano?"). Cole a transcrição no relatório, sem dados reais.

## Requisitos não funcionais

- **RNF1. Testes:** `npm test`, `npm run typecheck` e `npm run lint` passam sem rede e sem banco. *Verificação:* rodar com `env -i PATH="$PATH" HOME="$HOME"`.
- **RNF2. Cenários do `assistant.test.ts`** (com fakes em memória):
  - bloqueio de entrada → 0 chamadas ao LLM, 0 chamadas ao `SessionRepository`;
  - nenhum trecho acima do `minScore` → `status: "fallback"`, `generate` de resposta não é chamado e 2 mensagens são persistidas;
  - caso feliz → `answered`, `sources` únicos na ordem do score, e nada do que foi persistido contém `[Fonte:`;
  - LLM devolve o texto de fallback → `status: "fallback"` e `sources: []`;
  - LLM devolve um sinal de saída → `blocked_output`, e a mensagem persistida é `BLOCKED_OUTPUT_MESSAGE`;
  - 2º turno da mesma sessão → a reescrita recebe o 1º turno no histórico;
  - `rewriteQuery: false` → nenhuma chamada de reescrita;
  - 17 mensagens pendentes → `saveSummary` é chamado com o id da 7ª, e o `system` da geração contém o resumo;
  - erro no resumo → o turno termina com `answered` e `saveSummary` não é chamado;
  - perfil enviado → `touch` recebe o perfil e o `system` contém "Perfil do restaurante";
  - `usage` do retorno é a soma das chamadas feitas.
  *Verificação:* `npm test`.
- **RNF3. Texto único de fallback:** *Verificação:* `grep -rn "Não encontrei essa informação" src scripts --include=*.ts | grep -v "\.test\.ts"` só aparece em `src/core/messages.ts`.
- **RNF4. Privacidade:** o núcleo não loga nada. *Verificação:* `grep -rn "console\." src/core` volta vazio.
- **RNF5. Núcleo sem infraestrutura:** `src/core/` não importa `@/infra`. *Verificação:* `grep -rn "@/infra" src/core` volta vazio.

## Você deve

- Seguir as regras do `AGENTS.md` e as camadas descritas no `ARCHITECTURE.md`.
- Começar os arquivos de `src/core/` e `src/infra/container.ts` com `import "server-only"`.
- Escrever o teste antes da implementação em `guardrails`, `text`, `memory`, `rewrite-query`, `prompts` e `assistant`.
- Manter todo texto lido pelo parceiro em PT-BR e em `messages.ts` ou `prompts.ts`.
- Rodar `npm test`, `npm run typecheck` e `npm run lint` antes de entregar.
- Entregar um relatório com: arquivos alterados, cada critério de aceite com a evidência (comando + saída resumida), desvios da spec e pendências humanas.

## Você não deve

- Editar arquivos fora da lista de "Arquivos que podem ser criados ou alterados".
- Adicionar dependências.
- Bloquear entrada por palavra solta.
- Persistir trechos recuperados, o prompt de RAG ou mensagens bloqueadas na entrada.
- Guardar histórico em memória do processo entre chamadas.
- Implementar streaming.
- Rodar a CLI contra o Gemini sem autorização.
- Fazer commit ou push.

## Tecnologias

| Tecnologia | Uso nesta spec |
|---|---|
| TypeScript | Núcleo do assistente |
| Vitest | Testes com fakes |
| tsx | CLI |
| `node:readline/promises`, `node:crypto` | Loop da CLI e id da sessão |
