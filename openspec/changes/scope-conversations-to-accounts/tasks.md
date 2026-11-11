# Tasks

Esta change só começa depois que a `add-google-and-demo-login` estiver mergeada e arquivada, com o worktree criado a partir da `main` atualizada. As tarefas **(autorização)** usam o banco `dev`, com a autorização prévia do `CLAUDE.md`. A 8.1 é o H5 parcial no `prod`.

## 1. Banco

- [ ] 1.1 Criar a migração com `npm run db -- migration new sessions_account_id` e o SQL da decisão 1. Verificar que o arquivo novo é o único em `supabase/migrations/` que aparece no `git status`.
- [ ] 1.2 **(autorização)** Aplicar no `dev` com o `db push --remote="$U"` do `DEPLOY.md`. Verificar que a coluna aceita nulo, que a FK tem `on delete cascade` (`db query --read-only` em `information_schema.referential_constraints`) e que o `--dry-run` seguinte não lista nada pendente.

## 2. Núcleo

- [ ] 2.1 Escrever os testes de `conversationTitle` (texto curto intacto, espaços juntados, 80 caracteres cortados em 60 com "…" e sem espaço antes dele, vazio vira "Conversa sem título") e de `sessionCleanupCutoffs` (30 e 7 dias), e depois implementar `src/core/conversations.ts`. Acrescentar o bloco `conversations` ao `src/config.ts` com o teste em `src/config.test.ts`. Verificar com `npm test -- conversations config`.
- [ ] 2.2 Acrescentar `SessionOwner`, `ConversationSummaryRecord`, `SessionRecord.accountId`, as portas novas, `HandleMessageInput.accountId`, `AccountRepository.delete` e `SessionNotFoundError` (decisão 2). Verificar com `npm run typecheck`, que deve apontar todos os chamadores a corrigir nas tarefas seguintes.
- [ ] 2.3 Escrever os testes do assistente com um `FakeSessions` que respeita o dono: o dono chega a `touch`, `listMessages`, `saveSummary` e `appendTurn`; `channel: "web"` com `accountId: null` lança erro; `channel: "cli"` com uma conta lança erro; `blocked_input` não chama `touch`. Depois, ajustar `src/core/assistant.ts`. Verificar com `npm test -- assistant`.

## 3. Repositórios

- [ ] 3.1 Escrever o teste de `toSessionRecord` com `account_id` (nulo e preenchido) e de `toConversationSummaryRecord`, e depois ajustar `mappers.ts`. Verificar com `npm test -- mappers`.
- [ ] 3.2 Reescrever `src/infra/db/session-repository.ts` com o dono em toda consulta (decisões 2 e 6) e acrescentar `delete` ao `account-repository.ts`. Verificar com `npm run typecheck` e com `git grep -n "from public.sessions\|public.messages" src/infra/db/session-repository.ts`: cada consulta tem o filtro do dono ou é o `deleteInactive`.

## 4. Autorização contra o banco

- [ ] 4.1 Criar `scripts/authz-check.ts` e a linha `authz-check` no `package.json` (decisão 7). Verificar com `git diff package.json` que só essa linha mudou.
- [ ] 4.2 **(autorização)** Rodar `npm run authz-check` contra o `dev`. Verificar: 9 ✅, saída `0`, a linha `Banco:` com um host `*.neon.tech`, e nenhuma conta de teste sobrando (`db query --read-only` com `count(*)` de `accounts` igual antes e depois).

## 5. API

- [ ] 5.1 Escrever os testes do `parseChatRequest` (sem `sessionId` é válido; com `sessionId` malformado dá 400 com "O identificador da conversa é inválido."; o campo desconhecido continua dando 400) e depois ajustar `validate.ts`. Verificar com `npm test -- validate`.
- [ ] 5.2 Escrever os testes do chat com o repositório falso que respeita o dono: sem `sessionId`, a resposta traz um UUID novo; `blocked_input` numa conversa nova traz `sessionId: null`; o `sessionId` de outra conta dá `404` com o texto fixo, sem chamar o assistente; o `SessionNotFoundError` lançado pelo assistente vira `404`. Depois, implementar o fluxo da decisão 4. Verificar com `npm test -- handlers`.
- [ ] 5.3 Escrever os testes do histórico (conversa de outra conta → `404` com o mesmo corpo de uma inexistente), da lista (só as conversas da conta, ordem, título cortado, `[]`) e do apagar (`204`; outra conta → `404`; id malformado → `400`; sem conta → `401`). Depois, implementar `createListSessionsHandler`, `createDeleteSessionHandler` e o histórico com dono. Verificar com `npm test -- handlers`.
- [ ] 5.4 Escrever o teste do cron (`deleteInactive` recebe `now - 30 dias` e `now - 7 dias`) e depois ajustar. Criar `src/app/api/sessions/route.ts` e `src/app/api/sessions/[id]/route.ts` e ajustar os `route.ts` existentes. Verificar com `npm run build` sem variáveis de ambiente.

