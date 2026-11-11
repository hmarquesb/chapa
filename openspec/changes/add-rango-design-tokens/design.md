# Design

## Context

- `src/app/globals.css` tem os tokens do shadcn (`radix-nova`, base `neutral`) em `oklch`, o raio `0.625rem`, `--font-heading: var(--font-sans)` e o tema escuro num `@media (prefers-color-scheme: dark)`, com `@custom-variant dark` no mesmo media. Não há fonte carregada: o `html` usa `font-sans`, a fonte do sistema.
- `src/app/layout.tsx` não tem `<head>` próprio; o `suppressHydrationWarning` está só no `<body>`.
- Os componentes do shadcn já usam a variante `dark:` (por exemplo `dark:bg-input/30`), então a troca para uma classe vale para eles sem editá-los.
- As únicas cores fixas em `src/components` e `src/app` são `bg-black/10` no overlay de `ui/dialog.tsx` e `ui/sheet.tsx`.
- O Vitest roda em `node`, só com `*.test.ts`: não há teste de componente nem DOM. O `src/architecture.test.ts` é o modelo de teste que varre arquivos.
- O `localStorage` não é usado hoje em `src/` (a change `move-profile-to-account` o tirou do perfil).

## Goals / Non-Goals

**Goals:**

- Trocar um tom da paleta seja editar um par de linhas (o `globals.css` e o espelho em `palette.ts`), com o teste dizendo na hora se o tom passa no AA.
- O tema certo aparece na primeira pintura, em qualquer rota, sem dependência nova.

**Non-Goals:**

- Retematizar componentes um a um (change 2). Aqui só os tokens mudam, mais o overlay dos diálogos.
- Converter os tokens para `oklch`. Ficam em hex, que é o que a `/marca` mostra e o que o teste lê sem conversão.

## Decisions

### 1. Paleta final (hex), nos dois temas

| Token | Claro | Escuro |
|---|---|---|
| `background` | `#FAF5F0` linho | `#1D1517` |
| `foreground`, `card-foreground`, `popover-foreground`, `secondary-foreground`, `accent-foreground`, `sidebar-foreground`, `sidebar-accent-foreground` | `#2A1E22` ameixa | `#F3E9E4` |
| `card` | `#FFFCF8` | `#271D20` |
| `popover` | `#FFFCF8` | `#2A1F23` |
| `primary`, `ring`, `sidebar-primary`, `sidebar-ring` | `#7A2E3B` vinho | `#CF7686` rosa-vinho |
| `primary-foreground`, `sidebar-primary-foreground` | `#FFFFFF` | `#1D1517` |
| `secondary`, `muted` | `#F2E8DF` | `#33272B` |
| `muted-foreground` | `#6B5A5F` | `#B3A2A6` |
| `accent`, `sidebar-accent` | `#F5E3CF` canela clara | `#3D2C24` |
| `destructive` | `#B23B1E` tijolo | `#E98A6C` |
| `border`, `sidebar-border` | `#E8DAD0` | `#3A2D31` |
| `input` | `#977D84` | `#7D6A6F` |
| `sidebar` | `#F5EDE6` | `#221A1C` |
| `cinnamon` (novo) | `#C98B4E` canela | `#D9A06A` |
| `cinnamon-foreground` (novo) | `#2A1E22` | `#1D1517` |
| `cinnamon-text` (novo) | `#9A5F2A` | `#D9A06A` |
| `overlay` (novo) | `#2A1E2266` | `#0E0A0BB3` |
| `chart-1` a `chart-5` | `#7A2E3B`, `#C98B4E`, `#B5717D`, `#8C7A6B`, `#4A3439` | `#CF7686`, `#D9A06A`, `#E3A9B3`, `#B8A595`, `#8E6A72` |

