# Design

## Context

Esta change parte do estado que a `add-rango-design-tokens` deixa:

- Tokens em hex no `globals.css` (claro em `:root`, escuro em `.dark`), espelhados em `src/lib/palette.ts`, com `bg-cinnamon`, `text-cinnamon-foreground`, `text-cinnamon-text`, `bg-overlay`, `shadow-soft`, `shadow-raised`, `animate-message-in`, `animate-thinking-dot` e `--motion-thinking` disponíveis. O `prefers-reduced-motion` já zera animações e transições globalmente.
- `font-heading` é a Bricolage Grotesque (600 e 800) e `font-sans`, a Figtree.
- `src/design-tokens.test.ts` falha com qualquer cor fixa em `src/components` e `src/app`.
- `ThemeToggle` no canto de `/entrar` e `ThemeMenuGroup` no menu da conta.

E do código atual:

- O cabeçalho do chat (`src/app/page.tsx`) tem o `<h1>` "Chapa", o subtítulo e o `ProfileSummary`; o rodapé é um `<footer>` com o texto e o link "Privacidade" escritos ali. A `/entrar` põe o link "Privacidade" dentro do `SignInPanel`; o `/perfil`, num `<p>` no fim da página; a `/privacidade` não tem rodapé.
- A bolha do usuário é `bg-primary` (vinho cheio). A resposta é um `Card`; o fallback e os bloqueios, um `Alert` com `InfoIcon` ou `ShieldAlertIcon`. O "Digitando…" é um `<p className="animate-pulse">` dentro do `role="log"` com `aria-live="polite"`, em `message-list.tsx`.
- Não há teste de componente (o Vitest roda em `node`, só `*.test.ts`).

## Goals / Non-Goals

**Goals:**

- As telas mostram a marca, e o comportamento, os textos (exceto o indicador e o rodapé) e a acessibilidade de hoje continuam iguais.
- O ícone do Chapa tem uma fonte única de geometria, que a change 3 reaproveita para exportar o SVG.
- As screenshots saem sempre do mesmo estado, sem custo de API.

**Non-Goals:**

- Mudar componentes de `src/components/ui/` (a mudança vem dos tokens e das classes nos componentes de tela).
- Guardar screenshots no repositório.

## Decisions

### 1. Componentes de marca (contratos)

```ts
// src/lib/chapa-icon.ts — geometria do ícone, sem React
export const CHAPA_ICON: {
  viewBox: "0 0 24 24"
  strokeWidth: 2
  transform: "rotate(40 12 12)" // a espátula inteira, inclinada
  paths: readonly string[]
}
// paths, nesta ordem (lâmina, duas fendas, pescoço, cabo):
// "M7.5 2.5h9a1.5 1.5 0 0 1 1.5 1.5v6a3 3 0 0 1-3 3h-6a3 3 0 0 1-3-3V4a1.5 1.5 0 0 1 1.5-1.5z"
// "M10 5.5v4"
// "M14 5.5v4"
// "M12 13v3"
// "M12 16a1.5 1.5 0 0 1 1.5 1.5V21a1.5 1.5 0 0 1-3 0v-3.5A1.5 1.5 0 0 1 12 16z"

// src/components/brand/rango-logo.tsx (server component)
export function RangoLogo(props: { size?: "sm" | "md" | "lg"; className?: string }): JSX.Element

// src/components/brand/chapa-avatar.tsx (server component)
export function ChapaIcon(props: SVGProps<SVGSVGElement>): JSX.Element // stroke="currentColor", fill="none", linecap e linejoin round
export function ChapaAvatar(props: { size?: "sm" | "md"; decorative?: boolean; className?: string }): JSX.Element

// src/components/brand/thinking-indicator.tsx (server component)
export function ThinkingIndicator(): JSX.Element

// src/components/brand/site-footer.tsx (server component)
export function SiteFooter(props: { note?: string }): JSX.Element
```

