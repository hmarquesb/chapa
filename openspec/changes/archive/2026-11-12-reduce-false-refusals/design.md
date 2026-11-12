# Design

## Context

- `handleMessage` (`src/core/assistant.ts`) chama `retrieve`, que devolve até `topK` trechos acima do `minScore`, e passa esses trechos direto a `buildRagPrompt`. As fontes vêm de `uniqueSources(results)`.
- Cada trecho gravado em `document_chunks` já começa com o cabeçalho `<Título> — <Seção>`. Hoje nenhuma seção passa do `chunkSize`, então não há janelas com sobreposição no banco.
- `chunkConfigKey` usa só estratégia, tamanho e sobreposição: um parâmetro novo no `RagConfig` não muda o conjunto de trechos.
- O eval grava cada trecho com 150 caracteres, e o `--append` recalcula a pontuação a partir do `.json`. Por isso a métrica nova não pode depender do texto do contexto gravado.
- O `appendRun` recusa a junção quando `config.rag` difere. Rodadas gravadas antes desta change não têm os dois campos novos e não aceitam mais `--append`.

## Goals / Non-Goals

**Goals:** a escolha e a remontagem dos documentos são funções puras, testadas por tabela; com `contextMode: "chunks"`, o turno é idêntico ao de hoje (mesmo prompt, mesmas fontes, nenhuma consulta a mais); cada passo pode ser medido e desfeito sozinho.

**Non-Goals:** resposta parcial; calibrar `topK` ou `maxContextDocs` além de um valor; guardar os documentos em tabela própria.

## Decisions

### 1. Contratos

```ts
// src/config.ts — RagConfig ganha:
contextMode: "chunks" | "documents"   // padrao: "documents"; baseline: "chunks"
maxContextDocs: number                // inteiro de 1 a 5; padrao e baseline: 3
export type ContextMode = RagConfig["contextMode"]

// src/core/types.ts
export type ContextBlock = { source: string; section: string; content: string }
export interface ChunkRepository {
  // ...métodos atuais
  listBySources(key: ChunkSetKey, sources: string[]): Promise<Chunk[]>   // ordem de id
}
export type AssistantReply = {
  // ...campos atuais
  context: ContextBlock[]   // o que foi enviado ao modelo; [] sem geração. A API não expõe.
}

// src/core/rag/context.ts (novo)
export function selectSources(results: RetrievedChunk[], maxDocs: number): string[]
export function assembleDocuments(
  sources: string[], stored: Chunk[], results: RetrievedChunk[],
): ContextBlock[]
export function buildContext(input: {
  results: RetrievedChunk[]
  config: AppConfig
  chunks: ChunkRepository
}): Promise<ContextBlock[]>

// src/core/prompts.ts
export function buildRagPrompt(question: string, context: ContextBlock[]): string

// scripts/eval/questions.ts
export type EvalQuestionType = /* ...atuais */ | "aberta"

// scripts/eval/metrics.ts
export type QuestionResult = {
  // ...campos atuais
  contextMissing?: string[]   // termos de deve_conter ausentes do contexto; só no escopo
}
export type FailureCause = "busca" | "geracao"
export type QuestionScore = {
  // ...campos atuais
  contextSufficient: boolean | null   // null: fora do escopo, erro ou rodada antiga
  failureCause: FailureCause | null   // só no escopo, quando correct === false
}
export type Metrics = {
  // ...campos atuais
  contextSufficiency?: number | null  // 0 a 1; ausente ou null em rodadas antigas
}
export function missingContextTerms(terms: string[], context: ContextBlock[]): string[]
```

`validateRag` recusa `contextMode` fora dos dois valores e `maxContextDocs` fora de 1 a 5, com as mensagens da spec delta de `retrieval`.

### 2. Escolha e remontagem dos documentos

- `selectSources` percorre `results` (já ordenado por score) e devolve os arquivos únicos, na ordem em que aparecem, até `maxDocs`.
- `buildContext`, no modo `chunks` ou com `results` vazio, devolve os próprios trechos como blocos e não consulta o banco. No modo `documents`, chama `listBySources` uma vez e passa o resultado a `assembleDocuments`.
- `assembleDocuments` devolve um bloco por arquivo, na ordem de `sources`, com `section: ""` e o `content` igual aos trechos do arquivo unidos por linha em branco, na ordem recebida. Se `stored` não tiver nenhum trecho de um arquivo, o bloco usa os trechos dele em `results`.
- **Por que remontar do banco, e não ler `knowledge-base/` do disco:** o `core` não lê arquivos, a Vercel precisaria empacotar a pasta, e o banco é o que foi de fato ingerido em cada ambiente. **Alternativa descartada:** tabela `documents`, que pede migração e reingestão sem ganho para 11 arquivos.
- **Por que 3 documentos:** as perguntas `multi_doc` esperam 2 arquivos, e nas paráfrases da `v4` o arquivo certo nem sempre é o primeiro (121). Três documentos somam de 11 a 17 mil caracteres. **Alternativa descartada:** a base inteira em toda pergunta (48,6 mil caracteres), que tira o sentido da busca e triplica de novo o consumo.
- **Limite conhecido:** uma seção maior que o `chunkSize` é gravada em janelas com sobreposição, e a remontagem repetiria o texto da sobreposição. Hoje nenhuma seção chega lá. O ADR registra o limite.

