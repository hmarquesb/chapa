# Design

## Context

A motivação está no `proposal.md`. Esta change parte do estado que as changes `add-google-and-demo-login` e `scope-conversations-to-accounts` deixam:

- `accounts.profile jsonb` já existe e é lido por `toAccountRecord` com `toProfile`. A conta demo nasce com `profile: {}` (`createDemoAccount(..., profile: {})` em `src/infra/auth/config.ts`). `AccountRepository` tem `delete(id)` desde a change 2.
- `RestaurantProfile.plan` é `string` (`src/lib/types.ts`). O `formatProfile` (`src/core/prompts.ts`) escreve `Plano: <valor>`. As 5 perguntas `perfil` do `eval/perguntas.json` usam `"plan": "Plano Próprio" | "Plano Entrega" | "Plano Misto"`. O `scripts/chat.ts` aceita `--plano` em texto livre.
- No `POST /api/chat`, o `profile` vem do corpo (`parseChatRequest`) e o assistente o grava na conversa (`sessions.touch({ profile })`). O `GET /api/sessions/[id]/messages` devolve `{ sessionId, profile, messages }`.
- O `ChatApp` mantém o perfil no estado e no `localStorage` (`src/lib/profile-storage.ts`) e renderiza o `ProfileForm` recolhível.
- O `rate_limits` aceita o bucket `account_day` desde a change 1. `checkRateLimit` fica em `src/app/api/_lib/rate-limit.ts`, e `windowStarts` em `src/core/request-limits.ts`.
- `sessions.account_id` aceita nulo, sem a restrição por canal, que foi adiada pela change 2.
- `knowledge-base/regras.yaml` tem `nomes.plano_proprio: Plano Próprio`, `nomes.plano_entrega: Plano Entrega` e `nomes.plano_misto: Plano Misto`. O pacote `yaml` é devDependency ([ADR 0019](../../../docs/adr/0019-regras-yaml-fonte-unica.md)).

## Goals / Non-Goals

**Goals:**

- Uma única definição do plano (`PLAN_IDS` e `PLAN_LABELS`), usada pela web, pelo CLI, pelo eval e pelo prompt, e conferida contra o `regras.yaml` por teste.
- O texto que chega ao modelo nas perguntas `perfil` do eval fica idêntico ao de antes ("Plano: Plano Próprio").
- O assistente deixa claro, pelo tipo, de onde vem o perfil: da conta (web) ou da conversa (CLI e eval).

**Non-Goals:**

- Migrar os perfis antigos salvos nas conversas ou no `localStorage`. As conversas `web` não guardam mais perfil, e o `localStorage` é ignorado.
- Guardar no banco o histórico das edições do perfil.

## Decisions

### 1. O plano como enum, com o nome oficial num lugar só

```ts
// src/lib/types.ts
export const PLAN_IDS = ["proprio", "entrega", "misto"] as const
export type PlanId = (typeof PLAN_IDS)[number]
// Nomes de knowledge-base/regras.yaml (nomes.plano_*). Conferidos por src/lib/plans.test.ts.
export const PLAN_LABELS: Readonly<Record<PlanId, string>> = {
  proprio: "Plano Próprio",
  entrega: "Plano Entrega",
  misto: "Plano Misto",
}

export type RestaurantProfile = {
  name?: string
  plan?: PlanId
  cuisine?: string
  city?: string
  hours?: string
}

// GET e PUT /api/profile
export type ProfileResponse = { profile: RestaurantProfile }
export type ProfileUpdateRequest = Omit<RestaurantProfile, "plan"> & { plan: PlanId }

// GET /api/sessions/[id]/messages (sem profile)
export type SessionHistoryResponse = { sessionId: string; messages: HistoryMessage[] }

// POST /api/chat (sem profile)
export type ChatRequest = { sessionId?: string; message: string }
```