Contrastes calculados (WCAG 2.x): claro `foreground/background` 14,8; `muted-foreground/muted` 5,3; `primary-foreground/primary` 9,2; `cinnamon-text/background` 4,8; `destructive/background` 5,5; `input/background` 3,5. Escuro: `primary-foreground/primary` 5,6; `primary/card` 5,1; `destructive/background` 7,1; `input/card` 3,3. O rosa-vinho do PRD (`#C76A7A`) ficava com 4,5 sobre o cartão escuro, no limite, e foi clareado para `#CF7686`. O PRD não fixava a borda dos campos; com `#977D84`, ela passa nos 3 : 1.

- **Tijolo no erro:** o vinho tem matiz de ~350° e o tijolo, de ~12° (~14° no escuro), mais claro e mais alaranjado. O teste exige pelo menos 20° de distância de matiz (HSL) entre `destructive` e `primary`, nos dois temas.
- **`--accent` em canela clara, canela cheia em `--cinnamon`** (desvio do PRD): o shadcn usa `bg-accent` no hover e no foco dos itens de menu e dos botões `ghost` e `outline`. Com a canela cheia, todo hover viraria um bloco caramelo. A canela cheia fica no token próprio, para o avatar, os selos e o ponto do logo (change 2), e a canela clara ainda dá o tom quente ao hover e à faixa de demo.
- **Hex, não `oklch`:** o teste de contraste lê hex direto, e a `/marca` mostra hex. As transparências (`overlay`) usam hex de 8 dígitos.

### 2. Tipografia, forma, sombra e movimento

- **Fontes:** `Bricolage_Grotesque` (pesos 600 e 800) e `Figtree` (400, 500 e 600) de `next/font/google`, `subsets: ["latin"]`, `display: "swap"`, expostas como `--font-bricolage` e `--font-figtree` no `<html>`. No `@theme inline`, `--font-sans: var(--font-figtree)` e `--font-heading: var(--font-bricolage)`.
- **Raio:** `--radius: 1rem`, com os derivados atuais (`* 0.6` a `* 2.6`) mantidos. O `rounded-lg` do botão e do campo do shadcn, de altura `h-8`, vira pílula. Os tamanhos `xs`/`sm` do botão têm teto próprio (`min(var(--radius-md), 12px)`) e ficam como estão.
- **Sombras:** `--shadow-soft` (cartões e bolhas) e `--shadow-raised` (menus, diálogos e o campo de mensagem em foco), em tons de ameixa no claro e de quase-preto no escuro, definidas por tema e expostas no `@theme inline` como `shadow-soft` e `shadow-raised`.
- **Movimento:** `--motion-fast: 200ms` e `--motion-thinking: 1.2s` no `:root`; os `@keyframes` `message-in` (fade com subida de 4 px) e `thinking-dot` (opacidade e escala) e os utilitários `animate-message-in` e `animate-thinking-dot` no `@theme`. Um bloco `@media (prefers-reduced-motion: reduce)` zera `animation` e `transition` em `*`, `::before` e `::after`.
- **Transição de tema:** só durante a troca. O `applyTheme` põe a classe `theme-changing` no `<html>` por ~250 ms, e o CSS dessa classe aplica `transition` de `background-color`, `border-color` e `color` em `--motion-fast` a todos os elementos. Uma transição permanente em `*` atrasaria todo hover da interface.

### 3. Tema por classe, com um script próprio

**Por que não `next-themes`:** seria uma dependência para ~20 linhas de lógica, e a regra do projeto é não acrescentar dependências sem necessidade. O script próprio também fica testável como função pura.

Contratos em `src/lib/theme.ts` (sem `"use client"`, sem React):

```ts
export const THEME_PREFERENCES = ["light", "dark", "system"] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]
export type ResolvedTheme = "light" | "dark"
export const THEME_STORAGE_KEY = "chapa-tema"
export const THEME_LABELS: Readonly<Record<ThemePreference, string>> // "Claro", "Escuro", "Sistema"
export function parseThemePreference(value: unknown): ThemePreference // inválido ou ausente → "system"
export function resolveTheme(preference: ThemePreference, systemPrefersDark: boolean): ResolvedTheme
export const THEME_INIT_SCRIPT: string // IIFE: lê o storage (em try/catch), resolve e aplica
export function applyTheme(preference: ThemePreference): void // grava (em try/catch), aplica e dispara "chapa-tema"
```

