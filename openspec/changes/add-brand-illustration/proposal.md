# Proposal

## Why

A identidade da Rango ([ADR 0022](../../../docs/adr/0022-identidade-visual-sobre-tokens-do-shadcn.md)) acertou cor, fonte e forma, mas as telas ainda são só texto sobre linho: a entrada é uma coluna estreita no meio do vazio, e o chat parece um formulário. A pessoa trouxe uma arte (`assets/arts/login-screen-art.jpeg`), uma folha de elementos (`assets/arts/art-assets.jpeg`) e duas telas de referência (`login-screen-with-art.jpeg` e `screen-with-art-example.jpeg`): formas orgânicas chapadas, com granulado leve (folhas, vapor, sementes, meias-luas, ondas), em ameixa, terracota, tangerina, mostarda e creme. Esta change leva essa ilustração para a entrada, o chat e o perfil sem mexer no que já funciona: contraste, tokens, temas e acessibilidade.

## What Changes

- **Paleta de ilustração:** cinco tokens novos (`art-plum`, `art-clay`, `art-tangerine`, `art-mustard`, `art-cream`), com valor próprio nos temas claro e escuro, no `globals.css` e no `palette.ts`. Eles só pintam desenho: nunca texto, borda de campo, foco ou botão. Um teste falha se uma classe de texto, borda ou anel usar um token `art-*`. O vinho continua sendo a única cor de ação.
- **Tela de entrada com arte:** a partir de 1024 px, `/entrar` vira duas colunas meio a meio, com a arte `login-screen-art` ocupando a coluna da esquerda de ponta a ponta e o conteúdo de hoje na da direita (botão de tema no canto superior direito). Abaixo de 1024 px, a arte vira uma faixa de cerca de 180 px no topo, com o conteúdo embaixo. A arte é a mesma nos dois temas, é decorativa (`alt=""`) e é servida pelo `next/image` a partir de `public/art/`.
- **Ornamentos nas bordas:** um componente novo, `BrandOrnaments`, desenha em SVG inline três grupos de ornamentos redesenhados a partir da folha de elementos: vapor e folhas no canto superior direito, meias-luas, ramo, sementes e espiral no canto inferior esquerdo, onda, tigela e sementes no canto inferior direito. As cores vêm dos tokens `art-*`. Eles ficam fixos nos cantos da janela, atrás do conteúdo, invisíveis para leitores de tela e sem receber clique. Entram no chat (`/`) e no perfil (`/perfil`), a partir de 1280 px. No tema escuro, aparecem com opacidade reduzida.
- **`/marca`:** uma seção nova, "Ilustração", com os tokens `art-*` (nome e hex nos dois temas, sem contraste, porque não são texto), a arte da entrada e os ornamentos, e a regra de uso.
- **Referências fora do git:** `assets/arts/` entra no `.gitignore`. Uma das telas de referência mostra um e-mail pessoal, e os originais somam cerca de 6 MB; só o arquivo usado vai para `public/art/`.
- **ADR 0026** "Ilustração da marca: arte raster na entrada e ornamentos SVG sobre tokens próprios".
- `docs/development.md` (Front-end) e `AGENTS.md` ("Onde mexer") atualizados.
- **README:** a imagem do topo (`docs/images/chat.png`, o chat respondendo sobre repasse) é refeita com a interface nova, no mesmo tamanho (1280 × 800) e no tema claro. O texto do README não muda: ele só aponta para a `/marca` e não descreve o visual, e a tabela de decisões não lista as ADRs de marca.

## Fora do escopo

- `/privacidade` e o resto da `/marca` ficam como estão, além da seção nova.
- Logo, favicon, avatar do Chapa, imagem de compartilhamento e os arquivos de `public/brand/`: sem mudança, e o `npm run brand:export` não precisa rodar.
- Animação da arte ou dos ornamentos: nenhuma. Mudança de layout do chat (lista de conversas, conversa, caixa de mensagem), dos textos e dos componentes do shadcn.
- Ornamentos abaixo de 1280 px e ornamentos dentro da conversa (bolhas, cartões, avisos).
- Redesenhar a arte da entrada ou gerar versões dela: ela entra como a pessoa entregou.

## Chamadas reais e checkpoints humanos

1. **Orquestrador (autorização prévia):** `npm run dev` com o `.env.local` (banco `dev`) para conferir `/entrar`, `/` e `/perfil` nos dois temas, em 1440 px, 1024 px e 390 px. Entrar como demo cria 1 conta demo no `dev`.
2. **Orquestrador (autorização prévia, banco `dev`):** `npm run screenshots -- --url http://localhost:3000 --only entrada,chat,perfil,marca` para revisar as telas e trocar o `docs/images/chat.png` do README pela foto `chat` do tema claro em desktop. Cria 1 conta demo no `dev` (5 por IP por dia).
3. **Pessoa:** aprovar o desenho dos ornamentos redesenhados nas fotos do PR. Não há migração, ingestão, eval nem chamada ao Gemini.

## Capabilities

### New Capabilities

Nenhuma. A ilustração é parte da identidade, na capacidade `brand`.

### Modified Capabilities

- `brand`: a paleta de ilustração e a regra de uso, os ornamentos no chat e no perfil, e a seção "Ilustração" na `/marca`.
- `auth`: a tela de entrada ganha a coluna de arte (faixa no topo no celular).

## Impact

- **Código:** `src/app/globals.css`, `src/lib/palette.ts`, `src/lib/brand-guide.ts`, `src/design-tokens.test.ts`, `src/components/brand/brand-ornaments.tsx` (novo), `src/components/brand/login-art.tsx` (novo), `src/app/entrar/page.tsx`, `src/app/page.tsx`, `src/app/perfil/page.tsx`, `src/app/marca/page.tsx`, `public/art/login-art.jpg` (novo) e `docs/images/chat.png` (refeita). A lista fechada está no `design.md`.
- **API e banco:** nenhuma mudança.
- **Dependências:** nenhuma. Usa o `next/image` do Next.
- **Peso:** a arte da entrada tem 548 KB em JPEG. O `next/image` serve WebP ou AVIF no tamanho da coluna. Os ornamentos são SVG inline, poucos KB.
- **Paralelismo:** mexe em `globals.css`, `palette.ts` e nas páginas `/`, `/entrar` e `/perfil`. Não roda em paralelo com outra change de interface ou de marca.
