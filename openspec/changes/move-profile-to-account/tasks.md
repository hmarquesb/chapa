# Tasks

Esta change só começa depois que a `scope-conversations-to-accounts` estiver mergeada, arquivada **e em produção**, porque a migração da decisão 8 depende disso. O worktree é criado a partir da `main` atualizada. As tarefas **(autorização)** usam o banco `dev` ou a API, com a autorização prévia do `CLAUDE.md`. A 9.1 é o H5 parcial no `prod`.

## 1. Plano em escolha fechada

- [x] 1.1 Escrever os testes de `src/lib/plans.ts`: `isPlanId`; `parsePlanId` com id, nome, maiúsculas, sem acento, sem "Plano " e um texto inválido; `profileSummary` com nome e plano, só plano, só nome e vazio; e `PLAN_LABELS` igual a `nomes.plano_*` do `regras.yaml`. Depois, implementar `PLAN_IDS`, `PlanId`, `PLAN_LABELS` e os tipos da decisão 1 em `src/lib/types.ts`, e as funções em `src/lib/plans.ts`. Verificar com `npm test -- plans`.
- [x] 1.2 Escrever os testes de `formatProfile` e `buildSystemInstruction` (o plano `misto` vira "Plano: Plano Misto"; um perfil com `plan: "proprio"` gera exatamente o mesmo texto que o perfil antigo `"Plano Próprio"` gerava) e de `toProfile` (plano fora do enum é descartado). Depois, ajustar `prompts.ts` e `mappers.ts`. Verificar com `npm test -- prompts mappers`.
- [x] 1.3 Trocar os 5 valores de `plan` em `eval/perguntas.json` e validar o plano em `scripts/eval/questions.ts`, com o teste do cenário "Plano fora da lista". Verificar com `npm test -- questions` e com `git diff eval/perguntas.json`, que deve mostrar só 5 linhas mudadas.

## 2. Banco

- [x] 2.1 Criar a migração com `npm run db -- migration new sessions_account_by_channel` e o SQL da decisão 8. Verificar que o arquivo novo é o único em `supabase/migrations/` que aparece no `git status`.
- [x] 2.2 **(autorização)** Antes de aplicar no `dev`, contar com `db query --read-only` as conversas `web` sem conta. Depois, aplicar com o `db push --remote="$U"` do `DEPLOY.md`. Verificar que a migração aplica sem erro e que um `insert` de teste de uma conversa `web` sem conta, numa transação desfeita com `rollback`, é recusado pelo check.
- [x] 2.3 Acrescentar `updateProfile` ao `AccountRepository` e ao `account-repository.ts`, e o `DEMO_PROFILE` ao `src/core/accounts.ts`, com o teste de que `createDemoAccount` recebe uma cópia e não o objeto congelado. Passar o perfil no `authorize` (`src/infra/auth/config.ts`). Verificar com `npm test -- accounts` e `npm run typecheck`.

## 3. Assistente

- [x] 3.1 Escrever os testes do assistente: na web, `accountProfile` vai para o prompt e `touch` é chamado sem `profile`; web com `profile` lança erro; web sem `accountProfile` lança erro; CLI com `accountProfile` lança erro; no CLI, `profile` continua substituindo o perfil da conversa. Depois, implementar a decisão 2. Verificar com `npm test -- assistant`.

## 4. API

- [x] 4.1 Escrever os testes do `parseChatRequest` (`profile` presente → `profileInAccount`) e do `parseProfileUpdate` (os cenários da spec `chat-api`, "Ler e salvar o perfil da conta", e a ordem de precedência da decisão 3). Depois, implementar. Verificar com `npm test -- validate`.
- [x] 4.2 Escrever os testes de `checkAccountDailyLimit` (a 60ª mensagem Google passa e a 61ª é recusada; a 30ª demo passa e a 31ª é recusada; bucket `account_day`; `Retry-After` até a meia-noite UTC; a chave é o id da conta) e depois implementar. Acrescentar `messagesPerAccountPerDay` ao `config.ts`, com o teste em `config.test.ts`. Verificar com `npm test -- rate-limit config`.
- [x] 4.3 Escrever os testes do chat: a recusa pelo IP não chama o limite da conta; o limite da conta devolve o texto certo por tipo; o assistente recebe `accountProfile` igual ao perfil da conta autenticada; o histórico não tem `profile`. Depois, ajustar `createChatHandler` e `createHistoryHandler`. Verificar com `npm test -- handlers`.
- [x] 4.4 Escrever os testes de `createProfileHandlers` (`GET`; `PUT` válido; `400`; `413`; `415`; `401`) e de `createDeleteAccountHandler` (`204` e `delete` chamado com o id da conta; `401`; erro de banco → `503`). Depois, implementar e criar `src/app/api/profile/route.ts` e `src/app/api/account/route.ts`. Verificar com `npm test -- handlers` e `npm run build` sem variáveis de ambiente.

