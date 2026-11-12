# 0026. Ilustração da marca com tokens `art-*` e ornamentos em SVG

- **Status:** Aceito
- **Data:** 2026-11-12

## Contexto

A identidade vive nos tokens do `globals.css`, espelhados em `palette.ts` ([ADR 0022](0022-identidade-visual-sobre-tokens-do-shadcn.md)), e o `design-tokens.test.ts` proíbe cor fixa em `src/components` e `src/app`. A marca ganhou uma ilustração (uma arte para a tela de entrada e ornamentos para o chat e o perfil) com cinco tons que nenhum token atual cobre. A folha de elementos de referência é um JPEG opaco, com fundo creme e texto gravado, e não serve como camada. O tema escuro precisa de outros tons, e a ilustração nunca pode carregar informação.

## Decisão

- **Cinco tokens `art-*`** (`art-plum`, `art-clay`, `art-tangerine`, `art-mustard`, `art-cream`) no `globals.css` e no `palette.ts`, com um tom para cada tema, e `--art-opacity` (`1` no claro, `0.45` no escuro) para a camada dos ornamentos. O `palette.test.ts` continua conferindo os dois arquivos.
- **Regra "só desenho".** Os tons `art-*` servem a `fill`, `stroke` e `bg`, nunca a texto, borda, foco ou botão. O `design-tokens.test.ts` reprova `(text|border|ring|outline|decoration|placeholder|caret)-art-*`. Como os tons não são pares de contraste, o `CONTRAST_PAIRS` não muda.
- **Ornamentos em SVG inline** (`src/components/brand/brand-ornaments.tsx`): três grupos redesenhados a partir da folha, com cor só por classe. A camada `BrandOrnaments` é `fixed`, atrás do conteúdo, `pointer-events-none`, `aria-hidden`, só a partir de 1280 px e com a largura da margem livre ao lado da coluna do chat, e entra no chat e no perfil. Nenhum texto, campo ou botão fica sobre um ornamento sem fundo próprio.
- **Arte da tela de entrada** (`LoginArt`) é o JPEG original em `public/art/login-art.jpg`, servido por `next/image` (`alt=""`, `priority`). A pasta de referências `assets/arts/` fica fora do git.
- **A `/marca`** ganha a seção "Ilustração" com os tons, a regra e a amostra da arte e dos ornamentos.

## Alternativas consideradas

- **Recortes do JPEG com `mix-blend-mode: multiply`.** Descartada: o creme aparece no tema escuro e o texto gravado vaza.
- **PNGs com o fundo removido.** Descartada: borda serrilhada, mais peso e um único tom para os dois temas.
- **Reaproveitar `chart-*`.** Descartada: são para gráficos e não têm tangerina nem mostarda.
- **Ilustração gerada em build ou sprite de SVG.** Descartada: complexidade sem ganho para três grupos pequenos.

## Consequências

- A ilustração segue o tema pelos tokens, e o teste de cor fixa continua sendo a rede. Um tom novo de arte exige o mesmo valor nos dois arquivos.
- A arte da entrada pesa cerca de 548 KB; `next/image` entrega o tamanho da coluna. A arte tem 1196 px de largura e pode ser trocada por uma maior sem mudar código.
- A camada fixa custa pouco (SVG pequeno, sem animação). Se o filtro de granulado pesar na rolagem, ele sai.
- O desenho dos ornamentos é revisado por pessoa, nas fotos de 1440 px, e não por teste. Para voltar atrás basta reverter o PR: não há banco nem reingestão.