```ts
// src/lib/plans.ts (puro, testado)
export function isPlanId(value: unknown): value is PlanId
// Aceita o id ou o nome, sem diferenciar maiúsculas e acentos, com ou sem "Plano ":
// "misto", "Misto", "plano próprio", "PLANO PROPRIO" → id. Qualquer outro texto → null.
export function parsePlanId(input: string): PlanId | null
// "Marmitaria Boa Panela · Plano Misto"; sem nome, só o plano; sem plano, só o nome; vazio → "".
export function profileSummary(profile: RestaurantProfile): string
```

O `src/lib/plans.test.ts` lê o `knowledge-base/regras.yaml` com o pacote `yaml` e confere que `PLAN_LABELS` é igual a `nomes.plano_proprio`, `nomes.plano_entrega` e `nomes.plano_misto`. O teste só lê um arquivo local, sem rede nem banco.

`toProfile` (`src/infra/db/mappers.ts`) e `cleanProfile` (`src/core/assistant.ts`) passam a manter o `plan` só quando `isPlanId`. Um texto livre antigo, salvo numa conversa do CLI, é descartado na leitura.

`formatProfile` (`src/core/prompts.ts`) escreve `Plano: ${PLAN_LABELS[plan]}`. Para as perguntas do eval, o resultado é o mesmo texto de antes.

### 2. De onde vem o perfil no assistente

```ts
// src/core/types.ts
export type HandleMessageInput = {
  sessionId: string
  message: string
  channel: Channel
  accountId: string | null
  // cli e eval: substitui o perfil salvo na conversa, como hoje. Proibido na web.
  profile?: RestaurantProfile
  // web: o perfil da conta, usado no prompt e nunca gravado na conversa. Proibido em cli e eval.
  accountProfile?: RestaurantProfile
}
```

No assistente:

- `web` sem `accountProfile`, `web` com `profile` ou `cli`/`eval` com `accountProfile` → `Error("profile source disagrees with channel")`. É um erro de programação.
- Na web, chama `sessions.touch({ id, channel, owner })` **sem** `profile`, e o perfil do prompt é `cleanProfile(input.accountProfile)`.
- No CLI e no eval, o comportamento de hoje continua igual.

O `createChatHandler` passa `accountProfile: account.profile`. A conta já vem do `authenticate`, que lê o banco a cada pedido, então a edição vale a partir da próxima mensagem sem nenhum cache.

### 3. Validação

```ts
// src/app/api/_lib/validate.ts
// Campos aceitos: sessionId e message. "profile" presente → VALIDATION_MESSAGES.profileInAccount.
export function parseChatRequest(body: unknown):
  { ok: true; value: ChatRequest } | { ok: false; error: string }

// Campos aceitos: name, plan, cuisine, city, hours. plan obrigatório e isPlanId; os demais são
// texto de até PROFILE_FIELD_MAX_CHARS. Devolve o perfil aparado e sem campos vazios.
export function parseProfileUpdate(body: unknown):
  { ok: true; value: ProfileUpdateRequest } | { ok: false; error: string }
```

```ts
// src/app/api/_lib/errors.ts (acréscimos)
VALIDATION_MESSAGES.profileInAccount = "O perfil agora fica salvo na conta. Recarregue a página."
VALIDATION_MESSAGES.plan = "Escolha o plano: Próprio, Entrega ou Misto."
ERROR_MESSAGES.accountDailyLimit = "Você chegou ao limite de mensagens de hoje nesta conta. Volte amanhã."
ERROR_MESSAGES.demoDailyLimit =
  "A conta de demonstração chegou ao limite de mensagens de hoje. Entre com Google para continuar."
```

Na ordem do `parseProfileUpdate`, o campo desconhecido vem antes do plano, e o plano vem antes dos demais campos.

### 4. Limite diário por conta

```ts
// src/config.ts (acréscimo em limits)
messagesPerAccountPerDay: { google: number; demo: number } // 60 e 30

// src/app/api/_lib/rate-limit.ts (acréscimo)
// Um hit no bucket account_day, com key = accountId e a janela do dia UTC (windowStarts).
// Acima do limite do tipo de conta: { allowed: false, retryAfterSeconds } até a meia-noite UTC.
export async function checkAccountDailyLimit(input: {
  accountId: string
  kind: AccountKind
  now: Date
  repo: RateLimitRepository
  limits: { google: number; demo: number }
}): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }>
```

