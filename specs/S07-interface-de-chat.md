# S07 — Interface de chat

| Campo | Valor |
|---|---|
| **ID** | S07 |
| **Status** | 🟢 Concluída |
| **Depende de** | S00 (código). Para o teste manual de ponta a ponta, também S06 |
| **Chamadas reais de API** | Só com autorização: teste manual no navegador contra a API local (algumas perguntas) |

## Escopo

Cria a página única do Chapa: chat, fontes em badges, perguntas de exemplo, formulário de perfil do restaurante, sessão anônima com link de continuação e rodapé com o aviso de projeto não oficial. O navegador só fala com a nossa API.

**Entrega:**
- `src/app/page.tsx` e `src/app/layout.tsx` definitivos.
- Componentes em `src/components/chat/` e os componentes do shadcn que eles usam.
- Funções puras de sessão, estado do chat e formatação em `src/lib/`, com testes.
- Cliente HTTP tipado em `src/lib/api-client.ts`.

**Fora do escopo:**
- Rotas da API (S06). A interface consome o contrato HTTP descrito abaixo.
- Streaming, login, markdown renderizado, múltiplas páginas.

**Arquivos que podem ser criados ou alterados:**
- `src/app/page.tsx`, `src/app/layout.tsx`, `src/app/globals.css`
- `src/components/chat/*.tsx`
- `src/components/ui/*` (só via `npx shadcn@latest add`)
- `src/lib/api-client.ts`
- `src/lib/session-id.ts` (+ `.test.ts`)
- `src/lib/chat-state.ts` (+ `.test.ts`)
- `src/lib/format.ts` (+ `.test.ts`)
- `src/lib/profile-storage.ts` (+ `.test.ts`)
- `package.json` e `package-lock.json` (só o que o `shadcn add` alterar)
- Remover `src/components/chat/.gitkeep`

**Não tocar:**
- `src/app/api/`, `src/core/`, `src/infra/`, `src/config.ts`
- `src/lib/types.ts` (contrato da S00)
- `next.config.ts`, `vercel.json` (S06)

## Contexto

- Seção do `ARCHITECTURE.md`: "Front-end".
- Problema que resolve: quem avalia o projeto precisa testar a demo sem instalar nada e sem criar conta.
- Decisões já tomadas:
  - Uma página só. Sem login: cada navegador tem uma sessão anônima, com `sessionId` gerado por `crypto.randomUUID()` e guardado no `localStorage`.
  - Link de continuação `/?sessao=<id>` em vez de login. Quem tem o link lê a conversa. A sessão expira depois de 7 dias sem uso.
  - Sem streaming. A resposta aparece inteira depois do guardrail de saída.
  - Datas com `Intl.DateTimeFormat`. Sem date-fns.
  - Todo texto em PT-BR. Sem logo, nome ou cores de empresas reais. Paleta neutra.
  - O navegador só chama `/api/*`, nunca o Gemini nem o Supabase.
  - `src/components/` e `src/lib/` nunca importam `src/core/` nem `src/infra/` (o teste de arquitetura da S00 cobra).

### Contratos

**Usa** (criados na S00, em `src/lib/types.ts`):

```ts
export type ReplyStatus = "answered" | "fallback" | "blocked_input" | "blocked_output"
export type RestaurantProfile = { name?: string; plan?: string; cuisine?: string; city?: string; hours?: string }
export const PROFILE_FIELDS = ["name", "plan", "cuisine", "city", "hours"] as const
export const PROFILE_FIELD_MAX_CHARS = 60
export type ChatRequest = { sessionId: string; message: string; profile?: RestaurantProfile }
export type ChatResponse = { status: ReplyStatus; answer: string; sources: string[] }
export type HistoryMessage = {
  id: number; role: "user" | "assistant"; content: string
  status: ReplyStatus | null; sources: string[]; createdAt: string
}
export type SessionHistoryResponse = { sessionId: string; profile: RestaurantProfile; messages: HistoryMessage[] }
export type ApiErrorResponse = { error: string }
```