- Aplicar o tema é pôr ou tirar a classe `dark` do `<html>` e definir `style.colorScheme`. O `@custom-variant dark` passa a ser `(&:where(.dark, .dark *))`, o bloco escuro dos tokens passa a ser `.dark { … }`, e o `color-scheme: light dark` do `:root` sai.
- O `layout.tsx` renderiza `<head>` com um `<script>` de `THEME_INIT_SCRIPT` (o `dangerouslySetInnerHTML` leva um `biome-ignore` com o porquê: o texto é uma constante do código, sem nada vindo do usuário). O `<html>` ganha `suppressHydrationWarning`, porque o script muda a classe antes da hidratação.
- **Teste do script:** o `theme.test.ts` executa `THEME_INIT_SCRIPT` com `new Function` sobre um `document`, um `localStorage` e um `matchMedia` falsos, nas 3 preferências × 2 temas do sistema, mais um valor inválido e um `localStorage` que lança erro, e confere que o resultado é o de `resolveTheme`. Assim o texto do script e a função pura não se desencontram.

`src/lib/use-theme-preference.ts` (`"use client"`):

```ts
export function useThemePreference(): {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
}
```

Usa `useSyncExternalStore`, assinando o evento `"chapa-tema"`, o `storage` (outra aba) e o `change` do `matchMedia` (que reaplica o tema quando a preferência é `"system"`). No servidor, o snapshot é `"system"`.

### 4. Botão de tema

`src/components/brand/theme-toggle.tsx` (`"use client"`) exporta dois componentes, que usam o hook e o `DropdownMenuRadioGroup` do shadcn:

```ts
export function ThemeMenuGroup(): JSX.Element // DropdownMenuLabel "Tema" + 3 DropdownMenuRadioItem, para dentro de um menu
export function ThemeToggle(): JSX.Element // botão de ícone com o próprio menu, para fora de menus
```

- Ícones do Lucide (`SunIcon`, `MoonIcon`, `MonitorIcon`) com `aria-hidden`. O `ThemeToggle` tem `aria-label="Tema: <rótulo atual>"`.
- No `account-menu.tsx`, o `ThemeMenuGroup` entra depois de "Excluir minha conta", com um separador antes. Em `/entrar`, o `ThemeToggle` fica no canto superior direito do `<main>`.

### 5. Testes de marca

- **`src/lib/contrast.ts`:** `relativeLuminance(hex)`, `contrastRatio(a, b)` (arredondamento só na mensagem) e `hueDistance(a, b)` (graus HSL, de 0 a 180). Aceita `#RGB` e `#RRGGBB`. Um hex com alfa é erro, para um par nunca usar cor translúcida.
- **`src/lib/palette.ts`:** o espelho dos tokens de cor, para o teste e para quem precisa do valor em JS (a `/marca` e a imagem de compartilhamento da change 3):

```ts
export type ThemeName = "light" | "dark"
export const COLOR_TOKENS = ["background", "foreground", /* … */ "overlay"] as const // todos os da decisão 1, sem o "--"
export type ColorToken = (typeof COLOR_TOKENS)[number]
export const PALETTE: Readonly<Record<ThemeName, Readonly<Record<ColorToken, string>>>>
export type ContrastPair = { foreground: ColorToken; background: ColorToken; min: 4.5 | 3 }
export const CONTRAST_PAIRS: readonly ContrastPair[]
```

  Pares de 4,5 : 1: `foreground` sobre `background` e `card`; `popover-foreground`/`popover`; `muted-foreground` sobre `background`, `card` e `muted`; `primary-foreground`/`primary`; `primary`/`background` (links); `secondary-foreground`/`secondary`; `accent-foreground`/`accent`; `cinnamon-foreground`/`cinnamon`; `cinnamon-text`/`background`; `destructive` sobre `background` e `card`; `sidebar-foreground`/`sidebar`. Pares de 3 : 1: `ring`/`background`; `input` sobre `background` e `card`.