### 3. Consulta `listBySources`

`select source, section, content from document_chunks` filtrando por `embedding_model`, `chunk_config` e `source = any(...)`, com `order by id`. Sem `sources`, devolve `[]` sem consultar. Não cria função SQL nem migração.

### 4. Turno, fontes, CLI e log

- Em `handleMessage`, depois de `retrieve` e só com `results` não vazio: `buildContext`, depois `buildRagPrompt(message, context)`. Um erro em `buildContext` sobe como o da busca, sem gravar o turno.
- As fontes passam a ser os arquivos únicos de `context`, na ordem. `reply.retrieved` continua com os trechos e os scores.
- Todo retorno de `handleMessage` ganha `context` (`[]` nos caminhos sem geração).
- `scripts/chat.ts`, no `--debug`: depois dos trechos, uma linha `Contexto enviado: <n> blocos, <caracteres> caracteres: <arquivos>`. Flags novas `--context` e `--max-docs`, com a mesma validação do eval.
- `handlers.ts` não muda: ele já escolhe campo a campo o que sai na resposta.

### 5. Prompt do RAG (só acréscimos)

- `buildRagPrompt` rotula cada bloco com `[Fonte: <arquivo> › <seção>]` ou, com a seção vazia, `[Fonte: <arquivo>]`.
- Uma instrução nova, depois das quatro atuais: "A pergunta pode usar palavras diferentes das do contexto (gíria, sinônimo ou jeito informal). Se o contexto trata do assunto perguntado, responda com o que ele diz."
- `FEW_SHOT_EXAMPLES` ganha o Exemplo 3, fictício e sem números: o contexto diz onde se ajusta o tempo de preparo no Painel Rango, a pergunta é "onde eu mexo pra dar mais prazo pra cozinha?", e a resposta usa o contexto. Os exemplos 1 e 2 não mudam.
- `SYSTEM_PROMPT`, `FALLBACK_MESSAGE` e a regra `includesNormalized` do `assistant.ts` não mudam.
- **Por que só acrescentar:** as 16 perguntas de recusa passam hoje. Tirar a regra do fallback ou o exemplo 2 mexe no que funciona; acrescentar o caso que falha (vocabulário diferente) é a menor mudança que ataca as falhas de causa `geração`.

### 6. Avaliação

- `QUESTION_DISTRIBUTION`: `parafrase` 10, `perfil` 6, `aberta` 4, `fora_de_escopo` 9; o resto igual. `aberta` entra em `IN_SCOPE_TYPES`, com `esperado: "resposta"` e `rota_esperada: "rag"`.
- `runQuestions` calcula `contextMissing` no último turno das perguntas do escopo com resposta, com `missingContextTerms(deve_conter, reply.context)` (mesma comparação de `includesNormalized`). `scoreQuestion` lê só esse campo: `contextSufficient` é `contextMissing.length === 0` (e `false` com contexto vazio); `failureCause` é `"busca"` quando `contextSufficient === false` e `"geracao"` quando é `true`.
- `scripts/eval.ts` grava `reply.context` reduzido a `{ source, section, chars }` e aceita `--context` e `--max-docs`.
- `report.ts`: linha "Contexto suficiente" sem meta, coluna de causa na tabela e no detalhe das falhas, e `TARGETS.correctRefusal` descrito como "no máximo 1 erro em 16". `compare.ts`: a métrica nova e as linhas `contextMode` e `maxContextDocs`, com rodada antiga contando como `chunks` e 3.

Perguntas novas (o texto da `nota` fica com o implementador; os termos com número e unidade precisam existir no `regras.yaml`):

| Id | Tipo | Pergunta | `fonte_esperada` | `deve_conter` | Extra |
|---|---|---|---|---|---|
| 163 | `parafrase` | Esqueci minha senha do Painel Rango, como troco? | `10` | "Esqueci minha senha" | — |
| 164 | `parafrase` | Como falo com o Financeiro? | `09` | "chamado", "Ajuda" | — |
| 165 | `parafrase` | quanto a Rango cobra pra adiantar a grana das vendas? | `02` | "2,49%" | — |
| 166 | `parafrase` | o cliente pagou no pix, vocês descontam quanto? | `01` | "1,5%" | — |
| 167 | `aberta` | Como devo montar meu cardápio? | `04` | "categorias" | — |
| 168 | `aberta` | O que eu preciso saber sobre o repasse? | `02` | "quarta" | — |
| 169 | `aberta` | Como funciona o suporte da Rango? | `09` | "chat", "chamado" | — |
| 170 | `aberta` | Quais cuidados devo ter com a segurança da minha conta? | `10` | "2 etapas" | — |
| 171 | `perfil` | Quero saber qual a diferença de preço do meu plano para o mais básico. Estou pensando em mudar | `01` | "139", "99" | perfil com `plan: "misto"` |
| 172 | `fora_de_escopo` | Dá para parcelar a mensalidade do plano em duas vezes? | — | — | — |
| 173 | `fora_de_escopo` | Qual é a comissão do Plano Premium? | — | — | `nao_deve_conter`: "11%", "22%" |

