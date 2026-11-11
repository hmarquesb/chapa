# Proposal

## Why

Depois das changes 1 e 2, o Chapa tem a cara da Rango dentro do app, mas não fora dele: a aba do navegador mostra o ícone padrão, o link colado no LinkedIn não tem imagem, e não há um lugar que mostre o design system nem arquivos que o site-portfólio possa usar. Esta é a **change 3 de 3** da identidade visual. Ela cria a página de referência **`/marca`**, o **favicon**, a **imagem de compartilhamento** com os metadados e os **arquivos para o portfólio** em `public/brand/`. **Depende das changes 1 e 2 mergeadas e arquivadas**, porque a `/marca` mostra os componentes da change 2 e o SVG do avatar parte da geometria do ícone criada lá.

## What Changes

- **Página pública `/marca`** (sem login), com: princípios da marca e a relação Rango (marca) × Chapa (assistente); a paleta com nome, hex e contraste de cada par nos dois temas, calculados dos mesmos dados que os testes usam; tipografia e escala de tamanhos; raios, sombras e movimento; o logo nas três versões, o avatar, o favicon e a imagem de compartilhamento; os **componentes reais** em uso (botões de cada variante, bolha do usuário, resposta com fontes, fallback, bloqueio, faixa de demo, campo de mensagem); e a seção "O que evitamos". O rodapé de todas as telas ganha o link "Marca".
- **Favicon:** um "r." em Bricolage Grotesque 800, vinho sobre linho, com o ponto em canela (`src/app/icon.svg`, com o texto em contorno, e `apple-icon` de 180 px).
- **Imagem de compartilhamento (Open Graph), 1200 × 630,** gerada com `next/og` no build: o logo, a frase "Chapa, o assistente de parceiros da Rango", o avatar do Chapa e o aviso "Projeto de estudo · empresa fictícia". Metadados `og:` e `twitter:` no `layout.tsx`, com título e descrição em PT-BR. A descrição atual, que ainda fala em "apps de delivery", passa a falar da Rango.
- **Arquivos para o site-portfólio** em `public/brand/`: `rango-logo.svg` (claro), `rango-logo-dark.svg`, `rango-logo-mono.svg`, `chapa-avatar.svg`, `og.png` e um `README.md` com a paleta em hex e as fontes. Os SVGs têm o **texto convertido em contorno**, para não depender da fonte instalada.
- **Script `npm run brand:export`**, que gera os SVGs, o `icon.svg` e o `README.md` de `public/brand/` a partir da paleta (`src/lib/palette.ts`), da geometria do ícone (`src/lib/chapa-icon.ts`) e dos arquivos das fontes. Os arquivos gerados entram no git; o script só roda de novo quando a paleta, o logo ou o ícone mudam.
- As fontes **Bricolage Grotesque 800 e Figtree 400 e 600 em TTF estático** entram em `assets/fonts/`, com as licenças OFL. A imagem de compartilhamento e o script precisam do arquivo da fonte (o `next/og` não usa as fontes do `next/font`).
- O script de screenshots da change 2 passa a capturar a `/marca`.
- `README.md` com uma screenshot nova no topo e o link para a `/marca`; `docs/architecture.md`, `docs/development.md`, `docs/qa.md` e `AGENTS.md` atualizados.

## Fora do escopo

- A mudança no site-portfólio (outro repositório). Esta change só entrega os arquivos.
- Símbolo ou mascote da Rango. Biblioteca de componentes publicada (npm, Storybook).
- Imagens de compartilhamento por página: todas as páginas usam a mesma.
- Mudanças de comportamento no chat, no login, no RAG, nos prompts e no eval.

## Chamadas reais e checkpoints humanos

- **Implementador:** nenhuma chamada de API ou banco.
- **Orquestrador:** baixar uma vez as três fontes em TTF estático, pela CSS API do Google Fonts, com as licenças (download público, sem chave). `npm run dev` com o `dev` para a verificação manual e para rodar `npm run screenshots` com a `/marca` (uma conta demo no `dev`). Salvar o `og.png` a partir da rota `/opengraph-image` do servidor local.
- **Pessoa:** depois do merge e do deploy, colar o link da produção no inspetor de posts do LinkedIn e conferir a imagem, o título e a descrição. Rodar o smoke em produção, incluindo o fluxo demo no celular (ou autorizar o orquestrador). Levar os arquivos de `public/brand/` para o site-portfólio.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `brand`: entram a página `/marca`, os arquivos de marca com o texto em contorno, o favicon e a imagem de compartilhamento.
- `chat-ui`: os metadados de compartilhamento (`og:` e `twitter:`) e o link "Marca" no rodapé.
- `auth`: a `/marca` entra na lista de páginas públicas.

## Impact

- **Código:** `src/app/marca/page.tsx`, `src/components/brand/brand-showcase.tsx` e `src/lib/brand-guide.ts` (novos), `src/app/icon.svg`, `src/app/apple-icon.tsx`, `src/app/opengraph-image.tsx` e `src/app/twitter-image.tsx` (novos), `src/app/layout.tsx` (metadados), `src/components/brand/site-footer.tsx` (link), `scripts/export-brand.ts` e `scripts/brand/` (novos), `scripts/screenshots/shots.ts`, `assets/fonts/` e `public/brand/` (novos). A lista fechada está no `design.md`.
- **API e banco:** nenhuma mudança. As rotas de imagem do Next (`/icon.svg`, `/apple-icon`, `/opengraph-image`, `/twitter-image`) são estáticas, geradas no build.
- **Dependências novas: `opentype.js` e `@types/opentype.js` (devDependencies, versão exata).** São o jeito de transformar o texto do logo e do favicon em contornos SVG a partir do arquivo da fonte. Só o `brand:export` usa, e o resultado fica no git, então nem o build nem a CI dependem delas. Alternativas descartadas: desenhar os contornos à mão (impreciso e difícil de refazer quando a paleta mudar) e um SVG com a fonte embutida (pesado, e nem todo programa que abre SVG aceita `@font-face`).