Contrato HTTP (implementado pela S06):

```
POST /api/chat                     → 200 ChatResponse | 4xx/5xx ApiErrorResponse
GET  /api/sessions/{id}/messages   → 200 SessionHistoryResponse | 404 (sessão não existe) | 400
```

**Dona:**

```ts
// src/lib/api-client.ts
export type ApiResult<T> = { ok: true; data: T } | { ok: false; status: number; error: string }
export function sendMessage(req: ChatRequest, fetchFn?: typeof fetch): Promise<ApiResult<ChatResponse>>
export function fetchHistory(sessionId: string, fetchFn?: typeof fetch): Promise<ApiResult<SessionHistoryResponse>>

// src/lib/session-id.ts
export const SESSION_STORAGE_KEY = "chapa:sessionId"
export const SESSION_QUERY_PARAM = "sessao"
export function resolveInitialSession(input: {
  queryValue: string | null
  storedValue: string | null
  newId: () => string
}): { sessionId: string; source: "link" | "storage" | "new" }
export function buildContinueLink(origin: string, sessionId: string): string // `${origin}/?sessao=${id}`
export function isUuid(value: string): boolean

// src/lib/chat-state.ts
export type UiMessage = {
  key: string
  role: "user" | "assistant"
  content: string
  status: ReplyStatus | null
  sources: string[]
  createdAt: string
  pending?: boolean
}
export type ChatState = { messages: UiMessage[]; sending: boolean; error: string | null; notice: string | null }
export type ChatAction =
  | { type: "history_loaded"; messages: HistoryMessage[] }
  | { type: "send_started"; text: string; now: string }
  | { type: "send_succeeded"; reply: ChatResponse; now: string }
  | { type: "send_failed"; error: string }
  | { type: "reset"; notice?: string }
  | { type: "dismiss" }
export const initialChatState: ChatState
export function chatReducer(state: ChatState, action: ChatAction): ChatState

// src/lib/format.ts
export function formatTime(iso: string, timeZone?: string): string // "14:05", pt-BR

// src/lib/profile-storage.ts
export const PROFILE_STORAGE_KEY = "chapa:perfil"
export function sanitizeProfile(input: unknown): RestaurantProfile // só PROFILE_FIELDS, string, aparado, ≤ 60
```

## Requisitos funcionais

### RF1. Layout da página

Uma coluna central (até ~720px) com:
1. Cabeçalho com o nome "Chapa" e uma frase: "Tire dúvidas sobre taxas, repasse, cancelamentos, cardápio e avaliações."
2. Formulário de perfil recolhível (RF5).
3. Lista de mensagens.
4. As 3 perguntas de exemplo (RF6), visíveis quando a conversa está vazia.
5. Campo de texto e botão "Enviar".
6. Botões "Continuar depois" (RF4) e "Nova conversa" (RF3).
7. Rodapé: "Projeto de estudo, não oficial e sem afiliação com nenhuma empresa de delivery. As conversas são apagadas depois de 7 dias sem uso. Não envie dados pessoais."

`layout.tsx`: `<html lang="pt-BR">`, `metadata` com título "Chapa" e descrição em PT-BR. Fonte do sistema ou uma fonte do `next/font`, sem marca.

- **Critério de aceite:** Dado `npm run dev`, quando a pessoa abre a página numa largura de 360px, então todos os itens aparecem sem rolagem horizontal.

### RF2. Envio e exibição de mensagens

