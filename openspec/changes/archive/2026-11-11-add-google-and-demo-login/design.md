# Design

## Context

A motivação está no `proposal.md`. Este é o estado atual, levantado na `main` (`8395cf1`):

- **Sem identidade.** `POST /api/chat` recebe `{ sessionId, message, profile? }`, com o `sessionId` gerado pelo navegador (`src/lib/session-id.ts`). `GET /api/sessions/[id]/messages` devolve qualquer sessão cujo UUID a pessoa tenha. Os handlers ficam em `src/app/api/_lib/handlers.ts`, recebem as portas por parâmetro e são testados com fakes. O `route.ts` só os liga ao container por `createLazyHandler`, que adia a leitura das variáveis até o primeiro pedido.
- **Rate limit:** `src/app/api/_lib/rate-limit.ts` tem `getClientIp`, `hashIp` (HMAC-SHA256 com `IP_HASH_SECRET`), `windowStarts` e `checkRateLimit`. A porta `RateLimitRepository.hit({ ipHash, bucket, windowStart })` faz um upsert atômico em `public.rate_limits`, com `bucket in ('minute', 'day')`. O nome do check, gerado pelo Postgres, é `rate_limits_bucket_check`.
- **Variáveis:** `requireEnv(name)` em `src/infra/env.ts` lança `MissingEnvError`. A leitura é preguiçosa, para que o `next build` rode sem variáveis (spec `chat-api`, "Configuração lida no primeiro pedido").
- **Página:** `src/app/page.tsx` é um Server Component que renderiza o `ChatApp` (cliente). Não há `proxy.ts` (o antigo `middleware.ts`).
- **Teste de arquitetura:** `src/architecture.test.ts` cobre as regras de importação do `AGENTS.md`. Hoje não há regra para bibliotecas de autenticação.
- **Componentes shadcn instalados:** `alert`, `badge`, `button`, `card`, `collapsible`, `dialog`, `input`, `label` e `textarea`. O pacote `radix-ui` já é dependência.
- **Smoke:** `scripts/smoke.ts` manda três mensagens sem cookie e lê o histórico. Com o login, ele precisa entrar antes de mandar as mensagens.
- **Auth.js v5 (`next-auth@5.0.0-beta.32`):** aceita uma configuração preguiçosa (`NextAuth(() => config)`), JWT sem adapter, um provedor `Credentials` (que exige JWT), `pages.signIn` e `pages.error` próprios, e as funções `auth()`, `signIn()` e `signOut()` em Server Components e Server Actions. O cookie de sessão sai `HttpOnly` e `SameSite=Lax`, com o prefixo `__Secure-` e `Secure` em HTTPS.

## Goals / Non-Goals

**Goals:**

- Só `src/infra/auth/` conhece o Auth.js. Os handlers recebem uma função `authenticate` e continuam testáveis com fakes, sem o Auth.js no Vitest.
- Toda verificação de sessão consulta o banco, para que uma conta apagada ou uma demo vencida deixe de valer na hora.
- O `next build` continua rodando sem nenhuma variável de ambiente.

**Non-Goals:**

- Ligar as conversas à conta (change 2) e o perfil na conta (change 3).
- Proteger as páginas num `proxy.ts`. A checagem fica na página e no handler (decisão 2).
- Cookie com validade diferente por tipo de conta (decisão 5).

## Decisions

### 1. Auth.js v5, com JWT, sem adapter e com configuração preguiçosa

`src/infra/auth/config.ts` monta a configuração dentro de uma função, chamada no primeiro uso. Assim, nem a importação nem o build leem `AUTH_SECRET`, `AUTH_GOOGLE_*` ou o banco:

```ts
// src/infra/auth/index.ts
import "server-only"
export const { handlers, auth, signIn, signOut } = NextAuth(() => buildAuthConfig())
```

Configuração (`buildAuthConfig(): NextAuthConfig`):