O fluxo do `createChatHandler` fica assim:

1. `authenticate` → `401`.
2. Formato → `415`, `413` ou `400`.
3. Limite por IP → `429` (`rateLimited`), sem tocar no contador da conta.
4. Limite da conta → `429` (`accountDailyLimit` ou `demoDailyLimit`), com `Retry-After`.
5. `touchLastSeen`, dono da conversa e assistente, como na change 2.

### 5. Rotas novas

```ts
// GET /api/profile → 200 ProfileResponse
// PUT /api/profile → 200 ProfileResponse
createProfileHandlers(deps: {
  accounts: Pick<AccountRepository, "updateProfile">
  authenticate: Authenticate
  config: AppConfig
  log?: Log
}): { get: (req: Request) => Promise<Response>; put: (req: Request) => Promise<Response> }
// PUT: authenticate → 401 | Content-Type → 415 | corpo (maxBodyBytes) → 413/400 |
//      parseProfileUpdate → 400 | updateProfile(account.id, value) | 200 { profile }

// DELETE /api/account → 204 sem corpo, com Cache-Control: no-store
createDeleteAccountHandler(deps: {
  accounts: Pick<AccountRepository, "delete">
  authenticate: Authenticate
  log?: Log
}): (req: Request) => Promise<Response>
```

```ts
// src/core/types.ts (acréscimo em AccountRepository)
updateProfile(id: string, profile: RestaurantProfile): Promise<RestaurantProfile> // devolve o salvo
```

As rotas novas são `src/app/api/profile/route.ts` (`GET` e `PUT`, modelo de log `/api/profile`) e `src/app/api/account/route.ts` (`DELETE`, modelo de log `/api/account`). A resposta do `GET /api/sessions/[id]/messages` perde o `profile`.

### 6. Perfil da demo

```ts
// src/core/accounts.ts
export const DEMO_PROFILE: Readonly<Required<RestaurantProfile>> = Object.freeze({
  name: "Marmitaria Boa Panela",
  plan: "misto",
  cuisine: "Brasileira caseira",
  city: "Rio de Janeiro",
  hours: "11h às 15h e 18h às 23h",
})
```

O `authorize` do provedor demo passa `profile: { ...DEMO_PROFILE }` ao `createDemoAccount`. Cada demo recebe uma cópia, então editar uma não muda as outras.

### 7. Páginas e componentes

| Arquivo | Tipo | Conteúdo |
|---|---|---|
| `src/app/page.tsx` | Server Component | Depois da conta: sem `account.profile.plan` → `redirect("/perfil")`. Passa ao cabeçalho o `ProfileSummary` com `profileSummary(account.profile)`. O `ChatApp` não recebe nem envia perfil |
| `src/app/perfil/page.tsx` | Server Component | Sem conta → `/entrar`. `firstAccess = !account.profile.plan`. Renderiza o `ProfileForm` com o perfil inicial, `firstAccess`, o aviso (`PRIVACY_NOTICE`) e o link "Privacidade" |
| `src/app/privacidade/page.tsx` | Server Component, pública | O aviso, "O que guardamos", "O que não guardamos", a tabela de retenção e "Como excluir a conta", com os textos da spec `chat-ui`. Os prazos vêm de `config` (`accounts.demoTtlDays`, `conversations.webTtlDays`, `accounts.googleInactiveDays` e `sessionTtlDays`) |
| `src/components/chat/profile-form.tsx` | Cliente (reescrito) | Os campos de texto (`maxLength={PROFILE_FIELD_MAX_CHARS}`), o `RadioGroup` do plano com os 3 `PLAN_LABELS` (obrigatório) e o botão "Salvar" ou, no primeiro acesso, "Salvar e começar", com o título "Conte sobre o seu restaurante". Envia com `saveProfile`. Em `ok`, faz `router.push("/")` e `router.refresh()`. Num `401`, vai para `/entrar`. Num erro, mostra o texto num `Alert` e mantém os campos. Fora do primeiro acesso, mostra o link "Voltar ao chat" |
| `src/components/chat/profile-summary.tsx` | Servidor (sem estado) | O resumo e o link "Editar perfil" (`/perfil`) |
| `src/components/chat/delete-account-dialog.tsx` | Cliente | O diálogo da spec. Ao confirmar, chama `deleteAccount()`. Com `ok` ou `401`, chama a `signOutAction` recebida por prop. Num erro, mostra o texto |
| `src/components/chat/account-menu.tsx` | Cliente (alterado) | Acrescenta "Editar perfil" (link para `/perfil`) e "Excluir minha conta" (abre o diálogo) |
| `src/components/auth/sign-in-panel.tsx` | Cliente (alterado) | Acrescenta o link "Privacidade" |
| `src/components/ui/radio-group.tsx` | shadcn | Gerado por `npx shadcn@<versão do lockfile> add radio-group` |

