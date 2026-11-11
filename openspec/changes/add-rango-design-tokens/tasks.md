# Tasks

Change 1 de 3 da identidade visual da Rango. As changes `apply-rango-brand-to-screens` e `add-brand-page-and-sharing` só começam depois do merge desta. Nenhuma tarefa do implementador chama API ou banco. As tarefas **(orquestrador)** usam o `npm run dev` com o `dev`, dentro da autorização prévia do `CLAUDE.md`.

## 1. Paleta e contraste

- [x] 1.1 Escrever `src/lib/contrast.test.ts` (branco/preto = 21; um par igual = 1; `#FFF` igual a `#FFFFFF`; vinho/linho ≈ 8,5; `hueDistance` entre 350° e 10° = 20; hex com alfa lança erro) e depois implementar `src/lib/contrast.ts` (decisão 5). Verificar com `npm test -- contrast`.
- [x] 1.2 Criar `src/lib/palette.ts` com `COLOR_TOKENS`, `PALETTE` e `CONTRAST_PAIRS` da decisão 1 e da decisão 5. Escrever `src/lib/palette.test.ts` (sincronia com o `globals.css`, pares e distância de matiz) e conferir que ele falha contra o `globals.css` atual. Verificar com `npm test -- palette`, que deve falhar listando os tokens divergentes.
- [x] 1.3 Reescrever os tokens de cor do `globals.css` em hex, com o bloco escuro em `.dark { … }`, o `@custom-variant dark` por classe, os tokens novos (`cinnamon`, `cinnamon-foreground`, `cinnamon-text`, `overlay`) no `:root`, no `.dark` e no `@theme inline`, e sem o `color-scheme` fixo. Verificar com `npm test -- palette`, agora passando.

## 2. Fontes, forma e movimento

- [x] 2.1 Carregar Bricolage Grotesque e Figtree com `next/font/google` no `layout.tsx` e ligar `--font-sans` e `--font-heading` no `@theme inline` (decisão 2). Verificar com `npm run build` e, no HTML de `/entrar` gerado pelo `npm run dev`, que os `@font-face` apontam para `/_next/static/media/`.
- [x] 2.2 Mudar o `--radius` para `1rem` e acrescentar `--shadow-soft`, `--shadow-raised`, `--motion-fast`, `--motion-thinking`, os `@keyframes` `message-in` e `thinking-dot`, os utilitários `animate-message-in` e `animate-thinking-dot`, a classe `theme-changing` e o bloco de `prefers-reduced-motion` (decisão 2). Verificar com `npm run build` e com uma classe `shadow-soft animate-message-in` aplicada temporariamente num elemento no `npm run dev` (desfazer depois).

## 3. Tema

- [x] 3.1 Escrever `src/lib/theme.test.ts` (`parseThemePreference` com os três valores, `null`, `"azul"` e número; `resolveTheme` nas 6 combinações; `THEME_INIT_SCRIPT` executado com fakes nas 6 combinações, com valor inválido e com `localStorage` que lança erro; `applyTheme` grava, põe `theme-changing` e dispara `"chapa-tema"`) e depois implementar `src/lib/theme.ts` (decisão 3). Verificar com `npm test -- theme`.
- [x] 3.2 Pôr o `<head>` com o script e o `suppressHydrationWarning` no `<html>` do `layout.tsx`. Criar `src/lib/use-theme-preference.ts` e `src/components/brand/theme-toggle.tsx` (`ThemeMenuGroup` e `ThemeToggle`, decisão 4). Verificar com `npm run typecheck` e `npm run lint`.
- [x] 3.3 Pôr o `ThemeMenuGroup` no `account-menu.tsx` e o `ThemeToggle` no canto de `/entrar`. Verificar com `npm run build`.

## 4. Cores fixas

- [x] 4.1 Escrever `src/design-tokens.test.ts` (decisão 5), com o teste dos próprios padrões, e conferir que ele falha apontando `ui/dialog.tsx` e `ui/sheet.tsx`. Trocar o `bg-black/10` dos dois por `bg-overlay`. Verificar com `npm test -- design-tokens`, agora passando.

## 5. Documentação

- [x] 5.1 Escrever o ADR 0022 (contexto, decisão, alternativas: só retematizar, biblioteca própria com Storybook, manter o tema padrão, `next-themes`, `next/font/local`; consequências: nada de cor fixa, `palette.ts` como espelho testado, tema no `localStorage`) e a linha na tabela do `docs/adr/README.md`. Verificar que o link da tabela abre o arquivo.
- [x] 5.2 Atualizar `docs/architecture.md`, `docs/development.md` e a tabela "Onde mexer" do `AGENTS.md` nas seções da decisão 6. Verificar com `git grep -n "prefers-color-scheme\|sem botão\|no manual toggle" -- docs AGENTS.md src/app/globals.css`, que não deve achar nada que descreva o comportamento antigo.

## 6. Verificação manual (orquestrador)

- [x] 6.1 **(orquestrador)** No `npm run dev` com o `dev`: em `/entrar`, trocar entre Claro, Escuro e Sistema e recarregar em cada um, sem piscar (conferir também com a CPU 6× mais lenta nas ferramentas do navegador); com "Sistema", trocar o tema do sistema operacional com a página aberta; entrar como demo e trocar pelo menu da conta; abrir um diálogo de exclusão nos dois temas; com movimento reduzido ligado no sistema, a troca de tema é instantânea. Registrar no relatório, com prints dos dois temas de `/entrar` e do chat.
- [x] 6.2 **(orquestrador)** Navegar pela `/entrar`, pelo chat, pelo perfil e pela `/privacidade` com a skill `web-design-guidelines` nos dois temas, com foco no contraste e no foco visível. Registrar cada apontamento como corrigido aqui ou deixado para a change 2 (a retematização).

## 7. Verificação final

- [x] 7.1 Rodar `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`, e `npx openspec validate add-rango-design-tokens`. Verificar que todos passam e registrar no relatório os critérios de aceite do PRD que esta change fecha (tokens, fontes, contraste, cores fixas, botão de tema, ADR), com a evidência de cada um.
