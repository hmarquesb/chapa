# Tasks

Cada tarefa de conferência lê o delta da capacidade, as fontes listadas no `design.md` e as specs históricas que tocam o assunto. Para cada cenário, anote no relatório o teste que o cobre (`arquivo › nome do it`) ou "manual". Se o delta não descrever o código, corrija o delta, nunca o código. Divergências com as specs históricas também vão para o relatório. Nenhuma tarefa chama API ou banco real.

## 1. guardrails

- [ ] 1.1 Conferir cada cenário de `specs/guardrails/spec.md` contra `src/core/guardrails.ts`, `src/core/messages.ts` e `src/core/assistant.ts`, e verificar que cada texto citado é idêntico ao do código (`grep -F` de cada citação em `src/core/messages.ts`)
- [ ] 1.2 Mapear cada cenário a um teste de `src/core/guardrails.test.ts` ou `src/core/assistant.test.ts`, ou marcá-lo como manual, e verificar que o mapa cobre todos os cenários do arquivo

## 2. retrieval

- [ ] 2.1 Conferir cada cenário de `specs/retrieval/spec.md` contra `src/core/rag/`, `src/config.ts`, `src/infra/db/chunk-repository.ts` e a função `match_chunks` da migração inicial, e verificar que nenhum valor de parâmetro calibrável do RAG aparece no delta (decisão 2 do `design.md`)
- [ ] 2.2 Mapear cada cenário a um teste de `src/core/rag/*.test.ts` ou `src/config.test.ts`, ou marcá-lo como manual (os que dependem do SQL), e verificar que o mapa cobre todos os cenários do arquivo

## 3. answer-generation

- [ ] 3.1 Conferir cada cenário de `specs/answer-generation/spec.md` contra `src/core/assistant.ts`, `src/core/prompts.ts`, `src/infra/llm/retry.ts` e `src/infra/llm/gemini-client.ts`, e verificar que o texto do fallback citado é idêntico a `FALLBACK_MESSAGE`
- [ ] 3.2 Mapear cada cenário a um teste de `src/core/assistant.test.ts`, `src/core/prompts.test.ts` ou `src/infra/llm/*.test.ts`, ou marcá-lo como manual, e verificar que o mapa cobre todos os cenários do arquivo

## 4. session-memory

- [ ] 4.1 Conferir cada cenário de `specs/session-memory/spec.md` contra `src/core/assistant.ts`, `src/core/memory.ts`, `src/core/rewrite-query.ts`, `src/infra/db/session-repository.ts` e `src/config.ts` (limites de memória), e verificar os números 16, 10, 6, 300 e 7 dias no código
- [ ] 4.2 Mapear cada cenário a um teste de `src/core/memory.test.ts`, `src/core/rewrite-query.test.ts`, `src/core/assistant.test.ts` ou `src/infra/db/mappers.test.ts`, ou marcá-lo como manual (os que dependem do banco), e verificar que o mapa cobre todos os cenários do arquivo

## 5. chat-api

- [ ] 5.1 Conferir cada cenário de `specs/chat-api/spec.md` contra `src/app/api/**`, `src/infra/db/rate-limit-repository.ts` e `vercel.json`, e verificar que cada texto de erro citado é idêntico ao de `src/app/api/_lib/errors.ts`
- [ ] 5.2 Mapear cada cenário a um teste de `src/app/api/_lib/*.test.ts`, ou marcá-lo como manual (build sem variáveis, RLS), e verificar que o mapa cobre todos os cenários do arquivo

## 6. chat-ui

- [ ] 6.1 Conferir cada cenário de `specs/chat-ui/spec.md` contra `src/app/page.tsx`, `src/app/layout.tsx`, `src/components/chat/*.tsx` e `src/lib/*.ts`, e verificar que cada texto citado aparece igual no código (`grep -rF` em `src/components/chat` e `src/lib`)
- [ ] 6.2 Mapear cada cenário a um teste de `src/lib/*.test.ts`, ou marcá-lo como manual (os visuais e de interação), e verificar que o mapa cobre todos os cenários do arquivo

## 7. evaluation

- [ ] 7.1 Conferir cada cenário de `specs/evaluation/spec.md` contra `scripts/eval.ts`, `scripts/eval/*.ts` e `eval/perguntas.json`, e verificar que as metas citadas batem com `TARGETS` em `scripts/eval/report.ts`
- [ ] 7.2 Mapear cada cenário a um teste de `scripts/eval/*.test.ts`, ou marcá-lo como manual, e verificar que o mapa cobre todos os cenários do arquivo

## 8. Verificação final

- [ ] 8.1 Rodar `npx openspec validate baseline-living-specs --strict` e verificar que a change é válida
- [ ] 8.2 Rodar `git diff --name-only main...HEAD` e verificar que só há arquivos em `openspec/changes/baseline-living-specs/`
- [ ] 8.3 Rodar `npm run lint`, `npm run typecheck` e `npm test` e verificar que os três passam (a change não toca código, então nada pode ter mudado)

## Workflow follow-up

- Depois do merge do PR #25, fazer o rebase desta branch sobre a `main` e abrir o PR com a base `main`, levando o mapa cenário → teste e as divergências encontradas na descrição.
- Depois do merge desta change, rodar `/opsx:archive` numa branch `docs/archive-baseline-living-specs` e abrir o PR `docs(openspec): archive baseline-living-specs`.
- Conferir que `npx openspec list --specs` mostra as sete capacidades depois do archive.
