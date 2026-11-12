# Design

## Context

- A identidade vive nos tokens do `src/app/globals.css`, espelhados em `src/lib/palette.ts` ([ADR 0022](../../../docs/adr/0022-identidade-visual-sobre-tokens-do-shadcn.md)). O `palette.test.ts` confere que todo item de `COLOR_TOKENS` existe nos dois blocos (`:root` e `.dark`) com o mesmo hex. O `design-tokens.test.ts` proíbe hex, `rgb()`/`oklch()` e classes da paleta do Tailwind em `src/components` e `src/app`. A `/marca` lê as cores do `PALETTE` pelos dados de `src/lib/brand-guide.ts`.
- `/entrar` é hoje uma coluna de `26.25rem` centrada. O chat (`src/app/page.tsx`) é uma coluna de `62.5rem`, e a conversa rola dentro de um bloco com `max-h-[60dvh]`, então a página quase não rola. O perfil é uma coluna de `40rem`. O `html` tem `font-size: 110%`.
- As referências ficam **só no checkout principal**, fora do git: `chapa/assets/arts/`, ou `../../chapa/assets/arts/` a partir do worktree. O worktree não as tem. O implementador lê de lá a folha de elementos e as duas telas de referência, como imagem, e copia só a `login-screen-art.jpeg`.
- A folha `art-assets.jpeg` é um JPEG opaco, com fundo creme e o texto do rodapé gravado embaixo. Não serve como camada: é referência de desenho.

## Goals / Non-Goals

**Goals:** a ilustração entra sem cor fixa fora do `globals.css`; os testes de paleta e de cor fixa continuam sendo a rede; nenhuma informação depende da arte; as páginas continuam sem rolagem horizontal em 390 px.

**Non-Goals:** ilustração gerada em build, sprite de SVG, biblioteca de ícones nova, animação.

## Decisions

### 1. Contratos

```ts
// src/lib/palette.ts — COLOR_TOKENS ganha, no fim:
"art-plum", "art-clay", "art-tangerine", "art-mustard", "art-cream"
// PALETTE.light e PALETTE.dark ganham um hex para cada um (valores na decisão 2).
// CONTRAST_PAIRS não muda.

// src/lib/brand-guide.ts
export const ART_SWATCHES: readonly Swatch[]   // os cinco tons, com nome em PT-BR e uso
export const ART_RULE: string                   // "Só desenho: nunca texto, borda, foco ou botão."

// src/components/brand/brand-ornaments.tsx (Server Component, sem "use client")
export type OrnamentCluster = "top-right" | "bottom-left" | "bottom-right"
export function BrandOrnaments(): JSX.Element        // camada fixa com os três grupos
export function OrnamentClusterArt(props: { cluster: OrnamentCluster; className?: string }): JSX.Element
// O segundo desenha um grupo solto, em tamanho natural, para a /marca.

// src/components/brand/login-art.tsx (Server Component)
export function LoginArt(props: { className?: string }): JSX.Element
// next/image com src "/art/login-art.jpg", alt "", fill, object-cover,
// sizes "(min-width: 1024px) 50vw, 100vw", priority.
```

Arquivo novo: `public/art/login-art.jpg`, cópia exata de `assets/arts/login-screen-art.jpeg` (1196 × 1787 px).

### 2. Tokens de ilustração

| Token | Claro | Escuro | Nome |
|---|---|---|---|
| `art-plum` | `#5B1B2C` | `#8A3A4E` | Ameixa-funda |
| `art-clay` | `#C2654D` | `#B9654F` | Terracota |
| `art-tangerine` | `#E7823B` | `#D9813F` | Tangerina |
| `art-mustard` | `#EAA93C` | `#D9A24A` | Mostarda |
| `art-cream` | `#F2DEBD` | `#CDB591` | Creme |

Os valores claros foram tirados da arte. No escuro, a ameixa clareia para não sumir no fundo `#1D1517`, e o resto perde brilho. O implementador pode ajustar um tom em até ~10% de luminosidade para casar com a arte, nos dois arquivos. Os tokens entram no `@theme inline` como `--color-art-*`, para `fill-art-plum` e `text-art-*` existirem. A opacidade fica numa variável sem cor, `--art-opacity`: `1` no `:root` e `0.45` no `.dark`, aplicada na camada dos ornamentos.

**Por que tokens e não hex no SVG:** o `design-tokens.test.ts` já proíbe hex em componentes, e o tema escuro precisa de outro tom. **Alternativa descartada:** reaproveitar `chart-*`. Eles são para gráficos e não têm tangerina nem mostarda.

### 3. Regra "só desenho" no teste

O `design-tokens.test.ts` ganha um padrão: `(text|border|ring|outline|decoration|placeholder|caret)-art-[a-z]+` em `src/components` e `src/app`, com a mesma mensagem `arquivo:linha: trecho`. `fill-art-*`, `stroke-art-*` e `bg-art-*` passam. O caso "`text-art-mustard` reprova, `fill-art-plum` passa" entra no `describe("findFixedColors")`, ou num `describe` próprio ao lado.

### 4. Ornamentos em SVG inline, redesenhados

Cada grupo é um `<svg>` com `viewBox` próprio e formas em `<path>`/`<circle>`/`<ellipse>`, com cor só por classe (`fill-art-*`, `stroke-art-*`). O redesenho segue a folha: formas chapadas, contornos orgânicos, sem traço fino. O granulado das formas grandes é opcional: um único `<filter>` com `feTurbulence` por SVG, aplicado a no máximo três formas, sem cor no filtro. Cada grupo deve ficar abaixo de ~6 KB.