- **Ícone:** a geometria acima é o desenho aprovado na proposta (lâmina de frente reta, cantos de trás arredondados, duas fendas, pescoço curto e cabo em cápsula, inclinados 40°). O `ChapaIcon` só a desenha; o implementador não redesenha.
- **`RangoLogo`:** um `<span role="img" aria-label="Rango" translate="no">` com "rango" em `font-heading font-extrabold tracking-tight text-primary` e o "." em `text-cinnamon`. O ponto é decorativo: o contraste de 2,7 : 1 da canela não conta, porque o nome acessível já é "Rango". Tamanhos: `sm` (`text-2xl`, cabeçalho), `md` (`text-4xl`), `lg` (`text-5xl`, entrada).
- **`ChapaAvatar`:** círculo `bg-cinnamon text-cinnamon-foreground`, `size-7` com ícone de 16 px (`sm`) ou `size-9` com ícone de 20 px (`md`). `decorative` (padrão `false`) liga o `aria-hidden`; sem ele, `role="img" aria-label="Chapa"`.
- **`ThinkingIndicator`:** `ChapaAvatar size="sm" decorative` + três pontos `animate-thinking-dot` com atraso escalonado (0, 0,2 e 0,4 s), dentro de `motion-safe:`; o texto "Chapa está pensando…" fica `motion-safe:sr-only` e visível com movimento reduzido, quando os pontos ficam `motion-reduce:hidden`. Ele continua dentro do `role="log"`, que já anuncia o texto. O `aria-busy` atual não muda.
- **`SiteFooter`:** `<footer>` com "Rango é uma empresa fictícia, criada para um projeto de estudo, sem afiliação com nenhuma empresa de delivery.", depois o `note` (quando há) e o link "Privacidade". A constante do texto vai para `src/lib/sign-in.ts`, ao lado das outras constantes de texto fixo da interface (`FICTIONAL_COMPANY_NOTICE`). O chat passa `note="As conversas são apagadas depois de 30 dias sem uso. Não envie dados pessoais."`.

### 2. Onde cada tela muda

| Tela ou componente | Mudança |
|---|---|
| `src/app/page.tsx` | `RangoLogo size="sm"` acima do `<h1>` "Chapa" (que passa a `font-extrabold`); o `<footer>` vira `SiteFooter` com `note` |
| `src/app/entrar/page.tsx` | `RangoLogo size="lg"` acima do `<h1>`; `SiteFooter` no fim |
| `src/components/auth/sign-in-panel.tsx` | aviso de privacidade num cartão suave (`bg-card shadow-soft rounded-2xl`); o link "Privacidade" sai daqui (vai para o rodapé) |
| `src/app/perfil/page.tsx`, `src/app/privacidade/page.tsx` | `RangoLogo size="sm"` como link para `/` no topo; `SiteFooter` no lugar do link solto (o `/perfil`) ou no fim (a `/privacidade`) |
| `message-item.tsx` | bolha do usuário `bg-secondary text-secondary-foreground` com `rounded-3xl rounded-br-md`; respostas numa linha com `ChapaAvatar decorative` à esquerda; cartão com `shadow-soft rounded-3xl rounded-tl-md`; selos de fonte `bg-accent text-accent-foreground`; fallback em `bg-muted` com `InfoIcon` em `text-muted-foreground`, bloqueios em `bg-accent` com `ShieldAlertIcon` em `text-cinnamon-text`; o `<li>` ganha `animate-message-in` |
| `message-list.tsx` | o "Digitando…" vira `ThinkingIndicator`; a moldura da conversa em `bg-card/60 rounded-3xl` |
| `composer.tsx` | campo `rounded-3xl` com `shadow-soft`, e `shadow-raised` no foco; botão "Enviar" arredondado |
| `conversation-list.tsx` | item aberto em `bg-accent`, hover em `bg-accent/60`, cantos `rounded-2xl` |
| `demo-banner.tsx` | `bg-accent text-accent-foreground rounded-2xl`, sem borda (não parece erro) |
| `account-menu.tsx`, `profile-summary.tsx`, `profile-form.tsx`, `status-banner.tsx`, `delete-account-dialog.tsx`, `delete-conversation-dialog.tsx`, `example-questions.tsx` | só classes de token (raio, sombra, `font-heading` nos títulos dos diálogos, perguntas de exemplo como pílulas `rounded-full`) |

- Os componentes que hoje são de servidor continuam de servidor. O `ChatApp` não muda de lógica.
- Cada tela passa pela skill `web-design-guidelines` antes do fim do grupo.

### 3. Script de screenshots

```
npm run screenshots -- --url http://localhost:3000 [--out .screenshots] [--only entrada,chat]
```