## 5. Interface

- [x] 5.1 Escrever os testes de `saveProfile` e `deleteAccount` no `api-client.test.ts` e ajustar `sendMessage` e `isSessionHistory` (decisão 7). Apagar o `profile-storage.ts` e o teste dele. Verificar com `npm test -- api-client` e com `git grep -n "profile-storage\|localStorage" src/`, que não deve encontrar nada.
- [x] 5.2 Gerar `src/components/ui/radio-group.tsx` com `npx shadcn@<versão do lockfile> add radio-group`. Verificar com `git diff package.json` que nada mudou.
- [ ] 5.3 Reescrever o `profile-form.tsx`, criar `src/app/perfil/page.tsx` e o redirecionamento do primeiro acesso em `src/app/page.tsx`, e tirar o perfil do `chat-app.tsx`. Criar o `profile-summary.tsx`. Verificar no `npm run dev` com o `dev` **(autorização)**: a demo mostra "Marmitaria Boa Panela · Plano Misto"; "Editar perfil" abre o formulário preenchido; salvar sem plano não é possível; trocar o plano para Próprio e perguntar "Qual é a comissão do meu plano?" muda a resposta em relação ao Misto.
- [ ] 5.4 Criar o `delete-account-dialog.tsx` e acrescentar "Editar perfil" e "Excluir minha conta" ao `account-menu.tsx`. Verificar no `npm run dev` **(autorização)**: excluir uma demo leva a `/entrar`, e um `db query --read-only` com `count(*)` mostra que a conta e as conversas dela sumiram.
- [x] 5.5 Criar `src/app/privacidade/page.tsx` e os links "Privacidade" na entrada, no rodapé do chat e no perfil. Verificar que `/privacidade` abre sem login e que os prazos mostrados (7, 30, 180 e 7 dias) vêm do `config`.
- [x] 5.6 Revisar as telas novas com a skill `web-design-guidelines` (o grupo de rádio com legenda, as mensagens de erro ligadas aos campos, o foco do diálogo de exclusão, o contraste). Verificar que cada apontamento foi corrigido ou justificado no relatório.

## 6. Scripts

- [ ] 6.1 Ajustar o `--plano` do `scripts/chat.ts` (decisão 9). **(autorização)** Verificar com `npm run chat -- --nome "Pizzaria Bella" --plano misto` uma resposta que considera o Plano Misto, e com `--plano premium` a mensagem de erro.
- [ ] 6.2 Escrever o teste de `checkDemoProfile`, tirar o perfil do corpo do chat e acrescentar o passo `GET /api/profile` ao `smoke.ts`. **(autorização)** Verificar com `npm run smoke -- --url http://localhost:3000` contra o `npm run dev`: todos os passos ✅.

## 7. Documentação

- [ ] 7.1 Atualizar `AGENTS.md`, `docs/architecture.md`, `docs/business.md`, `docs/qa.md` e `README.md` (decisão 10). Verificar com `git grep -n "Perfil do restaurante (opcional)\|perfil opcional\|plano em texto livre" -- AGENTS.md README.md docs/architecture.md docs/business.md docs/qa.md`, que não deve encontrar nada.

## 8. Verificação com a API

- [ ] 8.1 **(pessoa)** Entrar com uma conta Google nova em `localhost`: a tela "Conte sobre o seu restaurante" aparece antes do chat, e só o plano é obrigatório.
- [ ] 8.2 **(autorização)** Rodar `npm run eval -- --label perfil-enum --only <ids das 5 perguntas perfil> --delay-ms 4000` contra o `dev`, seguindo o `docs/qa.md`. Verificar que os acertos das 5 perguntas são iguais aos da última rodada registrada em `eval/resultados/`. Se algum mudar, registrar no relatório a pergunta, a resposta e por que a mudança não vem desta change (o prompt é idêntico, pela tarefa 1.2).

## 9. Produção

- [ ] 9.1 **(autorização, H5 parcial)** Antes do merge, aplicar a migração no `prod` com `db push --remote --yes`, nos passos do `DEPLOY.md`. Antes, contar com `db query --read-only` as conversas `web` sem conta, e registrar o número no relatório.
- [ ] 9.2 **(pessoa)** Depois do merge, testar em produção o primeiro acesso com Google, a demo com o perfil de exemplo e "Excluir minha conta", e rodar o smoke (ou autorizar o orquestrador).

## 10. Verificação final

- [ ] 10.1 Rodar `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`. Verificar que os quatro passam e registrar no relatório os critérios de aceite do PRD (§7) que esta change fecha, com a evidência de cada um.
