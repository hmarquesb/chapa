# Design

## Context

A motivação está no `proposal.md`. Esta change parte do estado que a `add-google-and-demo-login` deixa:

- Os handlers de `src/app/api/_lib/handlers.ts` recebem `authenticate: () => Promise<AccountRecord | null>` e respondem `401` sem conta. `AccountRepository` existe em `src/core/types.ts`, com `upsertGoogle`, `createDemo`, `findActive`, `touchLastSeen` e `deleteExpired`.
- `SessionRepository` (`src/core/types.ts`) não tem dono: `get(id)`, `touch({ id, channel, profile? })`, `listMessages(sessionId, opts?)`, `appendTurn(sessionId, turn)`, `saveSummary(sessionId, summary, untilId)` e `deleteInactive(olderThan)`. O `touch` faz `insert ... on conflict (id) do update`.
- `createAssistant` (`src/core/assistant.ts`) chama `sessions.touch`, `listMessages`, `saveSummary` e `appendTurn` com o `sessionId` do `HandleMessageInput`. O `scripts/chat.ts` usa `sessions.get` e `listMessages` para dizer se a sessão foi retomada. O `scripts/eval.ts` chama o `handleMessage` com um `sessionId` novo por pergunta.
- O `ChatApp` (`src/components/chat/chat-app.tsx`) resolve o id inicial pelo link (`?sessao=`), pelo `localStorage` ou por um id novo (`src/lib/session-id.ts`), carrega o histórico e mostra o `ContinueDialog`.
- `public.sessions` não tem `account_id`. O check de canal é `channel in ('web', 'cli', 'eval')`.
- Componentes shadcn instalados: os da change 1 mais o `dropdown-menu`. O `sheet` não está instalado.

## Goals / Non-Goals

**Goals:**

- O dono entra em **toda** consulta de conversa no SQL. Esquecer o filtro numa consulta nova vira erro de tipo, porque o dono é parâmetro obrigatório das portas.
- Nenhuma janela de deploy em que o código antigo grave numa tabela que o recusa.
- Os testes de autorização rodam no `npm test` (repositório falso) e no `npm run authz-check` (banco `dev`).

**Non-Goals:**

- A restrição no banco "`web` ⇔ `account_id` não nulo". Ela fica para a migração da change 3 (decisão 1).
- Policies de RLS por conta (ADR 0021, alternativa adiada).
- Paginar a lista além das 50 mais recentes.

## Decisions

### 1. Migração só aditiva, com a restrição adiada

A migração é criada com `npm run db -- migration new sessions_account_id`:

```sql
-- Conversas por conta (change scope-conversations-to-accounts, ADR 0021).
-- Só acrescenta: o código anterior, que grava conversas web sem conta, continua funcionando
-- até o deploy. A restrição "web tem conta" entra na migração da change move-profile-to-account,
-- depois que este código estiver em produção.
alter table public.sessions
  add column account_id uuid references public.accounts (id) on delete cascade;
create index sessions_account_activity_idx
  on public.sessions (account_id, last_activity_at desc)
  where account_id is not null;
```

As conversas `web` sem conta que sobrarem do código antigo ficam invisíveis para todas as contas, porque o filtro é `account_id = $conta`. A limpeza diária as apaga na primeira rodada depois do deploy (decisão 6). O PRD pedia que fossem apagadas no deploy, e o efeito é o mesmo um dia depois, sem coordenar a migração com o deploy.

Alternativas consideradas:

- **Uma migração com o `delete` e o check juntos:** entre o `db push` e o deploy, o código da change 1 gravaria conversas `web` sem conta e receberia erro do check, o que viraria `500` no chat.
- **Duas migrações na mesma change:** o `db push` aplica todas as pendentes de uma vez, então seria preciso aplicar a segunda a partir de outro commit, depois do deploy. O passo fica frágil.

### 2. O dono é parâmetro de toda porta de conversa

