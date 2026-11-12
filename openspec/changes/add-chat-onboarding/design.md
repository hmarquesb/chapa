# Design

## Context

- `/` (`src/app/page.tsx`) é um Server Component: autentica com `getAuthenticatedAccount()`, manda para `/perfil` a conta sem plano e monta o cabeçalho com o `AccountMenu` (cliente), que já hospeda o `DeleteAccountDialog` e um `<form>` escondido com a Server Action `signOutOfAccount`.
- `/perfil` (`src/app/perfil/page.tsx`) calcula `firstAccess = account.profile.plan === undefined` e o passa ao `ProfileForm`, que já mostra "Voltar ao chat" só fora do primeiro acesso.
- O `Dialog` do shadcn (`src/components/ui/dialog.tsx`) já tem o overlay com `backdrop-blur-xs`, a armadilha de foco, o Esc e o `role="dialog"` com título.
- A conta é lida a cada pedido por `findActive`, que lista as colunas no `select`. Toda coluna nova entra nos três `returning`/`select` do repositório e no `AccountRow`.

## Goals / Non-Goals

**Goals:** um estado de "já viu" por conta Google, gravado no banco, sem estado em memória entre pedidos e sem `localStorage`.

**Non-Goals:** versionar o card (mostrar de novo quando o texto mudar) e medir quantas pessoas o fecham.

## Decisions

### 1. Coluna `welcome_seen_at` em `accounts`

Migração nova, criada com `npm run db -- migration new accounts_welcome_seen`:

```sql
alter table public.accounts add column welcome_seen_at timestamptz;
comment on column public.accounts.welcome_seen_at is
  'Quando a conta fechou o card de boas-vindas pela primeira vez. Nulo: ainda não fechou. Demo não grava.';
```

Nullable e sem default, então as contas que já existem passam a ver o card uma vez, que é o desejado. Uma marca de tempo, e não um booleano, porque custa o mesmo e ajuda a investigar. *Alternativa descartada:* uma chave dentro do `profile` (JSON): o perfil é dado do restaurante, tem versão e passa pelo parser e pelo prompt, e misturar estado de interface ali exigiria subir o `version`.

### 2. Contratos novos ou alterados

`src/core/types.ts`:

```ts
export type AccountRecord = {
  // …campos atuais…
  welcomeSeenAt: Date | null // nulo até a conta fechar o card; demo nunca grava
}

export interface AccountRepository {
  // …métodos atuais…
  // Grava now() só se ainda estiver nulo (o primeiro registro vale). O id existe: quem chama já autenticou.
  markWelcomeSeen(id: string): Promise<void>
}
```

`src/infra/db/mappers.ts`: `AccountRow` ganha `welcome_seen_at: Timestamp | null`, e `toAccountRecord` o converte como o `expires_at`. O `markWelcomeSeen` usa `coalesce(welcome_seen_at, now())`, o que torna o pedido repetido idempotente sem ler antes.

`src/app/api/_lib/handlers.ts`: `ROUTES.welcome = "/api/account/welcome"` e

```ts
export function createWelcomeSeenHandler(deps: {
  accounts: Pick<AccountRepository, "markWelcomeSeen">
  authenticate: Authenticate
  log?: Log
}): (req: Request) => Promise<Response>
```

Segue o `createDeleteAccountHandler`: `requireAccount` primeiro (401 sem sessão), não lê o corpo, responde `204` com `Cache-Control: no-store`, e os erros passam por `failed`. Não checa o tipo da conta: quem decide não chamar numa demo é a tela, e gravar numa demo seria inofensivo.

`src/app/api/account/welcome/route.ts`: só `POST`, com `runtime = "nodejs"`, `dynamic = "force-dynamic"` e `createLazyHandler`, como o `route.ts` vizinho.

`src/lib/api-client.ts`:

```ts
export function markWelcomeSeen(fetchFn?: typeof fetch): Promise<ApiResult<null>>
```

`POST` sem corpo, `cache: "no-store"`. Reaproveita o tratamento de `204` do `deleteRequest`, que vira um auxiliar que recebe o método.

### 3. Texto do card em `src/lib/welcome.ts`

Constantes exportadas: `WELCOME_TITLE`, `WELCOME_PARAGRAPHS` (Rango e Chapa), `WELCOME_TOPICS_INTRO`, `WELCOME_TOPICS` (a lista), `WELCOME_OUT_OF_SCOPE` e `WELCOME_CONFIRM` ("Entendi"), com o texto exato do cenário "Conteúdo do card" do delta de `chat-ui`. Fica em `src/lib/`, e não em `src/core/messages.ts`, porque só a interface o lê e componentes não importam `src/core/`.

Na mesma pasta, a função pura `shouldOpenWelcome(input: { isDemo: boolean; welcomeSeenAt: Date | null }): boolean` (demo: sempre; Google: só com `welcomeSeenAt === null`), com teste ao lado. A página a chama no servidor; recebe `isDemo` em vez do `AccountKind` para não importar `src/core/` em `src/lib/`.

### 4. Componente `WelcomeDialog`, hospedado no `AccountMenu`

`src/components/chat/welcome-dialog.tsx` (cliente), controlado:

```ts
type WelcomeDialogProps = { open: boolean; onOpenChange: (open: boolean) => void }
```

