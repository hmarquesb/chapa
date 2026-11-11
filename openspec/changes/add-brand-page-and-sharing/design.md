# Design

## Context

Esta change parte do estado que a `add-rango-design-tokens` e a `apply-rango-brand-to-screens` deixam:

- `src/lib/palette.ts` (`PALETTE`, `COLOR_TOKENS`, `CONTRAST_PAIRS`) espelha os tokens do `globals.css`, e `src/lib/contrast.ts` calcula o contraste. O `palette.test.ts` garante que os dois batem.
- `src/lib/chapa-icon.ts` (`CHAPA_ICON`) tem a geometria do ícone. `src/components/brand/` tem `RangoLogo`, `ChapaIcon`, `ChapaAvatar`, `ThinkingIndicator`, `SiteFooter` e `ThemeToggle`.
- `scripts/screenshots/shots.ts` tem os ids `entrada`, `chat`, `demo`, `menu`, `perfil` e `avisos`.
- `src/design-tokens.test.ts` proíbe cor literal em `src/components` e `src/app`. Ele lê o texto do código, então um valor que vem de `PALETTE` numa variável passa, e um `"#7A2E3B"` escrito no arquivo não.
- Não há `public/`, `src/app/icon.*` nem `opengraph-image`. O `layout.tsx` define `title`, `description` (ainda com "apps de delivery") e `referrer`.
- Cada página confere o login por conta própria (`getAuthenticatedAccount`); não há middleware. Uma página nova sem essa chamada é pública.

## Goals / Non-Goals

**Goals:**

- A `/marca`, os arquivos de `public/brand/` e a imagem de compartilhamento tiram as cores de `PALETTE` e o ícone de `CHAPA_ICON`. Mudar um tom é editar o `globals.css` e o `palette.ts`, rodar `npm run brand:export` e commitar.
- Nem o build nem a CI dependem das dependências novas.

**Non-Goals:**

- Gerar as imagens de compartilhamento por página ou em tempo de requisição.
- Validar automaticamente o cartão do LinkedIn (é verificação humana).

## Decisions

### 1. Fontes em arquivo

- `assets/fonts/BricolageGrotesque-ExtraBold.ttf`, `assets/fonts/Figtree-Regular.ttf` e `assets/fonts/Figtree-SemiBold.ttf`, **instâncias estáticas** (o `next/og` e o `opentype.js` não lidam bem com fontes variáveis), com `assets/fonts/OFL-BricolageGrotesque.txt` e `assets/fonts/OFL-Figtree.txt`. O orquestrador as baixa pela CSS API do Google Fonts (`fonts.googleapis.com/css2?family=…:wght@…`), que serve TTF a clientes que não pedem WOFF2, e as licenças, do repositório `google/fonts`.
- O app continua com o `next/font/google` da change 1. Os arquivos só servem à imagem de compartilhamento, ao `apple-icon` e ao `brand:export`.
- `assets/` fica na raiz porque é lido com `process.cwd()` no build e pelo script, fora do bundle do cliente.

### 2. Exportação dos arquivos de marca

```ts
// scripts/brand/svg.ts (puro, com teste)
export type GlyphOutline = { d: string; advance: number } // um path por texto, já posicionado
export function logoSvg(input: { word: GlyphOutline; dot: GlyphOutline; colors: { word: string; dot: string }; title: string }): string
export function avatarSvg(input: { icon: typeof CHAPA_ICON; colors: { circle: string; icon: string }; title: string }): string
export function faviconSvg(input: { letter: GlyphOutline; dot: GlyphOutline; colors: { background: string; letter: string; dot: string } }): string
export function brandReadme(input: { palette: typeof PALETTE }): string
```

