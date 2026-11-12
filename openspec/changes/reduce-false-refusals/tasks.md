# Tasks

## 1. Avaliação: perguntas e métrica

- [x] 1.1 Em `questions.test.ts`, escrever os casos do tipo `aberta` (aceito com `esperado: "resposta"` e `rota_esperada: "rag"`; sem `deve_conter` falha) e da distribuição nova (73 perguntas); depois ajustar `EvalQuestionType`, `QUESTION_DISTRIBUTION`, `IN_SCOPE_TYPES` e os mapas de tipo em `questions.ts` até passar
- [x] 1.2 Acrescentar as perguntas 163 a 173 da tabela do `design.md` ao `eval/perguntas.json`, sem renumerar as existentes; `questions.test.ts` e `questions-rules.test.ts` passam com o arquivo real
- [x] 1.3 Em `metrics.test.ts`, escrever a tabela de `missingContextTerms` (termo presente sem acento, termo ausente, contexto vazio, termo dividido entre dois blocos não conta) e de `scoreQuestion` (`contextSufficient` e `failureCause` nos casos "arquivo certo, seção errada", "contexto tinha a resposta", "nenhum trecho", fora do escopo e rodada antiga sem `contextMissing`)
- [x] 1.4 Implementar `missingContextTerms`, `contextSufficient`, `failureCause` e `contextSufficiency` em `metrics.ts` até a 1.3 passar
- [x] 1.5 Em `runQuestions`, preencher `contextMissing` no último turno das perguntas do escopo com resposta; teste com dublê do assistente
- [x] 1.6 `report.ts` e `report.test.ts`: linha "Contexto suficiente" sem meta, causa na tabela e no detalhe das falhas, "no máximo 1 erro em 16"
- [x] 1.7 `compare.ts` e `compare.test.ts`: contexto suficiente com "—" nas rodadas antigas, linhas `contextMode` e `maxContextDocs`, rodada sem os campos contando como `chunks` e 3
- [x] 1.8 `append.ts` e `append.test.ts`: a junção recalcula o contexto suficiente a partir de `contextMissing` e recusa `contextMode` diferente

## 2. Config e tipos

- [x] 2.1 Em `config.test.ts`, escrever os casos de `contextMode` e `maxContextDocs` (valores dos dois presets, `maxContextDocs` 0 e 6 recusados com a mensagem da spec, `contextMode` inválido recusado, `chunkConfigKey` igual nos dois modos)
- [x] 2.2 Acrescentar os dois campos ao `RagConfig`, aos presets e ao `validateRag` até a 2.1 passar
- [x] 2.3 Acrescentar `ContextBlock`, `listBySources` e `AssistantReply.context` em `src/core/types.ts` e ajustar os fakes e os objetos montados à mão nos testes; `npm run typecheck` passa

## 3. Contexto por documento

- [x] 3.1 Escrever `src/core/rag/context.test.ts` antes do código: `selectSources` (ordem do score, arquivos repetidos, corte em `maxDocs`, lista vazia) e `assembleDocuments` (ordem dos arquivos, trechos unidos por linha em branco na ordem recebida, `section` vazia, arquivo sem trechos na releitura usa os da busca)
- [x] 3.2 Implementar `selectSources` e `assembleDocuments` até a 3.1 passar
- [x] 3.3 Testar e implementar `buildContext` com dublê do repositório: modo `chunks` e busca vazia não chamam `listBySources`; modo `documents` chama uma vez, com a chave do conjunto ativo e os arquivos escolhidos
- [x] 3.4 Implementar `listBySources` em `src/infra/db/chunk-repository.ts` (filtro por `embedding_model`, `chunk_config` e arquivos, ordem de id, lista vazia sem consulta)

## 4. Fluxo do turno, CLI e eval