- `secret: requireEnv("AUTH_SECRET")`, `trustHost: true` (o app roda atrás da Vercel ou em `localhost`).
- `session: { strategy: "jwt", maxAge: config.accounts.sessionMaxAgeDays * 86400 }`.
- `pages: { signIn: "/entrar", error: "/entrar" }`.
- `providers`: o `Google({ clientId, clientSecret })` só quando `readGoogleCredentials(process.env)` devolve as credenciais (decisão 4), e sempre o `Credentials({ id: "demo", name: "Demo", credentials: {}, authorize })` da decisão 3.
- `callbacks.signIn`: no Google, devolve `false` se `googleIdentity(...)` for `null` (e-mail ausente ou não verificado). O Auth.js leva então a `/entrar?error=AccessDenied`.
- `callbacks.jwt({ token, user, account, profile })`: no login com Google, chama `accounts.upsertGoogle(identity)` e devolve `sessionToken(token, { accountId, kind: "google" })`. No login demo, devolve `sessionToken(token, { accountId: user.id, kind: "demo" })`. Nas demais chamadas, devolve o `token` sem mudança.
- `callbacks.session({ session, token })`: devolve `{ expires: session.expires, accountId, kind }`, lidos com `readClaims(token)`, sem `user`, `name`, `email` nem `image`.

Os tipos do Auth.js são ampliados em `src/infra/auth/next-auth.d.ts`: `Session` e `JWT` ganham `accountId?: string` e `kind?: AccountKind`.

Alternativas consideradas:

- **OAuth próprio com `node:crypto`:** dispensa a dependência, mas obriga o projeto a manter código de segurança (PKCE, `state`, validação do `id_token`). A pessoa escolheu o Auth.js.
- **Auth.js v4 (`4.24.15`, estável):** foi feito para o Pages Router. No App Router, depende de `getServerSession` com as opções passadas à mão em cada lugar, e o `signIn` em Server Action não existe.
- **Supabase Auth:** exige `supabase-js` (proibido) e prenderia a autenticação ao banco de produção, com o `dev` no Neon ([ADR 0017](../../../docs/adr/0017-neon-como-banco-dev.md)).

### 2. Sem `proxy.ts`: a sessão é confirmada na página e no handler

Um `proxy.ts` só conseguiria olhar o JWT. A regra "conta apagada ou vencida invalida a sessão" exige consultar o banco a cada pedido. Por isso, a checagem fica em `getAuthenticatedAccount()`:

```ts
// src/infra/auth/index.ts
export async function getAuthenticatedAccount(): Promise<AccountRecord | null>
// 1. const session = await auth()
// 2. const claims = readClaims(session)          // null se faltar accountId ou kind válidos
// 3. return claims ? getContainer().accounts.findActive(claims.accountId, new Date()) : null
```

`src/app/page.tsx` chama essa função e faz `redirect("/entrar")` quando ela devolve `null`. `src/app/entrar/page.tsx` faz `redirect("/")` quando ela devolve uma conta. Os `route.ts` passam `authenticate: () => getAuthenticatedAccount()` aos handlers.

### 3. Demo pelo provedor `Credentials`, com o limite por IP no núcleo

O botão "Testar como demo" chama a Server Action `signInAsDemo`, que chama `signIn("demo", { redirectTo: "/" })`. O `authorize(_credentials, request)` do provedor:

```ts
const ipHash = hashIp(getClientIp(request.headers), requireEnv("IP_HASH_SECRET"))
const result = await createDemoAccount({ ipHash, now: new Date(), accounts, rateLimits,
                                          limits: config.accounts, profile: {} })
if (!result.ok) throw new DemoLimitError()   // class DemoLimitError extends CredentialsSignin { code = "demo_limit" }
return { id: result.account.id }
```

`createDemoAccount` fica em `src/core/accounts.ts` e é testada com fakes:

```ts
export type DemoAccountResult =
  | { ok: true; account: AccountRecord }
  | { ok: false; reason: "demo_limit" }

// Conta a tentativa no bucket demo_day (janela do dia UTC) e só cria a conta se a contagem
// ficar em até limits.demoAccountsPerIpPerDay. expiresAt = now + limits.demoTtlDays.
export async function createDemoAccount(input: {
  ipHash: string
  now: Date
  accounts: Pick<AccountRepository, "createDemo">
  rateLimits: Pick<RateLimitRepository, "hit">
  limits: AppConfig["accounts"]
  profile: RestaurantProfile // {} nesta change; o perfil de exemplo entra na change 3
}): Promise<DemoAccountResult>
```

A Server Action trata o erro assim. `isDemoLimitError` e `isAuthError` são exportadas por `src/infra/auth`, para que `src/app/` não importe o `next-auth`:

```ts
// src/app/auth-actions.ts
"use server"
export async function signInAsDemo(): Promise<void>
//   try { await signIn("demo", { redirectTo: "/" }) }
//   catch (e) { if (isDemoLimitError(e)) redirect("/entrar?erro=limite-demo")
//               if (isAuthError(e)) redirect("/entrar?erro=falha"); throw e }   // NEXT_REDIRECT sobe
export async function signInWithGoogle(): Promise<void>   // signIn("google", { redirectTo: "/" })
export async function signOutOfAccount(): Promise<void>   // signOut({ redirectTo: "/entrar" })
```

O `request` que o Auth.js passa ao `authorize` numa Server Action é montado a partir dos cabeçalhos do pedido original, inclusive `x-forwarded-for`. A tarefa 4.3 confirma isso no `npm run dev`. Se não for assim, o implementador **para e reporta**, porque o limite por IP deixaria de funcionar.

O callback direto `POST /api/auth/callback/demo`, que o smoke usa, passa pelo mesmo `authorize` e pelo mesmo limite. Quando ele recusa, o Auth.js leva a `/entrar?error=CredentialsSignin&code=demo_limit`.

Alternativas consideradas: uma rota própria que cria a conta e grava o cookie com o `encode` do Auth.js. Ela duplicaria o formato do cookie, que é interno da biblioteca.

### 4. Google opcional, mas sempre com as duas credenciais

```ts
// src/infra/auth/env.ts
// Sem nenhuma das duas: null (o deploy fica só com a demo, como nos previews).
// Com só uma: lança MissingEnvError("Defina AUTH_GOOGLE_ID e AUTH_GOOGLE_SECRET no .env.local").
export function readGoogleCredentials(
  env: Record<string, string | undefined>,
): { clientId: string; clientSecret: string } | null

// src/infra/auth/index.ts
export function isGoogleEnabled(): boolean   // readGoogleCredentials(process.env) !== null
```

O PRD pedia as três variáveis obrigatórias. O Google ficou opcional para mitigar o risco 1 do PRD: as URLs dos previews da Vercel mudam a cada deploy e não podem ser cadastradas no Google. Só o `AUTH_SECRET` é obrigatório.

### 5. Um cookie de 30 dias para todos, com o prazo da demo no banco

O Auth.js tem um `maxAge` só. O cookie vale 30 dias para qualquer conta, e a demo vence pelo `accounts.expires_at` (criação + 7 dias), que o `findActive` confere a cada pedido. O efeito é o do PRD: a sessão demo não passa do 7º dia.

### 6. Tabela `accounts` e buckets novos no `rate_limits`

A migração é criada com `npm run db -- migration new accounts`, o que gera `supabase/migrations/<timestamp>_accounts.sql`:

```sql
-- Contas do login (change add-google-and-demo-login, ADR 0020).
-- RLS ligado e sem policies, como as demais tabelas (ADR 0005).
create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('google', 'demo')),
  google_sub text unique,
  email text,
  profile jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  expires_at timestamptz,
  constraint accounts_kind_fields check (
    (kind = 'google' and google_sub is not null and email is not null and expires_at is null)
    or (kind = 'demo' and google_sub is null and email is null and expires_at is not null)
  )
);
create index accounts_demo_expires_idx on public.accounts (expires_at) where kind = 'demo';
create index accounts_google_last_seen_idx on public.accounts (last_seen_at) where kind = 'google';
alter table public.accounts enable row level security;

-- demo_day: contas demo criadas por IP por dia. account_day: mensagens por conta por dia
-- (usado na change move-profile-to-account).
alter table public.rate_limits drop constraint rate_limits_bucket_check;
alter table public.rate_limits add constraint rate_limits_bucket_check
  check (bucket in ('minute', 'day', 'demo_day', 'account_day'));
comment on column public.rate_limits.ip_hash is
  'Chave do contador: HMAC do IP (minute, day, demo_day) ou id da conta (account_day).';
```

A coluna `ip_hash` mantém o nome, para evitar renomear uma coluna em produção. Na porta, o campo passa a se chamar `key` (decisão 7).

### 7. Contratos novos e alterados no núcleo