- Os SVGs têm `viewBox` justo, `<title>` ("Rango" ou "Chapa"), `role="img"` e nenhum `<text>`. Cores: `rango-logo.svg` com `primary` e `cinnamon` do claro; `rango-logo-dark.svg` com `primary` e `cinnamon` do escuro; `rango-logo-mono.svg` com `foreground` do claro nas duas partes; `chapa-avatar.svg` com `cinnamon` e `cinnamon-foreground` do claro; `icon.svg` com `background` e `primary` do claro num quadrado de cantos arredondados (raio de 22% do lado) e o ponto em `cinnamon`.
- `brandReadme` gera o `public/brand/README.md`: a tabela da paleta (papel, token, claro, escuro) tirada de `PALETTE`, as fontes com os pesos e a licença OFL, a lista dos arquivos e a regra de uso (o logo nunca é redesenhado, o ponto é sempre canela, a canela nunca é texto no claro). O README avisa que é gerado pelo `brand:export`.
- `scripts/export-brand.ts` carrega a Bricolage ExtraBold com o `opentype.js`, gera os contornos de "rango", "." e "r" (`font.getPath(...).toPathData(2)`), chama as funções puras e grava `public/brand/rango-logo.svg`, `rango-logo-dark.svg`, `rango-logo-mono.svg`, `chapa-avatar.svg`, `README.md` e `src/app/icon.svg`. Não usa rede nem banco.
- `package.json`: `"brand:export": "node --import tsx scripts/export-brand.ts"`, e `opentype.js` e `@types/opentype.js` em `devDependencies`, com versão exata.
- O `public/brand/og.png` é uma cópia da rota `/opengraph-image`, salva pelo orquestrador (tarefa 6.1), para o site-portfólio usar sem depender do deploy.

### 3. Favicon, imagem de compartilhamento e metadados

- `src/app/icon.svg`: o arquivo gerado pelo `brand:export`. O Next o serve e põe o `<link rel="icon">` sozinho. Ele não é varrido pelo `design-tokens.test.ts` (o teste só lê `.ts`, `.tsx` e `.css`).
- `src/app/apple-icon.tsx` (180 × 180), `src/app/opengraph-image.tsx` e `src/app/twitter-image.tsx` (1200 × 630, a twitter reexporta a de Open Graph) usam o `ImageResponse` de `next/og` com as fontes de `assets/fonts/`, lidas com `readFile`. As cores vêm de `PALETTE.light`, e o ícone, de `CHAPA_ICON`. São estáticas: geradas no build, sem `dynamic`. Exportam `alt` ("Chapa, o assistente de parceiros da Rango"), `size` e `contentType`.
- Leiaute da imagem: fundo linho, logo "rango." grande no alto à esquerda, a frase "Chapa, o assistente de parceiros da Rango" em Bricolage, o avatar do Chapa à direita, e no rodapé "Projeto de estudo · empresa fictícia" em Figtree, no `muted-foreground`.
- `src/app/layout.tsx`:

```ts
export const metadata: Metadata = {
  title: { default: "Chapa", template: "%s · Chapa" },
  description: "Assistente com RAG para restaurantes parceiros da Rango, uma empresa de delivery fictícia: taxas, repasse, cancelamentos, cardápio e avaliações, com as fontes de cada resposta. Projeto de estudo.",
  referrer: "no-referrer",
  openGraph: { type: "website", locale: "pt_BR", siteName: "Chapa", title: "Chapa, o assistente de parceiros da Rango", description: <a mesma> },
  twitter: { card: "summary_large_image", title: "Chapa, o assistente de parceiros da Rango", description: <a mesma> },
}
```

  O `metadataBase` fica sem valor fixo: na Vercel, o Next usa o `VERCEL_PROJECT_PRODUCTION_URL` em produção (e a URL da branch nos previews), e no local, `http://localhost:3000`. O implementador confirma esse comportamento na versão instalada com a skill `next-best-practices`; se não valer, o `metadataBase` passa a vir de `VERCEL_PROJECT_PRODUCTION_URL`, sem variável nova. Os títulos das páginas (`"Entrar · Chapa"` e os outros) passam a usar o `template`, sem mudar o texto final.

### 4. Página `/marca`

- `src/app/marca/page.tsx` (server component, sem `getAuthenticatedAccount`), com `metadata.title = "Marca"`. Ela tem o `RangoLogo` como link para `/`, o `ThemeToggle` no canto (para ver os dois temas) e o `SiteFooter`.
- `src/lib/brand-guide.ts` (dados, sem lógica): `BRAND_PRINCIPLES` (Caseira, Arredondada, Clara, Original, cada um com "na prática"), `SWATCHES` (`{ token, name, usage }`, com os nomes linho, ameixa, vinho, canela, canela clara, canela escura, tijolo…), `TYPE_SCALE` (`{ label, className, sample }`, de `text-xs` até o título da página), `RADII`, `SHADOWS`, `MOTION` e `AVOIDED` (vermelho, laranja vivo, amarelo e verde-vivo como cor principal; símbolo ou mascote; nome, ícone ou ilustração de empresa real; ícones de entrega como moto ou sacola).
- A paleta mostra, por tema, uma amostra com `style={{ backgroundColor: PALETTE[tema][token] }}`, o hex e, para cada item de `CONTRAST_PAIRS`, o contraste de `contrastRatio` com uma marca "AA" ou "3 : 1". As duas colunas (claro e escuro) aparecem lado a lado, independentes do tema atual.
- `src/components/brand/brand-showcase.tsx` (`"use client"`): os componentes reais com dados fixos, porque o `Composer` e os botões precisam de funções que uma página de servidor não passa. Mostra os botões (`default`, `secondary`, `outline`, `ghost`, `destructive`, `link`), o `MessageItem` com uma pergunta, uma resposta com duas fontes, um fallback e um bloqueio, o `ThinkingIndicator`, a `DemoBanner` com `googleEnabled={false}` e o `Composer` com um `onSend` que não faz nada. Se a `DemoBanner` não puder ser importada num componente de cliente (ela recebe uma Server Action), ela é desenhada direto na página de servidor, fora do showcase.
- O logo aparece de duas formas: o componente `RangoLogo` e as imagens de `public/brand/` (as três versões, sobre fundos claro e escuro), com links para baixar. O favicon, o avatar e a imagem de compartilhamento aparecem como `<img>` das rotas e dos arquivos. Toda imagem tem `alt`.
- Tabelas largas ficam num bloco com `overflow-x-auto`, para a página não rolar na horizontal a 390 px.

