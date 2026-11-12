# Tasks

## 1. Tokens e regra de uso

- [x] 1.1 Escrever primeiro, no `src/design-tokens.test.ts`, o caso da regra "só desenho" (`text-art-mustard`, `border-art-plum` e `ring-art-clay` reprovam; `fill-art-plum`, `stroke-art-cream` e `bg-art-mustard` passam) e ver o teste falhar
- [x] 1.2 Implementar o padrão `(text|border|ring|outline|decoration|placeholder|caret)-art-*` no `design-tokens.test.ts` até a 1.1 passar, sem reprovar nenhum arquivo atual
- [x] 1.3 Acrescentar os cinco tokens `art-*` ao `COLOR_TOKENS` e ao `PALETTE` (claro e escuro, valores do `design.md`), ver o `palette.test.ts` falhar por falta deles no CSS, e então criá-los no `:root` e no `.dark` do `globals.css`, com `--color-art-*` no `@theme inline` e `--art-opacity` (`1` e `0.45`); o `npm test` passa
- [x] 1.4 Acrescentar `ART_SWATCHES` e `ART_RULE` ao `src/lib/brand-guide.ts` e a ilustração ao `inPractice` do princípio "Original"; `npm run typecheck` passa

## 2. Arte da tela de entrada

- [x] 2.1 Copiar `../../chapa/assets/arts/login-screen-art.jpeg` para `public/art/login-art.jpg` sem alterar os bytes (`cmp` confere) e acrescentar `/assets/arts/` ao `.gitignore` (`git status` não lista `assets/arts/`)
- [x] 2.2 Criar `src/components/brand/login-art.tsx` (`LoginArt`) com o contrato do `design.md` (`alt=""`, `fill`, `object-cover`, `sizes`, `priority`)
- [x] 2.3 Refazer `src/app/entrar/page.tsx` na grade da decisão 5 (arte à esquerda a partir de 1024 px, faixa de 180 px no topo abaixo disso, conteúdo e textos de hoje na coluna da direita, botão de tema no canto dela); `npm run build` passa e `/entrar` abre no `npm run dev` sem erro no console

## 3. Ornamentos

- [x] 3.1 Olhar `../../chapa/assets/arts/art-assets.jpeg` e `screen-with-art-example.jpeg` e criar `src/components/brand/brand-ornaments.tsx` com `OrnamentClusterArt` para os três grupos (vapor e folhas; meias-luas, ramo, sementes e espiral; onda, tigela e sementes), só com `fill-art-*`/`stroke-art-*`, `aria-hidden` e `focusable="false"`, cada SVG abaixo de ~6 KB
- [x] 3.2 Criar `BrandOrnaments`, a camada fixa da decisão 4 (`fixed inset-0`, `-z-10`, `pointer-events-none`, `opacity-[var(--art-opacity)]`, `hidden xl:block`, grupos ancorados nos cantos e com a largura da margem livre); `npm test` passa, inclusive o teste de cor fixa
- [x] 3.3 Pôr `BrandOrnaments` no chat (`src/app/page.tsx`) e no perfil (`src/app/perfil/page.tsx`), com o contêiner `isolate` e o `SiteFooter` dentro de um bloco com fundo `bg-background` a partir de 1024 px; no `npm run dev`, nenhum texto ou controle fica por cima de um ornamento em 1280 e 1440 px, nos dois temas

## 4. `/marca`

- [x] 4.1 Acrescentar a seção "Ilustração" na `src/app/marca/page.tsx`, entre "Paleta" e "Tipografia" (tabela de `ART_SWATCHES` com hex claro e escuro, `ART_RULE`, `LoginArt` num quadro de proporção fixa e os três `OrnamentClusterArt`); em 390 px a página não rola na horizontal

## 5. Documentação

- [x] 5.1 Escrever a `docs/adr/0026-ilustracao-da-marca.md` (contexto, decisão, alternativas descartadas do `design.md` e consequências) e a linha no `docs/adr/README.md`
- [x] 5.2 Atualizar o `docs/development.md` (seção "Front-end") e a linha "Cores, fontes, raio, sombra, movimento e tema" do `AGENTS.md`, como listado no `design.md`

## 6. Verificação manual (orquestrador)

- [x] 6.1 `npm run dev` com o `.env.local` (banco `dev`): `/entrar` em 1440 × 900, 1024 e 390 × 844 px nos dois temas (arte meio a meio; faixa no topo; "Testar como demo" visível sem rolar em 390 × 844; sem rolagem horizontal; leitor de tela começa pelo logo)
- [x] 6.2 Entrar como demo (1 conta no `dev`) e conferir `/`, com a conversa vazia e com uma conversa longa, e `/perfil` em 1024, 1280, 1440 e 1920 px nos dois temas: nenhum texto, campo ou botão por cima de um ornamento; em 1024 px não há ornamentos; o clique passa pela camada; o Tab nunca para num ornamento; em 390 px não há ornamentos
- [x] 6.3 Comparar as fotos de 1440 px com `login-screen-with-art.jpeg` e `screen-with-art-example.jpeg` e anexá-las ao PR para a pessoa aprovar o desenho dos ornamentos
- [x] 6.4 `npm run screenshots -- --url http://localhost:3000 --only entrada,chat,perfil,marca` (1 conta demo no `dev`), revisar as fotos nos dois temas e tamanhos e trocar o `docs/images/chat.png` pela foto `chat` do tema claro em desktop; `sips -g pixelWidth -g pixelHeight` confere 1280 × 800, e a imagem aparece no topo do README na prévia do PR

## 7. Portões

- [x] 7.1 `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` passam

## Workflow follow-up

- Arquivar num PR `docs(openspec): archive add-brand-illustration`, depois do merge do PR da change.