```ts
// src/core/types.ts
// accountId null: conversa do CLI ou do eval. Na web, sempre a conta logada.
export type SessionOwner = { accountId: string | null }

export type SessionRecord = {
  id: string
  channel: Channel
  accountId: string | null
  profile: RestaurantProfile
  summary: string | null
  summaryUntilId: number | null
  createdAt: Date
  lastActivityAt: Date
}

export type ConversationSummaryRecord = {
  id: string
  firstQuestion: string // conteúdo da primeira mensagem do parceiro
  lastActivityAt: Date
}

export interface SessionRepository {
  // null se não existe ou se o dono é outro (account_id is not distinct from owner.accountId).
  get(id: string, owner: SessionOwner): Promise<SessionRecord | null>
  // Cria com channel e account_id, ou renova last_activity_at (e o perfil, se vier) só quando
  // o dono é o mesmo. Se o id existe com outro dono, lança SessionNotFoundError e não muda nada.
  touch(input: {
    id: string
    channel: Channel
    owner: SessionOwner
    profile?: RestaurantProfile
  }): Promise<SessionRecord>
  // [] se o dono é outro.
  listMessages(
    sessionId: string,
    owner: SessionOwner,
    opts?: { afterId?: number },
  ): Promise<StoredMessage[]>
  // Lança SessionNotFoundError, sem gravar nada, se a conversa não é do dono.
  appendTurn(
    sessionId: string,
    owner: SessionOwner,
    turn: { user: string; assistant: string; status: ReplyStatus; sources: string[] },
  ): Promise<void>
  // Não faz nada se o dono é outro.
  saveSummary(sessionId: string, owner: SessionOwner, summary: string, untilId: number): Promise<void>
  // Só conversas da conta com pelo menos uma mensagem, last_activity_at desc, id; no máximo limit.
  listForAccount(accountId: string, limit: number): Promise<ConversationSummaryRecord[]>
  // true se apagou.
  deleteForAccount(id: string, accountId: string): Promise<boolean>
  // web sem conta (qualquer idade), web com last_activity_at < webBefore, cli e eval com
  // last_activity_at < otherBefore. Devolve quantas.
  deleteInactive(input: { webBefore: Date; otherBefore: Date }): Promise<number>
}

// src/core/types.ts (alterado)
export type HandleMessageInput = {
  sessionId: string
  message: string
  channel: Channel
  accountId: string | null // obrigatório na web e nulo no CLI e no eval
  profile?: RestaurantProfile
}

// src/core/types.ts (acréscimo em AccountRepository, usado pelo authz-check e pela change 3)
delete(id: string): Promise<boolean> // apaga a conta; as conversas vão junto (on delete cascade)
```

```ts
// src/core/errors.ts
// Conversa inexistente ou de outro dono. A API responde 404 com o texto de conversa inexistente.
export class SessionNotFoundError extends Error {
  override name = "SessionNotFoundError"
}
```

SQL dos pontos sensíveis em `src/infra/db/session-repository.ts`:

```sql
-- touch
insert into public.sessions (id, channel, account_id, profile)
values ($id, $channel, $accountId, $profile)
on conflict (id) do update
  set last_activity_at = now() [, profile = excluded.profile]
  where public.sessions.account_id is not distinct from excluded.account_id
returning ...   -- nenhuma linha → SessionNotFoundError

-- appendTurn (numa transação): o update vem primeiro e confirma o dono
update public.sessions set last_activity_at = now()
where id = $id and account_id is not distinct from $accountId
returning id   -- nenhuma linha → SessionNotFoundError, rollback
-- depois, os dois inserts em messages, como hoje

-- listForAccount
select s.id, s.last_activity_at, q.content as first_question
from public.sessions s
join lateral (
  select m.content from public.messages m
  where m.session_id = s.id and m.role = 'user'
  order by m.id limit 1
) q on true
where s.account_id = $accountId
order by s.last_activity_at desc, s.id
limit $limit
```

`listMessages` e `saveSummary` usam `exists (select 1 from public.sessions where id = $id and account_id is not distinct from $accountId)` na própria consulta.