```ts
// src/core/types.ts (acréscimos)
export type AccountKind = "google" | "demo"

export type AccountRecord = {
  id: string
  kind: AccountKind
  email: string | null // só google
  profile: RestaurantProfile
  createdAt: Date
  lastSeenAt: Date
  expiresAt: Date | null // só demo
}

export interface AccountRepository {
  // Cria a conta ou, se o sub já existe, atualiza o e-mail e o last_seen_at.
  upsertGoogle(input: { googleSub: string; email: string }): Promise<AccountRecord>
  createDemo(input: { expiresAt: Date; profile: RestaurantProfile }): Promise<AccountRecord>
  // null se a conta não existe ou se expires_at <= now.
  findActive(id: string, now: Date): Promise<AccountRecord | null>
  touchLastSeen(id: string): Promise<void>
  // Demo com expires_at <= now e Google com last_seen_at < googleInactiveBefore. Devolve quantas.
  deleteExpired(input: { now: Date; googleInactiveBefore: Date }): Promise<number>
}

// src/core/types.ts (alterados)
export type RateLimitBucket = "minute" | "day" | "demo_day" | "account_day"

export interface RateLimitRepository {
  hit(input: { key: string; bucket: RateLimitBucket; windowStart: Date }): Promise<number>
  deleteBefore(date: Date): Promise<number>
}
```

`getClientIp`, `hashIp` e `windowStarts` saem de `src/app/api/_lib/rate-limit.ts` e vão para `src/core/request-limits.ts`, sem mudar o comportamento. A razão é que agora o `src/infra/auth/` também os usa, e o `infra` não importa de `src/app/`. Os testes vão junto, para `src/core/request-limits.test.ts`. O `rate-limit.ts` mantém o `checkRateLimit`, que passa `key: input.ipHash`.

```ts
// src/config.ts (acréscimo em AppConfig e em loadConfig)
accounts: {
  sessionMaxAgeDays: number       // 30: validade do cookie de sessão
  demoTtlDays: number             // 7: vida da conta demo
  demoAccountsPerIpPerDay: number // 5
  googleInactiveDays: number      // 180: conta Google sem acesso é apagada
}
```

Contrato de `src/infra/auth/callbacks.ts`. As funções são puras, não importam `next-auth` e são testadas no Vitest:

```ts
export type SessionClaims = { accountId: string; kind: AccountKind }

// Só com profile.email (string) e profile.email_verified === true. googleSub = providerAccountId.
export function googleIdentity(input: {
  providerAccountId: string
  profile: unknown
}): { googleSub: string; email: string } | null

// Mantém só iat, exp e jti do token, define sub = accountId e acrescenta accountId e kind.
// Nunca leva name, email nem picture.
export function sessionToken(
  token: Record<string, unknown>,
  claims: SessionClaims,
): Record<string, unknown>

// Lê accountId (UUID) e kind ("google" | "demo") de um token ou sessão. null se faltar algum.
export function readClaims(value: unknown): SessionClaims | null
```

`src/infra/auth/index.ts` exporta `handlers`, `auth`, `signIn`, `signOut`, `getAuthenticatedAccount`, `isGoogleEnabled`, `isDemoLimitError(error: unknown): boolean` e `isAuthError(error: unknown): boolean`.

### 8. Handlers: `authenticate` vem primeiro

```ts
type Authenticate = () => Promise<AccountRecord | null>

createChatHandler(deps: {
  assistant: Assistant
  rateLimits: RateLimitRepository
  accounts: Pick<AccountRepository, "touchLastSeen">
  authenticate: Authenticate
  config: AppConfig
  ipHashSecret: () => string
  now?: () => Date
  log?: Log
})
// Ordem: authenticate → 401 | Content-Type → 415 | corpo → 413/400 | formato → 400 |
//        rate limit por IP → 429 | accounts.touchLastSeen(account.id) | assistant | 200

createHistoryHandler(deps: { sessions: SessionRepository; authenticate: Authenticate; log?: Log })
// Ordem: authenticate → 401 | id → 400 | sessão → 404 | 200 (o dono da conversa entra na change 2)

createCleanupHandler(deps: {
  sessions: SessionRepository
  rateLimits: RateLimitRepository
  accounts: Pick<AccountRepository, "deleteExpired">
  config: AppConfig
  cronSecret: () => string
  now?: () => Date
  log?: Log
})
// Resposta: { deletedSessions, deletedRateLimits, deletedAccounts }
```

