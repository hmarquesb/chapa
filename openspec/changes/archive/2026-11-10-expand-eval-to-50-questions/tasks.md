# Tasks

**Ordem:** comece só depois do merge da `add-rango-knowledge-base`, com a branch rebaseada na `main` (`git rebase main`). O grupo 6 (rodada `v3`) só roda com a `rebrand-app-texts-to-rango` também na `main`. As tarefas marcadas **(autorização)** chamam o banco `dev` e a API do Gemini, já autorizados no `CLAUDE.md` (eval com `--delay-ms` e `--only`). Nenhuma tarefa toca o `prod`. As decisões citadas são as do `design.md`.

## 1. Tipos e validação

- [x] 1.1 Acrescentar a `scripts/eval/questions.test.ts` os casos da decisão 2: distribuição nova (16 `factual` → mensagem de 15), `adversarial` com `esperado` `recusa`, `perfil` com `esperado` `resposta` e no escopo, `perfil` sem `plan`, `nao_deve_conter` vazio, com 6 termos e com texto vazio, documento sem pergunta `factual`. Verificar que os casos novos falham.
- [x] 1.2 Implementar a decisão 2 em `scripts/eval/questions.ts`. Verificar que os casos da tarefa 1.1 passam. O teste com o `eval/perguntas.json` real vai falhar até o grupo 5; marcar esse caso com `it.todo` só durante o desenvolvimento e reativá-lo na tarefa 5.2.

## 2. Pontuação e relatório

- [x] 2.1 Acrescentar a `scripts/eval/metrics.test.ts` os casos da decisão 3 (termo proibido no escopo, termo proibido numa recusa, `adversarial` com `blocked_input` e com `fallback`, `forbiddenFound` vazio sem resposta) e implementar em `scripts/eval/metrics.ts`. Verificar que `npx vitest run scripts/eval/metrics.test.ts` passa.
- [x] 2.2 Acrescentar a `scripts/eval/report.test.ts` os casos da decisão 4 (meta "≥ 92%" com 13 de 14, os motivos novos de falha e o `expectedText` do `adversarial` e do `nao_deve_conter`) e implementar em `scripts/eval/report.ts`. Verificar que `npx vitest run scripts/eval/report.test.ts` passa.
- [x] 2.3 Trocar a primeira frase do `JUDGE_PROMPT` (decisão 7). Verificar que `npx vitest run scripts/eval/judge.test.ts` passa e que `git grep -n "app de delivery" scripts/` não encontra nada.

## 3. Rodada em blocos

- [x] 3.1 Escrever `scripts/eval/append.test.ts` com os cenários da spec "Rodada em blocos" e da decisão 5 (segundo bloco, pergunta substituída, configuração diferente, pergunta alterada descartada, pergunta que saiu do arquivo, ordem pelo `perguntas.json`, commits juntados, pendentes, arquivo ilegível). Verificar que falha porque o módulo não existe.
- [x] 3.2 Implementar `scripts/eval/append.ts` com as assinaturas exatas da decisão 5. Verificar que o teste da tarefa 3.1 passa.
- [x] 3.3 Ligar o `--append` em `scripts/eval.ts`: checagem antes da primeira chamada e junção depois da rodada, inclusive no parcial por cota. Verificar com `npm run eval -- --label v2 --append --min-score 0.5 --only 101` (a `v2` foi gravada com `minScore` 0.55) que o erro de configuração diferente aparece sem a linha `Banco:` (nenhuma conexão) e que `git status eval/resultados/` continua limpo, e conferir no código que o caminho sem `--append` não mudou (`git diff scripts/eval.ts`).

## 4. Termos contra o `regras.yaml`

- [x] 4.1 Escrever `scripts/eval/questions-rules.test.ts` (decisão 6). Verificar com uma fixture inline (`"12%"`) que a falha aponta a pergunta e o termo.

## 5. As 50 perguntas

- [x] 5.1 Reescrever `eval/perguntas.json` com os ids 101 a 150 e a matriz da decisão 8. Verificar com `npx vitest run scripts/eval/` que a validação real passa (distribuição, cobertura por documento, `perfil` com plano) e que o teste do `regras.yaml` passa.
- [x] 5.2 Reativar o caso com o `perguntas.json` real em `questions.test.ts`, se tiver sido marcado como `todo`. Verificar que `npm test` passa por inteiro.
- [x] 5.3 **(pessoa)** Revisar as 50 perguntas no PR, em especial as `adversarial` e as `perfil`. O orquestrador marca esta tarefa quando a pessoa aprovar.

## 6. Rodada `v3`

- [x] 6.1 Confirmar que a branch está rebaseada numa `main` com as três changes (`git log --oneline main -5`) e que o `dev` tem a base da Rango no preset `padrao`. **(autorização)** Se não tiver, rodar `npm run ingest` e esperar 90 s. Verificar: a contagem por arquivo lista os 11 documentos.
- [x] 6.2 **(autorização)** Rodar a `v3` em blocos de 10, como na decisão 9, até `Pendentes: nenhuma`. Repetir uma vez as perguntas que terminaram em erro. Verificar que `eval/resultados/v3.json` tem 50 resultados e registrar no relatório os blocos, as esperas por cota e os commits envolvidos.
- [x] 6.3 Atualizar o `COMPARACAO.md` (decisão 9). Se alguma meta não foi atingida, explicar com as perguntas que falharam. Verificar que a tabela antiga continua intacta embaixo (`git diff eval/resultados/COMPARACAO.md`).

## 7. Documentação

- [x] 7.1 Atualizar `docs/qa.md`, `docs/business.md` e `README.md` como na decisão 10, com os números reais da `v3`. Verificar que os comandos do `qa.md` são os que rodaram na tarefa 6.2 e que `git grep -n "Plano Básico" -- docs/qa.md README.md` só encontra trechos marcados como "(base anterior)".

## 8. Verificação final

- [x] 8.1 Rodar `npx openspec validate expand-eval-to-50-questions --strict` e verificar que a change é válida.
- [x] 8.2 Rodar `npm run lint`, `npm run typecheck` e `npm test` e verificar que os três passam.

## Workflow follow-up

- Depois do merge, arquivar a change num PR próprio (`docs(openspec): archive expand-eval-to-50-questions`). Pode ir no mesmo PR de archive das outras duas, se elas ainda não tiverem sido arquivadas.
- Remover o worktree `../chapa-worktrees/expand-eval-to-50-questions` e a branch `feat/expand-eval-to-50-questions`.