O assistente monta `owner = { accountId: input.accountId }`, passa esse dono a todas as chamadas e lança `Error("channel and accountId disagree")` quando `(channel === "web") !== (accountId !== null)`. Esse caso é um erro de programação.

### 3. Título e retenção como funções puras

```ts
// src/core/conversations.ts
// Apara, junta espaços em branco e corta em maxChars; se cortou, tira os espaços do fim e
// acrescenta "…". Texto vazio vira "Conversa sem título".
export function conversationTitle(firstQuestion: string, maxChars: number): string

// webBefore = now - webTtlDays; otherBefore = now - sessionTtlDays.
export function sessionCleanupCutoffs(
  now: Date,
  cfg: Pick<AppConfig, "sessionTtlDays" | "conversations">,
): { webBefore: Date; otherBefore: Date }
```

```ts
// src/config.ts (acréscimo)
conversations: {
  webTtlDays: number    // 30
  listLimit: number     // 50
  titleMaxChars: number // 60
}
// sessionTtlDays continua 7 e passa a valer só para cli e eval.
```

### 4. API

```ts
// src/lib/types.ts (alterados e novos)
export type ChatRequest = {
  sessionId?: string // ausente: conversa nova
  message: string
  profile?: RestaurantProfile
}

export type ChatResponse = {
  status: ReplyStatus
  answer: string
  sources: string[]
  sessionId: string | null // null quando nenhuma conversa foi criada
}

// GET /api/sessions
export type ConversationListItem = {
  id: string
  title: string
  lastActivityAt: string // ISO 8601
}
export type SessionListResponse = { sessions: ConversationListItem[] }
```

Fluxo do `createChatHandler`:

1. `authenticate` → `401`.
2. Content-Type, corpo e formato, como hoje. No `parseChatRequest`, o `sessionId` fica opcional, mas, se vier, precisa ser UUID.
3. Rate limit por IP → `429`. Depois, `accounts.touchLastSeen`.
4. Com `sessionId`: `sessions.get(sessionId, { accountId: account.id })`. `null` → `404` (`ERROR_MESSAGES.sessionNotFound`). Sem `sessionId`: `id = randomUUID()` (`node:crypto`) e `isNew = true`.
5. `assistant.handleMessage({ sessionId: id, message, channel: "web", accountId: account.id, profile })`.
6. A resposta é `{ status, answer, sources, sessionId: isNew && reply.status === "blocked_input" ? null : id }`.

O `toPublicError` passa a mapear `SessionNotFoundError` para `404` com `ERROR_MESSAGES.sessionNotFound`, o que cobre a corrida entre o passo 4 e a gravação.

Handlers novos:

```ts
// GET /api/sessions → 200 SessionListResponse
createListSessionsHandler(deps: {
  sessions: SessionRepository
  authenticate: Authenticate
  config: AppConfig
  log?: Log
}): (req: Request) => Promise<Response>
// Os itens vêm de listForAccount(account.id, config.conversations.listLimit), com
// title = conversationTitle(firstQuestion, config.conversations.titleMaxChars).

// DELETE /api/sessions/[id] → 204 sem corpo, com Cache-Control: no-store
createDeleteSessionHandler(deps: {
  sessions: SessionRepository
  authenticate: Authenticate
  log?: Log
}): (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>
// Ordem: authenticate → 401 | isUuid → 400 | deleteForAccount → false: 404 | 204
```

O `createHistoryHandler` passa a chamar `sessions.get(id, { accountId: account.id })` e `listMessages(id, { accountId: account.id })`. O `createCleanupHandler` passa a chamar `sessions.deleteInactive(sessionCleanupCutoffs(now, config))`.

Rotas novas: `src/app/api/sessions/route.ts` (`GET`, modelo de log `/api/sessions`) e `src/app/api/sessions/[id]/route.ts` (`DELETE`, modelo de log `/api/sessions/[id]`), as duas com `runtime = "nodejs"`, `dynamic = "force-dynamic"` e `createLazyHandler`.

### 5. Interface