- Enter envia, Shift+Enter quebra a linha. O botão e o campo ficam desabilitados durante o envio, e aparece "Digitando…".
- A mensagem do usuário aparece na hora (estado `pending`). A do assistente aparece quando a API responde.
- Resposta `answered`: texto e, embaixo, um `Badge` por fonte com o nome do arquivo sem extensão e sem o prefixo numérico (`02-repasse-financeiro.md` → `repasse financeiro`). O nome completo fica no `title`.
- Respostas `fallback`, `blocked_input` e `blocked_output`: estilo de aviso (por exemplo, `Alert` neutro), sem badges.
- Cada mensagem mostra a hora com `formatTime`.
- Texto renderizado como texto puro, com `whitespace-pre-wrap`. Nunca `dangerouslySetInnerHTML`.
- Erro da API (`ok: false`): a mensagem `error` da API aparece num aviso acima do campo, a mensagem pendente do usuário sai da lista e o texto volta para o campo. Falha de rede: "Não consegui falar com o servidor. Confira sua conexão."
- A lista rola para a última mensagem. A região da lista tem `aria-live="polite"`.

- **Critério de aceite:** Dado o `chatReducer`, então `send_started` acrescenta 1 mensagem `pending` e liga `sending`; `send_succeeded` confirma a do usuário e acrescenta a do assistente com `status` e `sources`; `send_failed` remove a pendente, desliga `sending` e preenche `error`.

### RF3. Sessão anônima

Ao montar a página (só no cliente):
1. `resolveInitialSession` com o valor de `?sessao=` e o do `localStorage`. Prioridade: link válido → `localStorage` válido → novo id. Valores que não são UUID são ignorados.
2. Grava o id escolhido no `localStorage`.
3. Se veio do link, remove o parâmetro da URL com `history.replaceState`, sem recarregar.
4. Se a origem é `link` ou `storage`, chama `fetchHistory`. 200 → carrega mensagens e perfil. 404 → gera outro id, grava, e mostra o aviso "Esta conversa não existe mais. Começamos uma nova." (via `notice`). Outros erros → mostra o erro e mantém a sessão.

"Nova conversa": gera outro id, grava no `localStorage` e limpa a tela (`reset`). O perfil continua preenchido.

- **Critério de aceite:** Dado `resolveInitialSession`, então: `{ queryValue: <uuid A>, storedValue: <uuid B> }` → A com `source: "link"`; `{ queryValue: "abc", storedValue: <uuid B> }` → B com `source: "storage"`; `{ null, null }` → novo id com `source: "new"`.

### RF4. "Continuar depois"

O botão abre um `Dialog` com o link `buildContinueLink(window.location.origin, sessionId)` num campo somente leitura, um botão "Copiar link" (Clipboard API, com fallback de selecionar o texto) e o texto: "Guarde este link para continuar a conversa em outro dispositivo. Quem tiver o link consegue ler a conversa. Ela é apagada depois de 7 dias sem uso." Ao copiar, mostra "Link copiado".

- **Critério de aceite:** *(Manual)* Copiar o link, abrir numa janela anônima e ver a mesma conversa carregada, com o `?sessao=` removido da barra de endereço.

### RF5. Perfil do restaurante

Formulário recolhível ("Perfil do restaurante (opcional)") com os campos: Nome do restaurante, Plano, Tipo de cozinha, Cidade e Horário de funcionamento. Cada um com `maxLength` de 60 e `label` associado. O campo Plano é texto livre (sem lista de planos, para não inventar nomes). O perfil fica no `localStorage` (`PROFILE_STORAGE_KEY`, passando por `sanitizeProfile`) e é enviado em todo `POST /api/chat` quando tem pelo menos um campo preenchido. Ao carregar o histórico, se o perfil do servidor não estiver vazio, ele preenche o formulário.

- **Critério de aceite:** Dado `sanitizeProfile({ name: "  Bella ", plan: 3, extra: "x", city: "a".repeat(80) })`, então devolve `{ name: "Bella", city: <60 caracteres> }`.

### RF6. Perguntas de exemplo

Três botões que enviam a pergunta direto:
- "Quando o repasse cai na minha conta?"
- "O cliente cancelou e eu perdi a comida, e agora?"
- "Me passa uma receita de lasanha?" (mostra o fallback de fora do escopo)

