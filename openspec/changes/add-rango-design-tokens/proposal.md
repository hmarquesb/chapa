# Proposal

## Why

O Chapa ainda usa o tema padrão do shadcn (cinzas neutros com um azul-ardósia), a fonte do sistema e um modo escuro que só segue o sistema operacional. Para o portfólio, o projeto parece um template: quem abre a demo vê o shadcn, não a Rango. Esta é a **change 1 de 3** da identidade visual da Rango. Ela cria a base de que as outras duas dependem: os **tokens** (cor, tipografia, raio, sombra e movimento), o **botão de tema** e os **testes** que impedem que a marca se desfaça com o tempo (contraste AA e nenhuma cor fixa fora dos tokens).

## What Changes

- **Paleta "Vinho e canela"** nos temas claro e escuro, em `globals.css`, nos tokens semânticos do shadcn (`--background`, `--primary`, `--accent`, `--destructive`, `--chart-*`, `--sidebar-*`…). Fundo linho, texto ameixa, principal vinho, canela como cor de preenchimento e um **vermelho-tijolo** para erro, distinto do vinho no tom e na luminosidade.
- **Tokens de marca novos**, fora do vocabulário do shadcn: `--cinnamon`, `--cinnamon-foreground`, `--cinnamon-text` (a canela como preenchimento, o texto sobre ela e a canela escura para texto) e `--overlay` (o fundo dos diálogos). O `--accent` do shadcn vira um **tom claro de canela** (`#F5E3CF`), e não a canela cheia, porque o shadcn usa o `--accent` no hover dos menus e dos botões `ghost`: com a canela cheia, todo hover ficaria cor de caramelo. Isto desvia do PRD, que punha a canela no `--accent`, e está registrado no `design.md`.
- **Tipografia:** Bricolage Grotesque (títulos, 600 e 800) e Figtree (texto e interface, 400, 500 e 600), por `next/font/google`, servidas pelo próprio domínio.
- **Forma:** raio base de `0.625rem` para **`1rem`**, com os derivados recalculados. Duas sombras quentes (tom de ameixa) como tokens.
- **Movimento:** tokens de duração e as animações base (entrada de mensagem e pontos de "pensando"). Aqui elas só são definidas: quem as usa é a change 2. A troca de tema ganha uma transição de cor de ~200 ms. Com `prefers-reduced-motion: reduce`, todas as animações e transições ficam desligadas.
- **Botão de tema:** Claro, Escuro e **Sistema** (padrão), no menu da conta e no canto da tela de entrada. A escolha fica no `localStorage` (preferência visual, fora da conta) e é aplicada **antes da primeira pintura**, por um **script próprio e curto** no `<head>`, sem `next-themes`. O modo escuro passa a seguir a classe `dark` no `<html>`, e não mais só o `prefers-color-scheme`.
- **Testes novos:** contraste WCAG AA dos pares de uso nos dois temas, lidos do `globals.css`; nenhuma cor em hex, `rgb()`/`oklch()` ou classe de cor fixa do Tailwind em `src/components` e `src/app`. As duas ocorrências que existem hoje (`bg-black/10` nos overlays do `dialog` e do `sheet` do shadcn) passam para o token `--overlay`.
- **ADR 0022**, "Identidade visual da Rango sobre os tokens do shadcn", com a decisão do script próprio de tema.
- `docs/architecture.md` e `docs/development.md` atualizados.

## Fora do escopo

- Logo, avatar do Chapa, indicador de "pensando", rodapé novo e a retematização das telas (change 2, `apply-rango-brand-to-screens`). Aqui as telas mudam de aparência só porque os tokens mudam.
- A página `/marca`, o favicon, a imagem de compartilhamento e os insumos para o site-portfólio (change 3, `add-brand-page-and-sharing`).
- Guardar o tema na conta. Qualquer mudança no RAG, nos prompts, nas rotas, no login ou no eval.

## Chamadas reais e checkpoints humanos

- **Nenhuma chamada de API ou banco** no implementador. Os testes novos leem arquivos do repositório.
- **Orquestrador (autorização prévia):** `npm run dev` com o `dev` para conferir o botão de tema (sem piscar ao recarregar nos três modos), o contraste a olho nas telas atuais e os dois temas.
- **Pessoa:** aprovar os tons da paleta, principalmente o vermelho-tijolo de erro e o `--accent` em canela clara, e o raio de `1rem`. Os valores ficam fáceis de trocar: estão num lugar só, e os testes de contraste dizem se um tom novo passa.

## Capabilities

### New Capabilities

- `brand`: a identidade visual da Rango: tokens nos dois temas, contraste AA verificado, proibição de cor fixa fora dos tokens, tipografia, raio, movimento reduzido e a preferência de tema.

### Modified Capabilities

- `chat-ui`: o menu da conta ganha a escolha de tema; "Sem marca de empresa real" passa a citar a paleta própria.
- `auth`: a tela de entrada ganha o botão de tema no canto.

## Impact

- **Código:** `src/app/globals.css`, `src/app/layout.tsx`, `src/app/entrar/page.tsx`, `src/components/chat/account-menu.tsx`, `src/components/ui/dialog.tsx` e `sheet.tsx` (só o overlay), novos `src/lib/theme.ts`, `src/lib/use-theme-preference.ts`, `src/lib/palette.ts`, `src/lib/contrast.ts`, `src/components/brand/theme-toggle.tsx` e os testes. A lista fechada está no `design.md`.
- **API e banco:** nenhum.
- **Dependências:** nenhuma. `next/font` já vem com o Next, e o tema usa um script próprio em vez do `next-themes`.
- **Build:** o `next build` passa a baixar as duas fontes do Google Fonts (só no build, nunca no navegador), como qualquer projeto com `next/font/google`.