- `ERROR_MESSAGES.unauthenticated = "Sua sessão terminou. Entre de novo para continuar."` (em `src/app/api/_lib/errors.ts`).
- `LogEntry` ganha `accountId?: string`, preenchido assim que a sessão é resolvida.
- Um erro dentro de `authenticate` (banco fora do ar) segue o mapeamento atual: `503` ou `500`.

### 9. Páginas, Server Actions e componentes

| Arquivo | Tipo | Conteúdo |
|---|---|---|
| `src/app/entrar/page.tsx` | Server Component | Redireciona a `/` quando há conta. Lê `searchParams` (`erro`, `error`, `code`), monta a mensagem com `signInErrorMessage` e renderiza o `SignInPanel` com `googleEnabled` e as actions |
| `src/app/auth-actions.ts` | Server Actions | `signInAsDemo`, `signInWithGoogle` e `signOutOfAccount` (decisão 3) |
| `src/app/page.tsx` | Server Component | `getAuthenticatedAccount()` ou `redirect("/entrar")`. Renderiza o cabeçalho com o `AccountMenu`, a `DemoBanner` (só na demo) e o `ChatApp` |
| `src/components/auth/sign-in-panel.tsx` | Cliente | Os botões "Testar como demo" (`variant="default"`) e "Entrar com Google" (`variant="outline"`, só com `googleEnabled`), cada um num `<form action>`, com estado de envio pelo `useFormStatus`. Mostra o erro num `Alert` e o aviso de privacidade |
| `src/components/chat/account-menu.tsx` | Cliente | Um `DropdownMenu` com o rótulo (e-mail ou "Conta de demonstração") e "Sair" (`<form action={signOutAction}>`) |
| `src/components/chat/demo-banner.tsx` | Servidor (sem estado) | O texto fixo da faixa e, com `googleEnabled`, o botão "Entrar com Google" num `<form action>` |
| `src/components/ui/dropdown-menu.tsx` | shadcn | Gerado por `npx shadcn@<versão do lockfile> add dropdown-menu`. Não pode mudar o `package.json` |

```ts
// src/lib/sign-in.ts (puro, testado)
export const PRIVACY_NOTICE =
  "Projeto de estudo. A Rango é uma empresa fictícia. As mensagens são processadas pelo Google Gemini, que pode usar o conteúdo para melhorar os serviços dele. Não escreva dados pessoais, senhas nem informações reais do seu negócio."
export const SIGN_IN_ERRORS = {
  demoLimit: "Muitas contas de demonstração criadas a partir desta rede hoje. Entre com Google para continuar testando.",
  failure: "Não consegui entrar agora. Tente de novo em instantes.",
} as const
// erro=limite-demo ou code=demo_limit → demoLimit; erro=falha ou qualquer error → failure; senão null.
export function signInErrorMessage(params: { erro?: string; error?: string; code?: string }): string | null
export const DEMO_BANNER_TEXT = "Conta de demonstração. Ela e as conversas são apagadas em 7 dias."
export const DEMO_ACCOUNT_LABEL = "Conta de demonstração"
```

Props dos componentes:

```ts
type SignInPanelProps = {
  googleEnabled: boolean
  error: string | null
  demoAction: () => Promise<void>
  googleAction: () => Promise<void>
}
type AccountMenuProps = { label: string; signOutAction: () => Promise<void> }
type DemoBannerProps = { googleEnabled: boolean; googleAction: () => Promise<void> }
```

Os componentes só importam `src/lib/` e `src/components/`. As actions chegam por props.

O `ChatApp` trata o `401` de `sendMessage` e de `fetchHistory` com `window.location.assign("/entrar")`, antes de qualquer outro tratamento de erro.

### 10. Regra de arquitetura nova

`src/architecture.test.ts` ganha a regra 7: *"only src/infra/auth may import next-auth or @auth/\*"*, com um caso de teste no mesmo estilo das outras regras. O `AGENTS.md` ganha a linha na tabela "Camadas e importações" e a permissão para que `src/app/` (páginas e Server Actions) importe `@/infra/auth`.

### 11. Smoke

`scripts/smoke-checks.ts` ganha estas funções puras, testadas em `smoke-checks.test.ts`:

```ts
// Junta os Set-Cookie (headers.getSetCookie()) num cabeçalho Cookie "a=1; b=2", guardando o último valor de cada nome.
export function mergeCookies(current: string, response: Headers): string
export function checkUnauthenticatedChat(res: SmokeResponse): CheckResult // 401 com { error }
export function checkSignInPage(res: SmokeResponse): CheckResult          // 200, HTML com "Testar como demo"
// Resposta do POST /api/auth/callback/demo: 302/303 para fora de /entrar e um cookie
// *authjs.session-token no Set-Cookie. Redireciona para /entrar?…code=demo_limit → falha com o hint do limite.
export function checkDemoSignIn(res: SmokeResponse): CheckResult
```

Novo fluxo do `scripts/smoke.ts`, com os pedidos em `redirect: "manual"` e o cookie acumulado:

1. `GET /api/health`.
2. `POST /api/chat` sem cookie → `401`.
3. `GET /entrar` → `200`.
4. `GET /api/auth/csrf` (guarda o cookie e o `csrfToken`) e `POST /api/auth/callback/demo` (`application/x-www-form-urlencoded`, `csrfToken` e `callbackUrl=/`) → cookie de sessão.
5. As três mensagens de hoje, agora com o cookie.
6. O histórico, com o cookie.
7. `GET /api/cron/cleanup` sem `Authorization` → `401`.
8. `GET /` com o cookie e os cabeçalhos de segurança.

O smoke nunca imprime o cookie nem o `csrfToken`. Cada rodada gasta uma das 5 demos do IP no dia.

### 12. ADR 0020 e documentação

`docs/adr/0020-login-google-e-conta-demo.md`, com status "Aceito" e data 2026-11-10:

- **Contexto:** identidade para as ondas 3 e 4, autorização real e a demo que precisa continuar a um clique.
- **Decisão:** login obrigatório na web, com Google (Auth.js v5 fixado, JWT sem adapter, contas na tabela `accounts` com SQL puro) e conta demo isolada por clique (7 dias, 5 por IP por dia). Google só onde as URLs são fixas (`localhost` e produção).
- **Alternativas:** manter o link de continuação, e-mail e senha, link mágico, Supabase Auth (exige `supabase-js` e prende a autenticação ao `prod`, com o `dev` no Neon) e uma demo compartilhada (uma pessoa veria as conversas de outra).
- **Consequências:** login obrigatório na web, e-mails guardados (só o `sub` e o e-mail), CLI e eval sem login, dependência beta fixada e confinada a `src/infra/auth/`, e smoke gastando uma demo por rodada.

A ADR 0010 só tem a linha de status trocada, para `Substituído por [0020](0020-login-google-e-conta-demo.md)`. O índice `docs/adr/README.md` ganha a linha da 0020 e atualiza a da 0010.

| Arquivo | O que muda |
|---|---|
| `AGENTS.md` | Stack (Auth.js), "Onde mexer" (linha "Login e sessão": `src/infra/auth/`, `src/app/auth-actions.ts`, `src/app/entrar/`), camadas (decisão 10), "Segurança e privacidade" (o log pode ter o `accountId`, nunca o e-mail; o cookie de sessão é credencial), comandos e variáveis |
| `docs/architecture.md` | Fluxo de autenticação (entrada, cookie, `getAuthenticatedAccount`, 401), tabela `accounts` e rotas `/api/auth/*` |
| `docs/business.md` | Conceitos (conta Google, conta demo), "Como o restaurante usa" (entrar) e a tabela de decisões (0020 no lugar da 0010) |
| `docs/development.md` | Credenciais OAuth locais (cliente do Google com `localhost`), as variáveis novas e como testar sem Google (só a demo) |
| `docs/qa.md` | Verificação manual (demo, sair, limite de demos, Google em `localhost`) e os passos novos do smoke |
| `README.md` | "Como testar": abrir a demo e clicar em "Testar como demo". Variáveis no "Como rodar localmente" |
| `DEPLOY.md` | Passo novo: criar o cliente OAuth no Google Cloud (redirecionamentos de `localhost` e produção). Variáveis na Vercel (`AUTH_SECRET` em Production e Preview; `AUTH_GOOGLE_*` só em Production). Migração antes do merge |
| `.env.example` | `AUTH_SECRET` (gere com `openssl rand -base64 33`), `AUTH_GOOGLE_ID` e `AUTH_GOOGLE_SECRET` comentadas como opcionais |