- **Critério de aceite:** *(Manual)* Clicar em cada uma envia a pergunta e mostra a resposta. A terceira mostra o aviso de fallback.

### RF7. Componentes shadcn

Adicione só os que usar, com `npx shadcn@latest add`: `button`, `textarea`, `input`, `label`, `badge`, `card`, `alert`, `dialog` e `collapsible`. Se precisar de outro, registre o motivo no relatório.

- **Critério de aceite:** Dado `src/components/ui/`, então só há os componentes listados (ou os justificados).

### RF8. Tema e acessibilidade

Paleta neutra própria (tons de cinza e um acento discreto), sem cores associadas a marcas de delivery. Respeita `prefers-color-scheme` (modo escuro). Contraste AA nos textos. Navegação completa pelo teclado, foco visível, botões com rótulos em PT-BR.

- **Critério de aceite:** *(Manual)* Com o sistema em modo escuro, a página fica escura e legível. Dá para enviar uma mensagem, abrir o perfil e copiar o link só com o teclado.

## Requisitos não funcionais

- **RNF1. Testes:** `npm test`, `npm run typecheck` e `npm run lint` passam sem rede. As funções de `src/lib/` têm testes. *Verificação:* rodar com `env -i PATH="$PATH" HOME="$HOME"`.
- **RNF2. Fronteira:** `src/components/` e `src/lib/` não importam `@/core`, `@/infra`, `@google/genai` nem `postgres`. *Verificação:* teste de arquitetura da S00.
- **RNF3. Rede:** o código do cliente só chama URLs relativas que começam com `/api/`. *Verificação:* `grep -rn "fetch(" src/components src/lib src/app/page.tsx` mostra só o `api-client.ts`, com caminhos `/api/...`.
- **RNF4. Segurança:** sem `dangerouslySetInnerHTML`. *Verificação:* `grep -rn "dangerouslySetInnerHTML" src` volta vazio.
- **RNF5. Build:** `npm run build` passa sem variáveis de ambiente. *Verificação:* rodar o build.
- **RNF6. Marca:** sem logo e sem nome de empresa real na interface. *Verificação:* leitura dos textos e da paleta.

## Você deve

- Seguir as regras do `AGENTS.md` e as camadas descritas no `ARCHITECTURE.md`.
- Escrever o teste antes da implementação em `session-id`, `chat-state`, `format`, `profile-storage` e `api-client` (com `fetch` falso).
- Marcar com `"use client"` só os componentes que precisam (estado, `localStorage`, eventos).
- Tratar o acesso ao `localStorage` com `try/catch` (modo privado pode bloquear).
- Rodar `npm test`, `npm run typecheck`, `npm run lint` e `npm run build` antes de entregar.
- Entregar um relatório com: arquivos alterados, cada critério de aceite com a evidência (comando + saída resumida ou captura descrita), desvios da spec e pendências humanas.

## Você não deve

- Editar arquivos fora da lista de "Arquivos que podem ser criados ou alterados".
- Adicionar dependências além das que o `shadcn add` instala (nada de date-fns, bibliotecas de markdown ou de estado).
- Importar `src/core/` ou `src/infra/`.
- Chamar o Gemini, o Supabase ou qualquer domínio externo a partir do navegador.
- Usar logo, nome ou cores de empresas reais.
- Fazer commit ou push.

## Tecnologias

| Tecnologia | Uso nesta spec |
|---|---|
| Next.js (App Router) e React | Página e componentes |
| Tailwind CSS | Estilos e modo escuro |
| shadcn/ui (novos componentes) | Button, Textarea, Input, Label, Badge, Card, Alert, Dialog, Collapsible |
| `Intl.DateTimeFormat` | Hora das mensagens |
| `crypto.randomUUID()` (navegador) | Id da sessão |
| Vitest | Testes das funções de `src/lib/` |