```ts
// src/lib/api-client.ts (acréscimos; sendMessage deixa de mandar profile; isSessionHistory sem profile)
export function saveProfile(profile: ProfileUpdateRequest, fetchFn?: typeof fetch): Promise<ApiResult<ProfileResponse>>
export function deleteAccount(fetchFn?: typeof fetch): Promise<ApiResult<null>> // 204 → ok
```

`src/lib/profile-storage.ts` e o teste dele são apagados. O `ChatApp` perde o estado de perfil, o `ProfileForm` e toda leitura e escrita do `localStorage`. O rodapé do chat (`src/app/page.tsx`) ganha o link "Privacidade".

### 8. Restrição no banco

A migração é criada com `npm run db -- migration new sessions_account_by_channel`:

```sql
-- Toda conversa web pertence a uma conta, e as de cli e eval nunca têm (ADR 0021).
-- Adiada pela change scope-conversations-to-accounts para depois do deploy dela, quando todo
-- código em produção já grava o account_id. O delete garante que nenhuma conversa anônima
-- sobrou da época sem login (a limpeza diária já as apaga).
delete from public.sessions where channel = 'web' and account_id is null;
alter table public.sessions add constraint sessions_account_by_channel
  check ((channel = 'web') = (account_id is not null));
```

### 9. Scripts e eval

- `eval/perguntas.json`: nas 5 perguntas `perfil`, só o valor de `plan` muda (`"Plano Próprio"` → `"proprio"`, e assim por diante). Ids, textos e notas continuam iguais.
- `scripts/eval/questions.ts`: `perfil.plan`, quando presente, precisa passar em `isPlanId`. A mensagem é `perfil.plan precisa ser "proprio", "entrega" ou "misto".`.
- `scripts/chat.ts`: o `--plano` passa por `parsePlanId`. Um valor inválido encerra com `--plano precisa ser proprio, entrega ou misto (ou o nome do plano).`. O exemplo do cabeçalho vira `--plano misto`.
- `scripts/smoke.ts` e `smoke-checks.ts`: sai o `SMOKE_PROFILE` do corpo do chat. Entra o passo `GET /api/profile` → `checkDemoProfile(res)`, que espera `200` e `profile.plan === "misto"`, logo depois do login demo.

### 10. Documentação

| Arquivo | O que muda |
|---|---|
| `AGENTS.md` | "Onde mexer": a linha "Campo novo no perfil" passa a citar `src/lib/types.ts` (`PROFILE_FIELDS`, `PLAN_IDS`), `src/lib/plans.ts`, `src/app/api/_lib/validate.ts` (`parseProfileUpdate`), `src/core/prompts.ts` e `src/components/chat/profile-form.tsx`. O cuidado novo é que o plano vem do `regras.yaml` |
| `docs/architecture.md` | O perfil na conta (o fluxo da mensagem lê o perfil da conta), as rotas `/api/profile` e `/api/account`, e as páginas `/perfil` e `/privacidade` |
| `docs/business.md` | Conceitos (perfil da conta, plano em escolha fechada, demo com a Marmitaria Boa Panela), "Como o restaurante usa" (primeiro acesso), privacidade e a tabela de retenção completa |
| `docs/qa.md` | Verificação manual (primeiro acesso, trocar o plano muda a resposta `perfil`, excluir conta, privacidade) e o passo novo do smoke |
| `README.md` | "Como testar" (o perfil da demo e trocar o plano para ver a resposta mudar), o `--plano` do CLI e a seção de privacidade |

