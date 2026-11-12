# Tasks

## 1. Prompt do RAG

- [x] 1.1 Acrescentar ao `src/core/prompts.test.ts` testes de que `buildRagPrompt` traz a instrução sobre maiúsculas e minúsculas (com "financeiro" e "Financeiro"), continua com a regra do fallback exato e com os três exemplos; verificar que o teste novo falha
- [x] 1.2 Acrescentar a instrução em `buildRagPrompt` (`src/core/prompts.ts`), depois da instrução de palavras diferentes, com o texto do `design.md` (decisão 1); verificar que `npm test -- src/core/prompts` passa
- [x] 1.3 Acrescentar o Exemplo 4 do `design.md` (decisão 2) aos `FEW_SHOT_EXAMPLES`, com teste de que ele vem depois do Exemplo 3, cita a área em minúsculas e não tem dígitos; verificar que `npm test -- src/core/prompts` passa

## 2. Avaliação

- [x] 2.1 Atualizar `scripts/eval/questions.test.ts` para 11 paráfrases (fixtures e mensagens de erro); verificar que os testes falham com a distribuição antiga
- [x] 2.2 Mudar `QUESTION_DISTRIBUTION` para `parafrase: 11` e o comentário para 74 perguntas (46 no escopo) em `scripts/eval/questions.ts`
- [x] 2.3 Acrescentar a pergunta 174 ao fim de `eval/perguntas.json`, com os campos do `design.md` (decisão 3); verificar que `npm test -- scripts/eval` passa (inclusive `questions-rules.test.ts`)

## 3. Documentação

- [x] 3.1 Atualizar `docs/qa.md` ("Avaliação") e `docs/business.md` ("Metas de qualidade") com 74 perguntas, 46 no escopo e ids 101 a 174
- [x] 3.2 Atualizar o `README.md` nas seções listadas no `design.md`; verificar com `grep -n "73 perguntas"` que só sobram menções às rodadas da `v5`

## 4. Verificação manual (orquestrador)

- [x] 4.1 `npm run eval -- --label v6-174 --preset padrao --only 174` no `dev`; a 174 termina respondida e com os termos esperados (se falhar, repetir uma vez antes de contar)

## 5. Portões

- [x] 5.1 Rodar `npm run lint`, `npm run typecheck` e `npm test` no worktree; todos passam

## Workflow follow-up

- Arquivar a change com `/opsx:archive` num PR `docs(openspec): archive case-insensitive-questions`.