## 6. Interface

- [ ] 6.1 Escrever os testes de `formatActivity` (mesmo dia → "14:05"; outro dia → "10/11"; ISO inválido → "") e de `listSessions` e `deleteSession` no `api-client.test.ts` (`204` → ok; `401`; corpo inesperado). Ajustar `isChatResponse` para o `sessionId` e reduzir `session-id.ts` e os testes dele a `isUuid`. Verificar com `npm test -- format api-client session-id`.
- [ ] 6.2 Gerar `src/components/ui/sheet.tsx` com `npx shadcn@<versão do lockfile> add sheet`. Verificar com `git diff package.json` que nada mudou.
- [ ] 6.3 Criar `conversation-list.tsx` e `delete-conversation-dialog.tsx` e reescrever o `chat-app.tsx` com os fluxos da decisão 5. Apagar o `continue-dialog.tsx` e ajustar `page.tsx` (`?sessao=` → `redirect("/")`), `layout.tsx` e `next.config.ts` (só os comentários). Verificar com `git grep -n "sessao\|ContinueDialog\|SESSION_STORAGE_KEY" src/` que só sobra o tratamento do `?sessao=` em `page.tsx`.
- [ ] 6.4 **(autorização)** Verificação manual no `npm run dev` com o `dev`, seguindo o `docs/qa.md`: duas demos em navegadores diferentes não veem as conversas uma da outra; a primeira resposta põe a conversa no topo da lista; escolher uma conversa carrega o histórico; apagar pede confirmação e, se era a conversa aberta, volta ao estado vazio; `/?sessao=<uuid>` abre o chat em `/` sem aviso; abaixo de 768 px, o botão "Conversas" abre o painel. Registrar no relatório.
- [ ] 6.5 Revisar a lista e o diálogo com a skill `web-design-guidelines` (navegação pelo teclado, `aria-current`, rótulo do botão de apagar, foco ao fechar o painel). Verificar que cada apontamento foi corrigido ou justificado no relatório.

## 7. Scripts e documentação

- [ ] 7.1 Ajustar `scripts/chat.ts` e `scripts/eval.ts` (decisão 7). **(autorização)** Verificar com `npm run chat -- --nome "Pizzaria Bella"` uma pergunta respondida, e com `npm run chat -- --sessao <id de uma conversa web do dev>` a mensagem "Esta conversa não existe ou não é do CLI.".
- [ ] 7.2 Escrever o teste de `checkSessionList` e o dos checks de chat com o `sessionId`, e depois ajustar o `smoke.ts` (decisão 7). **(autorização)** Verificar com `npm run smoke -- --url http://localhost:3000` contra o `npm run dev`: todos os passos ✅.
- [ ] 7.3 Escrever a ADR 0021, a linha dela no `docs/adr/README.md` e atualizar `AGENTS.md`, `docs/architecture.md`, `docs/business.md`, `docs/development.md`, `docs/qa.md` e `README.md` (decisão 8). Verificar com `git grep -n "link de continuação\|?sessao=\|Continuar depois" -- AGENTS.md README.md docs/architecture.md docs/business.md docs/qa.md` que só sobram menções históricas, cada uma citada no relatório.

## 8. Produção

- [ ] 8.1 **(autorização, H5 parcial)** Antes do merge, aplicar a migração no `prod` com `db push --remote --yes`, nos passos do `DEPLOY.md`. Verificar com `db query --read-only` que a coluna `account_id` existe e aceita nulo.
- [ ] 8.2 **(pessoa)** Depois do merge, rodar o smoke em produção (ou autorizar o orquestrador) e, no dia seguinte, conferir no log do cron que `deletedSessions` incluiu as conversas web antigas.

## 9. Verificação final

- [ ] 9.1 Rodar `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`. Verificar que os quatro passam e registrar no relatório os critérios de aceite, com a evidência de cada um.