### 7. Ordem de implementação e pontos de decisão

O código dos grupos 1 a 4 entra de uma vez, com o `padrao` em `documents`. As rodadas `v5-baseline` (`--context chunks`) e `v5-docs` rodam sobre esse código, antes do grupo do prompt. Se o passo 2 não passar no critério da proposta, o `padrao` volta para `chunks` e o resto da change segue. O grupo do prompt só começa depois da decisão do passo 2, e o `minScore` só é testado depois da decisão do passo 3. Um passo reprovado vira uma linha no `CALIBRACAO.md` com o motivo.

### 8. ADR e documentação

- `docs/adr/0027-busca-por-trecho-contexto-por-documento.md`: contexto (os números do "Why"), decisão, alternativas (trechos maiores, palavras-chave por documento, menu de assuntos, base inteira, tabela `documents`) e consequências (consumo, limite da sobreposição, fontes). Linha nova em `docs/adr/README.md`.
- `docs/architecture.md`: em "Arquitetura do projeto", o item "Fluxo de uma mensagem" ganha "montagem do contexto" entre a busca e a geração; em "Banco de dados", o item da busca híbrida ganha a releitura dos documentos.
- `docs/business.md`, "Metas de qualidade": as contagens (73, 45, 16, 12), "no máximo 1 erro em 16" e a linha do contexto suficiente, sem meta.
- `docs/qa.md`, "Avaliação": as contagens e os ids (101 a 173), o tipo `aberta`, as flags `--context` e `--max-docs`, a tabela de rodadas da `v5`, o valor de cada pergunta (2,2 pontos) e a linha de base nova.
- `AGENTS.md`, tabela "Onde mexer": a linha "Busca, ranking, chunking, ingestão" ganha `context`; a linha "Parâmetro do RAG" ganha `contextMode` e `maxContextDocs`.
- `README.md`: "Resumo executivo" (tabela de resultados), "Pipeline RAG", "Avaliação" (métricas e tabela de rodadas), "Experimentos e aprendizados", "Falhas encontradas" e "Limitações e próximos passos".
- `eval/resultados/CALIBRACAO.md`: seção nova com uma linha por passo. `eval/resultados/COMPARACAO.md`: seção nova "Contexto por documento (`v5`)".

### Arquivos que a change pode criar ou alterar

- Novos: `src/core/rag/context.ts`, `src/core/rag/context.test.ts`, `docs/adr/0027-busca-por-trecho-contexto-por-documento.md` e os arquivos das rodadas em `eval/resultados/`.
- Alterados: `src/config.ts` e `config.test.ts`; `src/core/types.ts`; `src/core/prompts.ts` e `prompts.test.ts`; `src/core/assistant.ts` e `assistant.test.ts`; `src/core/rag/retrieve.test.ts` e os outros testes que montam `RagConfig`, `ChunkRepository` ou `AssistantReply` à mão; `src/infra/db/chunk-repository.ts`; `scripts/chat.ts`; `scripts/eval.ts`; `scripts/eval/questions.ts`, `metrics.ts`, `report.ts`, `compare.ts`, `append.ts` e os testes deles; `scripts/smoke-checks.ts` e o teste, se montarem `AssistantReply`; `eval/perguntas.json`; e os documentos da seção 8.

## Risks / Trade-offs

- [Mais contexto pode fazer o modelo responder o que devia recusar] → 2 perguntas novas de recusa próximas do tema, e o critério do passo 2 exige as 16 recusas intactas.
- [O prompt novo pode afrouxar a recusa] → só acréscimos, critério próprio e reversão do grupo.
- [`minScore` menor deixa passar mais perguntas fora do escopo] → um único valor, 0.50, e só entra sem mudança em nenhuma recusa.
- [Consumo e latência maiores] → cerca de 3 vezes mais tokens de entrada na geração; p50 e p95 comparados entre `v5-baseline` e `v5-docs`.
- [Ruído da rodada] → cada pergunta do escopo vale 2,2 pontos; uma pergunta que muda é repetida antes de contar.
- [Termo comum demais no "contexto suficiente"] → termos como "chamado" aparecem em muitos documentos, e a métrica fica otimista nessas perguntas. Ela é diagnóstico, sem meta.

## Migration Plan

Sem banco e sem reingestão. Deploy normal depois do merge. Rollback: `contextMode: "chunks"` e `minScore: 0.55` no preset `padrao`, num commit, ou reverter o PR.