### 5. Rodapé e screenshots

- `SiteFooter` ganha o link "Marca" depois de "Privacidade", separados por " · ".
- `scripts/screenshots/shots.ts` ganha o id `marca`, sem sessão e com a página inteira (`fullPage`). O teste passa a esperar 7 ids e 28 fotos.

### 6. Arquivos que podem ser criados ou alterados

- Novos: `src/app/marca/page.tsx`, `src/components/brand/brand-showcase.tsx`, `src/lib/brand-guide.ts`, `src/app/icon.svg`, `src/app/apple-icon.tsx`, `src/app/opengraph-image.tsx`, `src/app/twitter-image.tsx`
- `src/app/layout.tsx` (só `metadata`), `src/app/entrar/page.tsx`, `src/app/perfil/page.tsx`, `src/app/privacidade/page.tsx` (só o `title` no formato do `template`), `src/components/brand/site-footer.tsx`
- Novos: `scripts/export-brand.ts`, `scripts/brand/svg.ts`, `scripts/brand/svg.test.ts`
- `scripts/screenshots/shots.ts`, `scripts/screenshots/shots.test.ts`, `scripts/screenshots.ts` (só se o id `marca` precisar de um passo próprio)
- Novos: `assets/fonts/` (três TTF e duas licenças), `public/brand/` (quatro SVGs, `og.png` e `README.md`)
- `package.json`, `package-lock.json`
- `README.md`: logo do topo (o `rango-logo.svg` acima do título) e uma screenshot do chat no tema claro, em `docs/images/chat.png`, logo depois da linha "**Demo:**"; nessa linha, o link para a `/marca`. Nova: `docs/images/chat.png`
- `docs/architecture.md`, seção "Front-end": a `/marca`, as rotas de imagem e `public/brand/`
- `docs/development.md`, seção "Scripts locais": `npm run brand:export`, quando rodar e que o resultado é commitado; seção "Front-end": a `/marca` como referência visual
- `docs/qa.md`, seção "Verificação manual local": a `/marca` nos dois temas e a 390 px; seção "Smoke na demo publicada": o inspetor de posts do LinkedIn depois do deploy
- `AGENTS.md`: bloco "Comandos" (`npm run brand:export`) e tabela "Onde mexer", na linha de cores e tema da change 1 (acrescentar "rodar `npm run brand:export` e commitar `public/brand/` e `src/app/icon.svg`")
- `openspec/changes/add-brand-page-and-sharing/tasks.md` (marcar as tarefas)

## Risks / Trade-offs

- **O Next pode não ler `assets/fonts/` no build da Vercel** → o `readFile` com `process.cwd()` é o caminho dos exemplos do `next/og` para rotas estáticas. A tarefa 3.2 confere com `npm run build` e depois abrindo `/opengraph-image` no `npm run start`.
- **O LinkedIn guarda a pré-visualização em cache** → o inspetor de posts força uma nova leitura. Fica com a pessoa, depois do deploy.
- **Os SVGs gerados ficam velhos se alguém mudar a paleta sem rodar o export** → o `svg.test.ts` gera de novo o `README.md` e o `rango-logo.svg` em memória (com um contorno falso só para as cores) e compara as cores com as dos arquivos commitados; uma diferença falha com "rode `npm run brand:export`".
- **Duas devDependencies para um script raro** → ficam fora do build e da CI, e o resultado é commitado.