O estado da conversa no `ChatApp` passa a ser `sessionId: string | null`, em que `null` é uma conversa nova. O `localStorage` deixa de guardar o id, e o perfil continua no `localStorage` até a change 3.

```ts
// src/lib/api-client.ts (acréscimos; isChatResponse passa a exigir sessionId string ou null)
export function listSessions(fetchFn?: typeof fetch): Promise<ApiResult<SessionListResponse>>
export function deleteSession(id: string, fetchFn?: typeof fetch): Promise<ApiResult<null>> // 204 → ok

// src/lib/format.ts (acréscimo)
// "14:05" se for no mesmo dia do calendário de now (no fuso dado); senão "10/11".
export function formatActivity(iso: string, now: Date, timeZone?: string): string

// src/lib/session-id.ts: fica só isUuid. Saem SESSION_STORAGE_KEY, SESSION_QUERY_PARAM,
// resolveInitialSession, invalidLinkNotice, os avisos de link inválido, buildContinueLink e
// randomSessionId (o servidor gera o id).
```

| Componente | Props | Comportamento |
|---|---|---|
| `src/components/chat/conversation-list.tsx` (cliente) | `{ items: ConversationListItem[]; currentId: string \| null; disabled: boolean; now: Date; onSelect(id): void; onNew(): void; onDelete(id): void }` | Uma lista (`<nav aria-label="Conversas">`) com o botão "Nova conversa" no topo e, em cada item, o botão do título (`aria-current="true"` no aberto) e o botão "Apagar conversa" (ícone com `aria-label`) |
| `src/components/chat/delete-conversation-dialog.tsx` (cliente) | `{ open: boolean; onConfirm(): void; onCancel(): void; busy: boolean }` | O `Dialog` com o texto e os botões da spec |
| `src/components/ui/sheet.tsx` | shadcn | Gerado por `npx shadcn@<versão do lockfile> add sheet` |

O `ChatApp` monta a barra lateral (`hidden md:flex`) e, abaixo de 768 px, o botão "Conversas" que abre a lista num `Sheet`. Os fluxos ficam assim:

- **Ao montar:** chama `listSessions()`, sem carregar histórico.
- **Ao escolher uma conversa:** chama `fetchHistory(id)`. Num `404`, tira o item da lista, volta para a conversa nova e mostra o aviso de conversa inexistente.
- **Ao enviar:** chama `sendMessage({ ...(sessionId ? { sessionId } : {}), message, profile? })`. Se o envio der certo e `reply.sessionId` não for nulo, adota o id e chama `listSessions()` de novo. Num `404`, faz o mesmo que ao escolher.
- **Ao apagar:** chama `deleteSession(id)` e tira o item. Se era a conversa aberta, volta para a conversa nova.
- **Num `401`, em qualquer chamada:** `window.location.assign("/entrar")`, como na change 1.
- A guarda contra resposta de conversa antiga continua, com `sessionRef`.

`src/app/page.tsx` recebe `searchParams`. Com `sessao` presente e conta válida, faz `redirect("/")`. Sem conta, o `redirect("/entrar")` da change 1 vem antes. O `continue-dialog.tsx` é apagado. O comentário do `referrer` em `src/app/layout.tsx` e o do `Referrer-Policy` em `next.config.ts` deixam de citar o link de continuação, e os valores continuam iguais.

### 6. Limpeza

`deleteInactive` apaga, numa só consulta:

```sql
delete from public.sessions
where (channel = 'web' and account_id is null)
   or (channel = 'web' and last_activity_at < $webBefore)
   or (channel in ('cli', 'eval') and last_activity_at < $otherBefore)
```

As contas são apagadas pelo `accounts.deleteExpired` da change 1. As conversas delas vão junto, pelo `on delete cascade`.

### 7. Scripts