Só renderiza o `Dialog` com o texto de `src/lib/welcome.ts`, uma lista `<ul>` dos temas, o `ChapaAvatar` no cabeçalho se couber, `DialogFooter` com o botão "Entendi" e `showCloseButton={false}` (o "Entendi" é a saída, e o Esc continua valendo). O conteúdo rola por dentro (`max-h` + `overflow-y-auto`) para caber em 390 × 844. Mesmo visual do `DeleteAccountDialog` (`rounded-3xl shadow-raised`), sem cor fixa.

O `AccountMenu` ganha a prop `welcome: { openOnLoad: boolean; persist: boolean }`, guarda o `open` num `useState(welcome.openOnLoad)` e mostra a opção "Sobre o Chapa" (ícone `InfoIcon` do `lucide-react`, já instalado) como primeiro item, que abre o card. Ao fechar, se `persist` for verdadeiro e o card ainda não tiver sido registrado nesta montagem, chama `markWelcomeSeen()` sem esperar e ignora o resultado (cenário "Falha ao registrar"); um `401` também é ignorado, porque o chat já trata a sessão encerrada na próxima chamada.

*Por que no `AccountMenu`:* a opção de reabrir mora nele, e ele já hospeda um diálogo controlado. Um provider de contexto só para isso seria mais código, e a página é Server Component. *Alternativa descartada:* abrir o card dentro do `ChatApp`, que não conhece a conta nem o menu.

`src/app/page.tsx` passa `welcome={{ openOnLoad: shouldOpenWelcome(...), persist: !isDemo }}`.

### 5. "Voltar para o login" no cabeçalho de `/perfil`

Só com `firstAccess`, a página põe um `<form action={signOutOfAccount}>` com um `Button` `variant="ghost"` `size="sm"`, ícone `ArrowLeftIcon` e o texto "Voltar para o login", acima do logo, no `header`. Fica na página (Server Component), e não no `ProfileForm`, porque o formulário do perfil já é um `<form>` e formulários não se aninham. Reaproveita a mesma Server Action do "Sair", então o comportamento é o do requisito "Sair" de `auth`. O `ProfileForm` não muda.

### 6. Perguntas de exemplo

`EXAMPLE_QUESTIONS` fica com as duas perguntas. A fixture `SHOT_OFF_TOPIC_QUESTION` e as mensagens do smoke continuam com a lasanha: elas testam o fallback digitando a pergunta, não clicando no exemplo.

### 7. Screenshots

A demo abre com o card. Em `scripts/screenshots.ts`, depois de cada `goto(baseUrl)` das capturas do chat, clicar em "Entendi" e esperar o diálogo sumir. Uma captura nova, `boas-vindas`, entra em `SHOT_IDS` (`scripts/screenshots/shots.ts`) e fotografa o card aberto. O `shots.test.ts` só muda se algum teste listar os ids por extenso.

## Arquivos

Criar:
- `supabase/migrations/<timestamp>_accounts_welcome_seen.sql`
- `src/app/api/account/welcome/route.ts`
- `src/lib/welcome.ts` e `src/lib/welcome.test.ts`
- `src/components/chat/welcome-dialog.tsx`

Alterar:
- `src/core/types.ts`
- `src/core/accounts.test.ts` (só os objetos `AccountRecord` dos fakes)
- `src/infra/db/mappers.ts`, `src/infra/db/mappers.test.ts`, `src/infra/db/account-repository.ts`
- `src/app/api/_lib/handlers.ts`, `src/app/api/_lib/handlers.test.ts`
- `src/lib/api-client.ts`, `src/lib/api-client.test.ts`
- `src/components/chat/account-menu.tsx`, `src/components/chat/example-questions.tsx`
- `src/app/page.tsx`, `src/app/perfil/page.tsx`
- `scripts/screenshots.ts`, `scripts/screenshots/shots.ts` (e `shots.test.ts`, se preciso)
- `docs/architecture.md`, seções "Front-end" (o item da página `/`: duas perguntas de exemplo e o card; o item de `/perfil`: "Voltar para o login" no primeiro acesso e o menu com "Sobre o Chapa"), "Back-end" (lista "Rotas:", a rota nova) e "Banco de dados" (a coluna `welcome_seen_at` na lista de `accounts`)
- `docs/qa.md`, seção "Verificação manual local", itens **Login** e **Perfil**

## Risks / Trade-offs

- [O deploy chega antes da migração] → toda rota protegida falha, porque o `select` pede a coluna nova. Mitigação: `db push` no `prod` antes do merge, registrado no PR como pendência bloqueante.
- [Demo vê o card a cada volta ao chat, inclusive depois de salvar o perfil] → escolha da pessoa; o "Entendi" é um clique, e a demo é usada por pouco tempo.
- [Conta Google fecha o card e recarrega antes de o `POST` terminar] → o card volta uma vez. Aceito: o registro é um pedido pequeno, e a regra "Falha ao registrar" já prevê o caso.
- [Conta criada por "Voltar para o login" fica no banco sem plano] → segue a expiração de 180 dias sem acesso; não guarda dado além do `sub` e do e-mail.

## Migration Plan

1. Orquestrador: `db push` da migração no `dev` (comandos do `DEPLOY.md`, "Banco `dev` no Neon") antes da verificação manual.
2. Antes do merge: `db push` no `prod` (checkpoint H5, autorizado). A coluna nova é nullable, e o código atual a ignora, então a migração pode ir antes do código sem quebrar nada.
3. Rollback: reverter o código basta. A coluna pode ficar; removê-la exigiria outra migração.
