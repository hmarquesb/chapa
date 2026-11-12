# Tasks

## 1. Perguntas e validação

- [x] 1.1 Em `questions.test.ts`, escrever os casos novos antes do código: os três tipos, a distribuição de 62, `esperado` "conversa", `rota_esperada` ausente e incoerente com o tipo, `cumprimento` sem `perfil.name`, `deve_conter` obrigatório em `cumprimento` e `misto`
- [x] 1.2 Implementar os tipos, `CONVERSATION_TYPES`, `ExpectedRoute` e a validação em `scripts/eval/questions.ts` até a 1.1 passar
- [x] 1.3 Acrescentar `rota_esperada: "rag"` às 50 perguntas e as 12 novas (ids 151 a 162) do `design.md` ao `eval/perguntas.json`; `npm test -- questions` passa, inclusive o teste dos termos contra o `regras.yaml`

## 2. Métricas

- [x] 2.1 Em `metrics.test.ts`, escrever os casos com resultados fictícios: recusa sem os tipos de conversa; `routeMatches` e `falseSmallTalk` (inclusive `null` no erro e no bloqueio); acerto de `cumprimento`, `conversa` (com dígito falha) e `misto`; chamadas evitadas; latência média das curtas que foram para o RAG com `maxWords` 12 (`null` sem nenhuma)
- [x] 2.2 Implementar `scoreQuestion` e `aggregate` com `routing` e `ROUTE_TARGETS` até a 2.1 e os testes antigos passarem

## 3. Rodada, relatório e comparação

- [x] 3.1 Flag `--router on|off` com o padrão por preset e o `router` no config gravado e no terminal (`scripts/eval.ts`); `append.ts` compara o `router`; testes do `append` cobrem roteador diferente e rodada antiga sem `router`
- [x] 3.2 Seção "Rotas", coluna "Rota" e falhas de conversa no `report.ts`; `report.test.ts` confere o `.md` de uma rodada fictícia com 1 falso small talk
- [x] 3.3 Linhas de rota e de roteador no `compare.ts`, com "—" numa rodada sem `routing`; `compare.test.ts` cobre `v3` × `v4` e `v4` × `v4-regras` fictícias

## 4. Documentação

- [x] 4.1 Atualizar `docs/business.md` ("Metas de qualidade") e `docs/qa.md` ("Avaliação") conforme o `design.md`

## 5. Rodadas e resultados (orquestrador)

- [x] 5.1 Conferir os trechos do `baseline` no `dev` e, se faltarem, `npm run ingest -- --preset baseline`
- [x] 5.2 Rodada `v4` (`--preset padrao`) em blocos com `--append`, `--only` e `--delay-ms 4000`, até `Pendentes: nenhuma`; repetir uma vez as perguntas que terminarem em erro
- [x] 5.3 Rodadas `v4-regras` (`--preset padrao --router off`) e `v4-baseline` (`--preset baseline`), do mesmo jeito
- [x] 5.4 `npm run eval -- --compare` com `v3`, `v4`, `v4-regras` e `v4-baseline`; escrever a seção nova do `COMPARACAO.md`, com a explicação se o falso small talk não for 0 ou o acerto de rota ficar abaixo de 95%
- [x] 5.5 Atualizar o `README.md` ("Fluxo de uma requisição", "Avaliação", "Experimentos e aprendizados" e, se mudar, "Resumo executivo") com os números das rodadas

## 6. Portões

- [x] 6.1 `npm run lint`, `npm run typecheck` e `npm test` passam

## Workflow follow-up

- A pessoa revisa as 12 perguntas novas no PR antes das rodadas do grupo 5.
- Arquivar num PR `docs(openspec): archive eval-routing` depois do merge.
