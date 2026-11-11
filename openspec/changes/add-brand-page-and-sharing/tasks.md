# Tasks

Change 3 de 3 da identidade visual da Rango. Só começa depois que a `add-rango-design-tokens` e a `apply-rango-brand-to-screens` estiverem mergeadas e arquivadas: o worktree é rebaseado na `main` atualizada antes do apply. Nenhuma tarefa do implementador chama API ou banco. As tarefas **(orquestrador)** usam rede pública (o download das fontes) ou o `npm run dev` com o `dev`, dentro da autorização prévia do `CLAUDE.md`.

## 1. Fontes (orquestrador, antes do implementador)

- [x] 1.1 **(orquestrador)** Baixar as instâncias estáticas em TTF de Bricolage Grotesque 800 e Figtree 400 e 600 pela CSS API do Google Fonts, e as licenças OFL do repositório `google/fonts`, para `assets/fonts/` com os nomes da decisão 1. Verificar com `file assets/fonts/*.ttf` (TrueType) e que cada TTF tem menos de 300 KB.

## 2. Exportação

- [x] 2.1 Instalar `opentype.js` e `@types/opentype.js` como devDependencies, com versão exata (`npm i -D -E …`). Verificar com `git diff package.json`, que deve mostrar só as duas dependências e, depois da 2.3, o script.
- [x] 2.2 Escrever `scripts/brand/svg.test.ts` (cada SVG tem `viewBox`, `<title>` e nenhum `<text>`; as cores de cada versão são as da decisão 2, tiradas de `PALETTE`; o avatar tem os cinco paths de `CHAPA_ICON` com o `transform`; o README tem uma linha por papel com os hex dos dois temas; os arquivos commitados de `public/brand/` têm as mesmas cores que a geração em memória) e depois implementar `scripts/brand/svg.ts`. Verificar com `npm test -- svg`, menos o caso dos arquivos commitados, que só passa depois da 2.3.
- [x] 2.3 Criar `scripts/export-brand.ts` e o script `brand:export` no `package.json`, e rodar `npm run brand:export`. Verificar com `npm test -- svg` (agora inteiro), abrindo os quatro SVGs e o `icon.svg` no navegador, e com `grep -c "<text" public/brand/*.svg src/app/icon.svg`, que deve dar 0 em todos.

## 3. Favicon e compartilhamento

- [x] 3.1 Criar `src/app/apple-icon.tsx`, `src/app/opengraph-image.tsx` e `src/app/twitter-image.tsx` (decisão 3). Verificar com `npm run build` (as três rotas aparecem como estáticas na saída) e abrindo `/opengraph-image`, `/apple-icon` e `/icon.svg` no `npm run start`.
- [x] 3.2 Trocar o `metadata` do `layout.tsx` e os `title` das páginas para o `template` (decisão 3), confirmando o `metadataBase` com a skill `next-best-practices`. Verificar com `curl -s http://localhost:3000/entrar | grep -o '<meta[^>]*\(og:\|twitter:\)[^>]*>'` no `npm run start`: `og:image` com endereço absoluto, `twitter:card` igual a `summary_large_image` e títulos como "Entrar · Chapa".

## 4. Página `/marca`

- [x] 4.1 Criar `src/lib/brand-guide.ts` e a `src/app/marca/page.tsx` com as seções de princípios, paleta (com contraste), tipografia, forma, movimento, logo, avatar, favicon, imagem de compartilhamento e "O que evitamos" (decisão 4). Verificar com `npm run build` e com `npm test -- design-tokens`.
- [x] 4.2 Criar `src/components/brand/brand-showcase.tsx` com os componentes reais e pô-lo na `/marca`. Verificar no `npm run dev` que a seção de componentes aparece nos dois temas e que o campo de mensagem não envia nada (sem `POST /api/chat` no log).
- [x] 4.3 Acrescentar o link "Marca" ao `SiteFooter` e o id `marca` ao plano de screenshots, com o teste atualizado (7 ids, 28 fotos). Verificar com `npm test -- shots` e clicando em "Marca" no rodapé do chat e da entrada.
- [x] 4.4 Revisar a `/marca` com a skill `web-design-guidelines` (hierarquia de títulos, `alt` de cada imagem, tabelas a 390 px, foco no `ThemeToggle`). Verificar que cada apontamento foi corrigido ou justificado no relatório.

## 5. Documentação

- [x] 5.1 Atualizar `docs/architecture.md`, `docs/development.md`, `docs/qa.md` e o `AGENTS.md` nas seções da decisão 6. Verificar que o comando `brand:export` do `development.md` é o mesmo do `package.json` e com `git grep -n "apps de delivery" -- src/app`, que não deve achar nada.
- [x] 5.2 Atualizar o `README.md` (logo no topo, link para a `/marca` na linha da demo, a screenshot `docs/images/chat.png` copiada de `.screenshots/chat-light-desktop.png` depois da 6.1). Verificar que a imagem e os links abrem na pré-visualização do Markdown.

## 6. Verificação manual (orquestrador)

- [x] 6.1 **(orquestrador)** Com o `npm run dev` contra o `dev`: salvar `/opengraph-image` em `public/brand/og.png` (`curl -o public/brand/og.png http://localhost:3000/opengraph-image`); rodar `npm run screenshots -- --url http://localhost:3000`; abrir a `/marca` sem login nos dois temas e a 390 px; abrir `/brand/rango-logo.svg` e conferir o favicon na aba. Verificar que saem as 28 imagens e registrar no relatório as da `/marca`.
- [x] 6.2 **(pessoa)** Revisar a `/marca` e a imagem de compartilhamento e preencher no PR o checklist de originalidade do `docs/qa.md`. Depois do merge e do deploy, colar o link da produção no inspetor de posts do LinkedIn, rodar o smoke em produção (com o fluxo demo no celular) e levar `public/brand/` para o site-portfólio.

## 7. Verificação final

- [x] 7.1 Rodar `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` e `npx openspec validate add-brand-page-and-sharing`. Verificar que todos passam e registrar no relatório os critérios de aceite do PRD que esta change fecha (favicon, Open Graph, `/marca`, `public/brand/`, README), com a evidência de cada um, e os que ficam com a pessoa (LinkedIn e smoke em produção).