### Arquivos que a change pode criar ou alterar

O implementador não toca em mais nenhum arquivo.

**Novos:**

- `supabase/migrations/<timestamp>_sessions_account_by_channel.sql`
- `src/lib/plans.ts`, `src/lib/plans.test.ts`
- `src/app/api/profile/route.ts`, `src/app/api/account/route.ts`
- `src/app/perfil/page.tsx`, `src/app/privacidade/page.tsx`
- `src/components/chat/profile-summary.tsx`, `src/components/chat/delete-account-dialog.tsx`, `src/components/ui/radio-group.tsx`

**Alterados:**

- `src/config.ts`, `src/config.test.ts`
- `src/lib/types.ts`, `src/lib/api-client.ts`, `src/lib/api-client.test.ts`
- `src/core/types.ts`, `src/core/assistant.ts`, `src/core/assistant.test.ts`, `src/core/prompts.ts`, `src/core/prompts.test.ts`, `src/core/accounts.ts`, `src/core/accounts.test.ts`
- `src/infra/db/account-repository.ts`, `src/infra/db/mappers.ts`, `src/infra/db/mappers.test.ts`, `src/infra/auth/config.ts`
- `src/app/api/_lib/handlers.ts`, `src/app/api/_lib/handlers.test.ts`, `src/app/api/_lib/validate.ts`, `src/app/api/_lib/validate.test.ts`, `src/app/api/_lib/errors.ts`, `src/app/api/_lib/rate-limit.ts`, `src/app/api/_lib/rate-limit.test.ts`
- `src/app/api/chat/route.ts`, `src/app/page.tsx`
- `src/components/chat/chat-app.tsx`, `src/components/chat/profile-form.tsx`, `src/components/chat/account-menu.tsx`, `src/components/auth/sign-in-panel.tsx`
- `eval/perguntas.json`, `scripts/eval/questions.ts`, `scripts/eval/questions.test.ts`, `scripts/chat.ts`, `scripts/smoke.ts`, `scripts/smoke-checks.ts`, `scripts/smoke-checks.test.ts`
- `AGENTS.md`, `README.md`, `docs/architecture.md`, `docs/business.md`, `docs/qa.md`

**Apagados:** `src/lib/profile-storage.ts`, `src/lib/profile-storage.test.ts`.

## Risks / Trade-offs

- **O resultado do eval mudar sem querer** → O texto do prompt das perguntas `perfil` fica idêntico, e um teste de `buildSystemInstruction` confere isso. Mesmo assim, a tarefa 8.2 roda só as 5 perguntas `perfil` contra o `dev`.
- **Um cliente antigo, aberto antes do deploy, manda `profile` e recebe `400`** → A mensagem pede para recarregar a página, e depois de recarregar a interface nova não manda mais o campo.
- **A conta Google criada antes desta change não tem plano** → Ela cai na tela de primeiro acesso na próxima visita, que é o comportamento desejado.
- **O limite diário da demo pode atrapalhar uma demonstração longa** → São 30 mensagens por demo, e um clique cria outra demo (até 5 por IP por dia). A mensagem sugere entrar com Google.
- **O `delete` da migração apagar conversas em uso** → Só apaga conversas `web` sem conta, que nenhuma conta enxerga desde a change 2.

## Migration Plan

1. Aplicar a migração no `dev` e fazer a verificação manual.
2. Antes do merge, aplicar no `prod` com `db push --remote --yes` (H5 parcial). O código da change 2, em produção, já grava o `account_id` em toda conversa `web`.
3. Merge e deploy.
4. A pessoa testa o primeiro acesso com Google e roda o smoke em produção (ou autoriza o orquestrador).

**Rollback:** reverter o PR. O check `sessions_account_by_channel` continua compatível com o código da change 2.