- **`src/lib/palette.test.ts`:** lê o `globals.css`, extrai `--<token>: <hex>;` dos blocos `:root` e `.dark`, e confere (a) que cada token de `COLOR_TOKENS` existe nos dois blocos com o mesmo valor de `PALETTE`; (b) os pares, falhando com uma linha `tema: frente/fundo → contraste` por par reprovado; (c) a distância de matiz entre `destructive` e `primary`.
- **`src/design-tokens.test.ts`:** varre `src/components` e `src/app` (`.ts`, `.tsx` e `.css`, menos `globals.css` e os testes) e falha com `arquivo:linha: trecho` para: hex de 3, 4, 6 ou 8 dígitos; `rgb(`, `rgba(`, `hsl(`, `hsla(`, `oklch(`, `oklab(`; classe do Tailwind com cor da paleta padrão (`red`, `orange`, …, `neutral`, `stone`, `black`, `white`, com prefixos como `bg-`, `text-`, `border-`, `ring-`, `fill-`, `stroke-`, `from-`, `to-`, `via-`, `outline-`, `shadow-`, `divide-`, `placeholder-`, `caret-`, `decoration-`, e com `/opacidade` opcional); e valor arbitrário com cor (`bg-[#…]`). Um teste do próprio teste confere que `text-neutral-600`, `#fff` e `rgb(0 0 0)` são pegos e que `href="#conteudo"` e `text-muted-foreground` não são.
- O overlay de `ui/dialog.tsx` e `ui/sheet.tsx` passa de `bg-black/10` para `bg-overlay`. É a única edição nos componentes do shadcn.

### 6. Arquivos que podem ser criados ou alterados

- `src/app/globals.css`, `src/app/layout.tsx`, `src/app/entrar/page.tsx`
- `src/components/chat/account-menu.tsx`, `src/components/ui/dialog.tsx`, `src/components/ui/sheet.tsx`
- Novos: `src/components/brand/theme-toggle.tsx`, `src/lib/theme.ts`, `src/lib/theme.test.ts`, `src/lib/use-theme-preference.ts`, `src/lib/palette.ts`, `src/lib/palette.test.ts`, `src/lib/contrast.ts`, `src/lib/contrast.test.ts`, `src/design-tokens.test.ts`
- Novo: `docs/adr/0022-identidade-visual-sobre-tokens-do-shadcn.md`; `docs/adr/README.md` (linha na tabela)
- `docs/architecture.md`, seção "Front-end": onde ficam os tokens, o espelho `palette.ts` e o tema por classe com o script no `<head>`
- `docs/development.md`, seção "Front-end": a regra de cores (só tokens; tom novo entra no `globals.css` e no `palette.ts`) e o `ThemeToggle`; seção "Testes": os dois testes de marca
- `AGENTS.md`, tabela "Onde mexer": linha nova "Cores, fontes, raio, sombra, movimento e tema" → `src/app/globals.css`, `src/lib/palette.ts`, `src/lib/theme.ts`, com o cuidado "Mudou um tom: o mesmo valor nos dois arquivos; `npm test` diz se passa no AA"
- `openspec/changes/add-rango-design-tokens/tasks.md` (marcar as tarefas)

## Risks / Trade-offs

- **Build depende do Google Fonts** → o `next/font/google` baixa as fontes no build. A CI e a Vercel têm rede. Se o build falhar por isso, o erro é explícito, e a troca para `next/font/local` fica registrada como alternativa no ADR.
- **`palette.ts` duplica o `globals.css`** → a duplicação é proposital (o CSS não é importável em JS) e o `palette.test.ts` impede divergência.
- **O shadcn regenerado pode trazer `bg-black/10` de volta** → o `design-tokens.test.ts` falha e aponta a linha.
- **Hidratação do `ThemeToggle`** → no servidor, o snapshot é "Sistema", e o `useSyncExternalStore` troca para a escolha real no cliente, sem aviso de hidratação. O ícone pode mudar logo depois da primeira pintura, mas o tema da página não muda.
