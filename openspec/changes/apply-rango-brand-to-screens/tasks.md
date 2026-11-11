# Tasks

Change 2 de 3 da identidade visual da Rango. Só começa depois que a `add-rango-design-tokens` estiver mergeada e arquivada: o worktree é rebaseado na `main` atualizada antes do apply. Nenhuma tarefa do implementador chama API ou banco. As tarefas **(orquestrador)** usam o `npm run dev` com o `dev`, dentro da autorização prévia do `CLAUDE.md`.

## 1. Componentes de marca

- [x] 1.1 Criar `src/lib/chapa-icon.ts` com a geometria da decisão 1 e os componentes `RangoLogo`, `ChapaIcon`, `ChapaAvatar`, `ThinkingIndicator` e `SiteFooter` em `src/components/brand/`, e a constante `FICTIONAL_COMPANY_NOTICE` em `src/lib/sign-in.ts`. Verificar com `npm run typecheck`, `npm run lint` e `npm test -- design-tokens architecture`.

## 2. Telas

- [x] 2.1 Cabeçalho e rodapé: logo e `SiteFooter` em `src/app/page.tsx`, `entrar/page.tsx`, `perfil/page.tsx` e `privacidade/page.tsx`, e o cartão do aviso no `sign-in-panel.tsx`, sem o link "Privacidade" duplicado (decisão 2). Verificar com `npm run build` e com `git grep -n "Projeto de estudo, não oficial" -- src/app/page.tsx`, que não deve achar nada.
- [x] 2.2 Conversa: `message-item.tsx` (bolhas, avatar, selos, fallback, bloqueio, `animate-message-in`) e `message-list.tsx` (`ThinkingIndicator` no lugar do "Digitando…"). Verificar com `git grep -n "Digitando" -- src`, que não deve achar nada, e com `npm run build`.
- [x] 2.3 Restante do chat: `composer.tsx`, `conversation-list.tsx`, `demo-banner.tsx`, `account-menu.tsx`, `profile-summary.tsx`, `profile-form.tsx`, `status-banner.tsx`, os dois diálogos e `example-questions.tsx` (decisão 2). Verificar com `npm test -- design-tokens` e `npm run build`.
- [x] 2.4 Revisar as telas com a skill `web-design-guidelines` (foco visível no anel vinho, nome acessível do logo e do avatar, o indicador com movimento reduzido, alvos de toque a 390 px). Verificar que cada apontamento foi corrigido ou justificado no relatório.

## 3. Screenshots

- [x] 3.1 Instalar o `playwright` como devDependency, com versão exata (`npm i -D -E playwright@<versão estável>`), e acrescentar `.screenshots/` ao `.gitignore`. Verificar com `git diff package.json`, que deve mostrar só a dependência nova e, depois da 3.3, o script.
- [x] 3.2 Escrever `scripts/screenshots/shots.test.ts` (o plano completo tem 6 ids × 2 temas × 2 viewports = 24 fotos; `--only chat,menu` dá 8; id desconhecido é erro com a lista dos válidos; `--url` é obrigatório; `--out` tem padrão `.screenshots`) e depois implementar `scripts/screenshots/shots.ts`. Verificar com `npm test -- shots`.
- [x] 3.3 Criar `scripts/screenshots/fixtures.ts` e `scripts/screenshots.ts` (decisão 3) e o script `screenshots` no `package.json`. Verificar com `npm run typecheck` e com `npm run screenshots -- --url http://localhost:1`, que deve sair com código 1 e uma mensagem clara de servidor fora do ar.

## 4. Documentação

- [x] 4.1 Atualizar `docs/architecture.md`, `docs/development.md`, `docs/qa.md` (com o checklist de originalidade) e o `AGENTS.md` nas seções da decisão 4. Verificar com `git grep -n "Digitando" -- docs AGENTS.md`, que não deve achar nada, e conferindo que o comando de screenshots do `development.md` é o mesmo do `package.json`.

## 5. Verificação manual (orquestrador)

- [x] 5.1 **(orquestrador)** `npx playwright install chromium` e, com o `npm run dev` contra o `dev`, `npm run screenshots -- --url http://localhost:3000`. Verificar que saem as 24 imagens em `.screenshots/`, que nenhuma mostra erro, e que nenhum pedido chegou ao `/api/chat` real (o log do servidor não mostra `POST /api/chat`).
- [ ] 5.2 **(orquestrador)** No `npm run dev`: mandar uma pergunta real e ver o indicador com os pontos e a entrada da resposta; repetir com movimento reduzido ligado no sistema (texto estático, sem animação); navegar só pelo teclado da entrada ao chat e ao menu da conta, com o anel de foco visível nos dois temas; ler a resposta com o VoiceOver e conferir que "Chapa" não é lido duas vezes.
- [ ] 5.3 **(pessoa)** Revisar as 24 screenshots, o logo e o ícone do Chapa e preencher no PR o checklist de originalidade do `docs/qa.md`.

## 6. Verificação final

- [x] 6.1 Rodar `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` e `npx openspec validate apply-rango-brand-to-screens`. Verificar que todos passam e registrar no relatório os critérios de aceite do PRD que esta change fecha (avatar nas respostas, indicador e animações com movimento reduzido, logo no cabeçalho e na entrada, screenshots), com a evidência de cada um.