- `scripts/chat.ts`: `sessions.get(sessionId, { accountId: null })`, `listMessages(sessionId, { accountId: null })` e `handleMessage({ ..., accountId: null })`. Um `--sessao` com o id de uma conversa `web` aparece como "Sessão: nova", e a primeira mensagem falha com `SessionNotFoundError`. O CLI mostra "Esta conversa não existe ou não é do CLI." e encerra.
- `scripts/eval.ts`: `handleMessage({ ..., accountId: null })`. Mais nada muda.
- `scripts/authz-check.ts` (novo) e a linha `"authz-check": "node --conditions=react-server --env-file-if-exists=.env.local --import tsx scripts/authz-check.ts"` no `package.json`. O script imprime o host do banco (como o `eval`) e recusa rodar se o host não terminar em `neon.tech`, para nunca tocar o `prod`. Ele cria as contas demo A e B pelo `accounts.createDemo` (perfil `{}`, expiração em 1 hora) e uma conversa `web` de B com um turno (`touch` e `appendTurn`). Depois, confere estes 9 casos e imprime ✅ ou ❌ em cada um:
  1. `get(idB, A)` devolve `null`.
  2. `listMessages(idB, A)` devolve `[]`.
  3. `touch(idB, owner A)` lança `SessionNotFoundError` e não muda o `last_activity_at` de B.
  4. `appendTurn(idB, A)` lança `SessionNotFoundError`, e B continua com 2 mensagens.
  5. `saveSummary(idB, A)` não grava resumo.
  6. `listForAccount(A)` não traz `idB`.
  7. `deleteForAccount(idB, A)` devolve `false`.
  8. `get(idB, { accountId: null })` devolve `null`.
  9. `accounts.delete(B)` apaga a conversa de B.

  No fim, apaga A e B num `finally`. O código de saída é `1` se algum caso falhar. O script nunca imprime ids nem conteúdo, só o nome de cada caso.
- `scripts/smoke.ts` e `smoke-checks.ts`: o primeiro chat vai sem `sessionId` e guarda o `sessionId` da resposta. Os seguintes vão com ele. `checkChatAnswered`, `checkChatFallback` e `checkBlockedInput` aceitam o campo novo. Entra o passo `GET /api/sessions` → a lista contém o id (`checkSessionList(res, id)`), entre o histórico e o cron.

### 8. ADR 0021 e documentação

`docs/adr/0021-autorizacao-por-conta-no-repositorio.md`, com status "Aceito" e data 2026-11-10:

- **Contexto:** com contas, "só o dono acessa" precisa valer em toda consulta. Só o servidor fala com o banco ([ADR 0005](../../../docs/adr/0005-driver-postgres-rls-sem-policies.md)).
- **Decisão:** o dono é parâmetro obrigatório das portas de conversa e entra no `where` de toda consulta. A conversa alheia e a inexistente dão o mesmo `404`. O RLS continua ligado e sem policies. A regra é coberta por testes com o repositório falso e pelo `npm run authz-check` contra o `dev`.
- **Alternativas:** policies de RLS com o id da conta numa variável de sessão do Postgres (`set_config`), adiada, para reavaliar se algum dia o navegador falar direto com o banco; e o filtro só na rota, descartado porque uma consulta nova sem filtro vazaria dados.
- **Consequências:** complementa a 0005, que continua aceita. Cada consulta nova de conversa recebe o dono por tipo.

| Arquivo | O que muda |
|---|---|
| `AGENTS.md` | "Onde mexer": linha "Conversas da conta" (portas com `SessionOwner`, nunca uma consulta sem dono). Comandos: `npm run authz-check` (⚠️ banco `dev`). "Segurança e privacidade": o item do link `/?sessao=<id>` sai, e entra "toda consulta de conversa filtra pelo dono (ADR 0021)" |
| `docs/architecture.md` | Fluxo da mensagem (id gerado no servidor, dono), as rotas novas, a coluna `account_id` e a seção de front-end (a lista no lugar do link) |
| `docs/business.md` | Conceitos ("Conversa" no lugar de "Link de continuação"), "Como o restaurante usa" (a lista de conversas), retenção e a tabela de decisões (0021) |
| `docs/development.md` | "Scripts locais": `npm run authz-check` |
| `docs/qa.md` | O `authz-check` entre os portões manuais de mudanças que tocam conversas, a verificação manual (duas demos, lista, apagar, `?sessao=`) e o passo novo do smoke |
| `README.md` | As menções ao link de continuação viram "lista de conversas da conta". A retenção passa a 30 dias |
| `docs/adr/README.md` | A linha da 0021 |