- [x] 4.1 Em `prompts.test.ts`, escrever os casos de `buildRagPrompt` com `ContextBlock[]` (rótulo com e sem seção, blocos separados por `---`, pergunta original no fim); adaptar a função sem mudar as instruções nem os exemplos
- [x] 4.2 Em `assistant.test.ts`, escrever os casos: modo `documents` envia os documentos e devolve as fontes do contexto; arquivo fora do limite não vira fonte; modo `chunks` gera o mesmo prompt e as mesmas fontes de antes, sem releitura; busca vazia cai no fallback sem releitura e com `context: []`; erro na releitura não grava o turno; cumprimento, conversa e bloqueio devolvem `context: []`
- [x] 4.3 Ligar `buildContext` no `handleMessage` até a 4.2 e os testes antigos passarem
- [x] 4.4 `scripts/chat.ts`: linha "Contexto enviado" no `--debug` e as flags `--context` e `--max-docs`
- [x] 4.5 `scripts/eval.ts`: flags `--context` e `--max-docs` com as mensagens da spec, modo de contexto no cabeçalho do terminal e `reply.context` gravado como `{ source, section, chars }`

## 5. Checkpoint A: contexto por documento (orquestrador, com autorização)

- [x] 5.1 `npm run chat -- --plano misto --debug --context chunks` contra o `dev` com as quatro perguntas da proposta; colar os trechos, os scores e o status de cada uma na descrição do PR
- [x] 5.2 Rodada `v5-baseline` em blocos: `--label v5-baseline --preset padrao --context chunks --delay-ms 4000 --append`, até `Pendentes: nenhuma`
- [x] 5.3 Rodada `v5-docs` em blocos: `--label v5-docs --preset padrao --delay-ms 4000 --append`, até `Pendentes: nenhuma`
- [x] 5.4 `npm run eval -- --compare eval/resultados/v5-baseline.json eval/resultados/v5-docs.json`; repetir uma vez as perguntas que mudaram de resultado; aplicar o critério do passo 2 da proposta. Se não passar, voltar o `padrao` para `contextMode: "chunks"`. Registrar a decisão no `CALIBRACAO.md`

## 6. Prompt do RAG (só depois da 5.4)

- [x] 6.1 Em `prompts.test.ts`, escrever os casos: a instrução nova está no prompt; o Exemplo 3 existe e não tem dígitos; os exemplos 1 e 2, as quatro instruções atuais e o `SYSTEM_PROMPT` não mudaram
- [x] 6.2 Acrescentar a instrução e o Exemplo 3 em `src/core/prompts.ts` até a 6.1 passar

## 7. Checkpoint B: prompt e minScore (orquestrador, com autorização)

- [ ] 7.1 Rodada `v5-prompt` em blocos, com o `padrao`, até `Pendentes: nenhuma`; comparar com a `v5-docs`, repetir as perguntas que mudaram e aplicar o critério do passo 3. Se não passar, reverter o grupo 6. Registrar no `CALIBRACAO.md`
- [ ] 7.2 Rodada parcial `cal-v5-minscore-050`: `--min-score 0.5 --only <as 16 de recusa e as do escopo que, na v5-prompt, terminaram em fallback ou tiveram menos de 5 trechos>`; aplicar o critério do passo 4 e registrar no `CALIBRACAO.md`
- [ ] 7.3 Só se o critério da 7.2 passar: mudar o `minScore` do `padrao` para 0.50 em `src/config.ts` (com o comentário da calibração) e rodar a rodada completa `v5`
- [ ] 7.4 `npm run chat -- --plano misto --debug` com as quatro perguntas da proposta, na configuração final; colar o resultado na descrição do PR, ao lado do da 5.1

## 8. Documentação

- [ ] 8.1 Escrever a ADR 0027 e a linha no `docs/adr/README.md`
- [ ] 8.2 Atualizar `docs/architecture.md`, `docs/business.md`, `docs/qa.md` e `AGENTS.md` nas seções listadas no `design.md`
- [ ] 8.3 Atualizar o `README.md` nas seções listadas no `design.md`, com os números da rodada final e o resultado de cada passo (inclusive o que foi reprovado)
- [ ] 8.4 Atualizar `eval/resultados/COMPARACAO.md` com a seção "Contexto por documento (`v5`)"

## 9. Portões

- [ ] 9.1 `npm run lint`, `npm run typecheck` e `npm test` passam

## Workflow follow-up

- Os subagentes implementam os grupos 1 a 4, depois o 6 e depois o 8. Os grupos 5 e 7 são do orquestrador e precisam de autorização para as chamadas reais.
- Arquivar num PR `docs(openspec): archive reduce-false-refusals`, só depois do merge.