A camada é `fixed inset-0`, atrás do conteúdo (`-z-10` dentro de um contêiner `isolate` na página), com `pointer-events-none`, `aria-hidden="true"`, `focusable="false"` nos `<svg>`, `opacity-[var(--art-opacity)]` e `hidden xl:block`. Os grupos se ancoram nos cantos e ocupam só a margem que a coluna do chat (62,5 rem) deixa livre: largura `min(calc(50vw - 31.25rem), 20rem)` nos grupos de baixo e `min(calc(50vw - 31.25rem), 12rem)` no de cima. No perfil, de coluna mais estreita, a mesma conta sobra folga.

Para cumprir "nenhum texto, campo ou botão por cima de um ornamento sem o próprio fundo" no chat, cuja coluna de 1000 px ocupa quase toda a janela de 1024 px (por isso os ornamentos só aparecem a partir de 1280 px, decisão tomada na verificação manual, quando o botão "Enviar" desabilitado, que é translúcido, ficou sobre o grupo inferior direito em 1024 e 1280 px):

- os grupos inferiores ficam abaixo da caixa de mensagem e, a partir de 1024 px, o `SiteFooter` fica dentro de um `<div>` da página com fundo `bg-background` e um respiro superior, sem mexer no componente;
- o grupo superior direito fica acima e à direita do menu da conta, dentro da margem;
- a lista de conversas, as bolhas e a caixa de mensagem já têm fundo próprio (`card`/`background`).

**Alternativas descartadas:** recortes do JPEG com `mix-blend-mode: multiply` (o creme aparece no tema escuro e o texto gravado vaza); PNGs com o fundo removido (borda serrilhada, peso maior, sem tom por tema).

### 5. Tela de entrada

`<main>` vira uma grade `lg:grid-cols-2` com `min-h-dvh`. A coluna da arte (`LoginArt`) é `relative h-[180px] lg:h-auto lg:min-h-dvh`, com `lg:sticky lg:top-0` para a arte não rolar se o conteúdo crescer (erro + Google). A coluna do conteúdo mantém a largura de hoje (`max-w-[26.25rem]`), centrada na vertical, com o `ThemeToggle` no canto superior direito da coluna. No celular, a faixa usa `object-position` no terço de cima da arte, onde estão as ondas e o arco. O LCP é a arte, por isso `priority`.

**Por que `next/image` e `public/`:** gera WebP/AVIF no tamanho da coluna, sem dependência, e o arquivo é servido pelo próprio site. A arte tem 1196 px de largura: numa coluna de 720 px em tela 2×, ela é ampliada um pouco. É aceitável para uma ilustração chapada, e a pessoa pode trocar o arquivo por um maior sem mudar código.

### 6. `/marca`

Seção nova "Ilustração", entre "Paleta" e "Tipografia": tabela com `ART_SWATCHES` (amostra, nome, hex claro, hex escuro, uso), a frase `ART_RULE`, a arte da entrada (`LoginArt` num quadro de proporção fixa) e os três `OrnamentClusterArt` lado a lado (empilhados em 390 px). O `BRAND_PRINCIPLES` "Original" ganha a ilustração no `inPractice`.

### 7. Arquivos

Podem ser criados ou alterados, e nada além:

- `src/app/globals.css`, `src/lib/palette.ts`, `src/lib/brand-guide.ts`, `src/design-tokens.test.ts`
- `src/components/brand/brand-ornaments.tsx` (novo), `src/components/brand/login-art.tsx` (novo)
- `src/app/entrar/page.tsx`, `src/app/page.tsx`, `src/app/perfil/page.tsx`, `src/app/marca/page.tsx`
- `public/art/login-art.jpg` (novo), `.gitignore` (linha `/assets/arts/`)
- `docs/adr/0026-ilustracao-da-marca.md` (novo) e `docs/adr/README.md` (linha no índice)
- `docs/development.md`, seção "Front-end": um item sobre `BrandOrnaments`, `LoginArt`, `public/art/` e a regra dos tokens `art-*`
- `AGENTS.md`, tabela "Onde mexer", linha "Cores, fontes, raio, sombra, movimento e tema": cita `public/art/` e `src/components/brand/brand-ornaments.tsx`, e diz que um tom `art-*` nunca vira texto

- `docs/images/chat.png`, trocada pela foto `chat` do tema claro em desktop do `npm run screenshots` (1280 × 800, o mesmo tamanho de hoje). Quem troca é o orquestrador, porque a foto pede o `npm run dev` com o banco `dev`. O texto e o `alt` da imagem no `README.md` não mudam.

O `src/components/auth/sign-in-panel.tsx`, o `SiteFooter` e o texto do `README.md` não mudam.

## Risks / Trade-offs

- [O redesenho dos ornamentos fica pobre perto da folha] → O orquestrador revisa as fotos (1440 px, dois temas) contra `screen-with-art-example.jpeg` antes do PR, e a pessoa aprova no PR.
- [Ornamento por baixo de texto em alguma largura] → Verificação manual em 1024, 1280, 1440 e 1920 px, com a conversa vazia e cheia. A largura dos grupos segue a margem livre da coluna do chat, e abaixo de 1280 px não há ornamentos.
- [A camada fixa pesa na rolagem] → SVG pequeno, sem animação e com no máximo um filtro por grupo. Se o filtro custar, ele sai.
- [A arte de 548 KB atrasa a entrada] → `next/image` com `sizes` e `priority`. No celular, a faixa de 180 px pede uma versão pequena.
- [O `-z-10` some atrás do fundo do `body`] → O contêiner da página usa `isolate`. A verificação manual confere nos dois temas.

## Migration Plan

Só interface: o deploy é o merge. O rollback é reverter o PR. Nada de banco nem de reingestão.