- `scripts/screenshots/shots.ts` (puro, com teste): `parseScreenshotArgs(argv)` e `buildShotPlan(only?)`, que devolve a lista `{ id, theme: "light" | "dark", viewport: "desktop" | "mobile", file }` com os ids `entrada`, `chat`, `demo`, `menu`, `perfil`, `avisos`. `desktop` é 1280 × 800 e `mobile`, 390 × 844. O arquivo é `<id>-<tema>-<viewport>.png`. Um `--only` com id desconhecido é erro, com a lista dos válidos.
- `scripts/screenshots/fixtures.ts`: três `ChatResponse` fixos (uma resposta `answered` sobre repasse com as fontes `02-repasse-financeiro.md` e `01-planos-e-taxas.md`, um `fallback` com o `FALLBACK_MESSAGE` e um `blocked_input`) e a lista de conversas de exemplo, no formato de `src/lib/types.ts`. O texto da resposta é fixo e fictício, coerente com a base.
- `scripts/screenshots.ts`: abre o Chromium, entra como demo **uma vez** e guarda a sessão só em memória (`context.storageState()` sem caminho de arquivo, nunca impressa). Para cada tema e viewport, abre um contexto com essa sessão, define `chapa-tema` com `addInitScript`, intercepta `POST /api/chat` e `GET /api/sessions` com `page.route` e tira as fotos do plano. A `entrada` usa um contexto sem sessão. Sai com código 1 se o servidor não responde ou se o login demo falha.
- A pasta `.screenshots/` entra no `.gitignore`. As imagens vão para a revisão do PR (pendência humana, porque o `gh` não anexa imagens).
- `package.json`: `"screenshots": "node --conditions=react-server --env-file-if-exists=.env.local --import tsx scripts/screenshots.ts"` (o `react-server` porque as fixtures importam o `FALLBACK_MESSAGE` de `src/core/messages.ts`) e o `playwright` em `devDependencies`, com versão exata.

### 4. Arquivos que podem ser criados ou alterados

- Novos: `src/lib/chapa-icon.ts`, `src/components/brand/rango-logo.tsx`, `src/components/brand/chapa-avatar.tsx`, `src/components/brand/thinking-indicator.tsx`, `src/components/brand/site-footer.tsx`
- `src/lib/sign-in.ts` (só a constante `FICTIONAL_COMPANY_NOTICE`)
- `src/app/page.tsx`, `src/app/entrar/page.tsx`, `src/app/perfil/page.tsx`, `src/app/privacidade/page.tsx`
- `src/components/auth/sign-in-panel.tsx` e os componentes de `src/components/chat/` da tabela da decisão 2
- Novos: `scripts/screenshots.ts`, `scripts/screenshots/shots.ts`, `scripts/screenshots/shots.test.ts`, `scripts/screenshots/fixtures.ts`
- `package.json`, `package-lock.json`, `.gitignore`
- `docs/architecture.md`, seção "Front-end": a pasta `src/components/brand/` e a relação Rango (marca) × Chapa (assistente)
- `docs/development.md`, seção "Front-end": os componentes de marca e quando usá-los; seção "Scripts locais": `npm run screenshots` e o `npx playwright install chromium`
- `docs/qa.md`, seção "Verificação manual local": as screenshots nos dois temas e tamanhos e o **checklist de originalidade** (a paleta não usa vermelho, laranja vivo, amarelo ou verde-vivo como cor principal; o logo e o ícone não lembram nenhuma empresa real de delivery; nenhum nome, ícone ou ilustração de empresa real; revisado lado a lado com as marcas de delivery mais conhecidas no Brasil)
- `AGENTS.md`: bloco "Comandos" (`npm run screenshots`, com ⚠️ "usa o `dev` e cria 1 conta demo") e a linha "Interface" da tabela "Onde mexer" (acrescentar `src/components/brand/`)
- `openspec/changes/apply-rango-brand-to-screens/tasks.md` (marcar as tarefas)

## Risks / Trade-offs

- **O ícone pode não agradar** → a geometria está num arquivo só, e trocar o desenho é trocar as strings de `CHAPA_ICON`. A change 3 exporta o que estiver lá.
- **A bolha do usuário em linho escuro tem menos contraste visual com o fundo** do que o vinho cheio → o alinhamento à direita, a ausência de avatar e o cartão com sombra na resposta separam os dois lados. As screenshots decidem.
- **O script quebra se um texto da tela mudar** → os seletores usam os nomes acessíveis dos botões ("Testar como demo", "Menu da conta"), que as specs fixam.
- **A conta demo criada pelo script ocupa uma das 5 por IP por dia** → uma por rodada. Se o limite estourar, o script sai com o erro da tela de entrada.