### Arquivos que a change pode criar ou alterar

O implementador não toca em mais nenhum arquivo.

**Novos:**

- `supabase/migrations/<timestamp>_accounts.sql`
- `src/core/accounts.ts`, `src/core/accounts.test.ts`
- `src/core/request-limits.ts`, `src/core/request-limits.test.ts`
- `src/infra/db/account-repository.ts`
- `src/infra/auth/index.ts`, `src/infra/auth/config.ts`, `src/infra/auth/callbacks.ts`, `src/infra/auth/callbacks.test.ts`, `src/infra/auth/env.ts`, `src/infra/auth/env.test.ts`, `src/infra/auth/next-auth.d.ts`
- `src/app/api/auth/[...nextauth]/route.ts`
- `src/app/entrar/page.tsx`, `src/app/auth-actions.ts`
- `src/components/auth/sign-in-panel.tsx`, `src/components/chat/account-menu.tsx`, `src/components/chat/demo-banner.tsx`, `src/components/ui/dropdown-menu.tsx`
- `src/lib/sign-in.ts`, `src/lib/sign-in.test.ts`
- `docs/adr/0020-login-google-e-conta-demo.md`

**Alterados:**

- `package.json`, `package-lock.json` (só o `next-auth`)
- `src/config.ts`, `src/config.test.ts`, `src/core/types.ts`
- `src/infra/db/mappers.ts`, `src/infra/db/mappers.test.ts`, `src/infra/db/rate-limit-repository.ts`, `src/infra/db/index.ts`, `src/infra/container.ts`
- `src/app/api/_lib/handlers.ts`, `src/app/api/_lib/handlers.test.ts`, `src/app/api/_lib/rate-limit.ts`, `src/app/api/_lib/rate-limit.test.ts`, `src/app/api/_lib/errors.ts`, `src/app/api/_lib/log.ts`
- `src/app/api/chat/route.ts`, `src/app/api/sessions/[id]/messages/route.ts`, `src/app/api/cron/cleanup/route.ts`
- `src/app/page.tsx`, `src/components/chat/chat-app.tsx`
- `src/architecture.test.ts`
- `scripts/smoke.ts`, `scripts/smoke-checks.ts`, `scripts/smoke-checks.test.ts`
- `.env.example`, `AGENTS.md`, `README.md`, `DEPLOY.md`, `docs/architecture.md`, `docs/business.md`, `docs/development.md`, `docs/qa.md`, `docs/adr/README.md`, `docs/adr/0010-link-de-continuacao-em-vez-de-login.md` (só o status)

## Risks / Trade-offs

- **Dependência `beta`** → A versão fica fixada, só uma pasta a importa, e o teste de arquitetura garante isso. Para trocar de biblioteca, basta mexer em `src/infra/auth/`.
- **Uma consulta a mais ao banco por pedido** (`findActive`) → É uma busca por chave primária. A latência do chat é dominada pelo LLM.
- **Callbacks do OAuth nos previews** → Nos previews o Google fica desligado, e a tela mostra só a demo (decisão 4).
- **O limite de demos depende do `x-forwarded-for` chegar ao `authorize`** → A tarefa 4.3 confirma isso. Se não chegar, o implementador para e reporta.
- **Quem está logado ainda lê qualquer conversa pelo UUID** → Isso é igual a hoje e é fechado pela change 2, a próxima da sequência. As duas não devem ir para produção com muito tempo entre uma e outra.
- **O smoke gasta uma demo do IP por rodada** → O limite é de 5 por dia. Está documentado no `qa.md`.

## Migration Plan

1. Aplicar a migração no `dev` (Neon) e verificar no `npm run dev`.
2. Antes do merge, aplicar a migração no `prod` com `db push --remote --yes` (H5 parcial). A migração só acrescenta, então o código em produção continua funcionando.
3. A pessoa cria as variáveis na Vercel. Merge e deploy.
4. A pessoa testa o Google em produção e roda o smoke (ou autoriza o orquestrador).

**Rollback:** reverter o PR. A tabela `accounts` e o check mais amplo podem ficar no banco sem efeito no código antigo.