### Arquivos que a change pode criar ou alterar

O implementador não toca em mais nenhum arquivo.

**Novos:**

- `supabase/migrations/<timestamp>_sessions_account_id.sql`
- `src/core/conversations.ts`, `src/core/conversations.test.ts`
- `src/app/api/sessions/route.ts`, `src/app/api/sessions/[id]/route.ts`
- `src/components/chat/conversation-list.tsx`, `src/components/chat/delete-conversation-dialog.tsx`, `src/components/ui/sheet.tsx`
- `scripts/authz-check.ts`
- `docs/adr/0021-autorizacao-por-conta-no-repositorio.md`

**Alterados:**

- `package.json` (só a linha `authz-check` em `scripts`)
- `src/config.ts`, `src/config.test.ts`
- `src/core/types.ts`, `src/core/errors.ts`, `src/core/assistant.ts`, `src/core/assistant.test.ts`
- `src/infra/db/session-repository.ts`, `src/infra/db/account-repository.ts`, `src/infra/db/mappers.ts`, `src/infra/db/mappers.test.ts`
- `src/app/api/_lib/handlers.ts`, `src/app/api/_lib/handlers.test.ts`, `src/app/api/_lib/validate.ts`, `src/app/api/_lib/validate.test.ts`
- `src/app/api/chat/route.ts`, `src/app/api/sessions/[id]/messages/route.ts`, `src/app/api/cron/cleanup/route.ts`
- `src/lib/types.ts`, `src/lib/api-client.ts`, `src/lib/api-client.test.ts`, `src/lib/session-id.ts`, `src/lib/session-id.test.ts`, `src/lib/format.ts`, `src/lib/format.test.ts`
- `src/components/chat/chat-app.tsx`, `src/app/page.tsx`, `src/app/layout.tsx` (só o comentário), `next.config.ts` (só o comentário)
- `scripts/chat.ts`, `scripts/eval.ts`, `scripts/smoke.ts`, `scripts/smoke-checks.ts`, `scripts/smoke-checks.test.ts`
- `AGENTS.md`, `README.md`, `docs/architecture.md`, `docs/business.md`, `docs/development.md`, `docs/qa.md`, `docs/adr/README.md`

**Apagados:** `src/components/chat/continue-dialog.tsx`.

## Risks / Trade-offs

- **Consulta nova sem dono** → O dono é parâmetro obrigatório nas portas, então esquecê-lo é erro de tipo. O `authz-check` cobre o SQL real.
- **Recarregar a página abre uma conversa nova, não a última** → A lista mostra a conversa mais recente no topo, a um clique. É o comportamento comum de chats e evita guardar o id no navegador.
- **Conversas web anônimas ficam até a próxima limpeza** → Elas ficam invisíveis para todas as contas, porque o filtro é por `account_id`. A primeira limpeza depois do deploy as apaga.
- **`listSessions` depois de cada resposta** → É uma consulta pequena por conta, com índice, e mantém a ordem e o título certos sem lógica duplicada no cliente.
- **O CLI deixa de abrir conversas da web** → É intencional. O dono do CLI é "sem conta".

## Migration Plan

1. Aplicar a migração no `dev`, rodar o `authz-check` e fazer a verificação manual.
2. Antes do merge, aplicar no `prod` com `db push --remote --yes` (H5 parcial). A migração só acrescenta.
3. Merge e deploy. A primeira limpeza diária apaga as conversas `web` sem conta.
4. Smoke em produção (pessoa, ou orquestrador com autorização).

**Rollback:** reverter o PR. A coluna que aceita nulo e o índice não afetam o código da change 1.
