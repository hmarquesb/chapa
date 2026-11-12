# Proposal

## Why

O Chapa cai no fallback em perguntas que a base responde, quando elas não usam as palavras do texto. Na `v4`, 3 das 6 paráfrases terminaram em fallback, e perguntas reais como "Como devo montar meu cardápio?", "Como falo com o Financeiro?" e "Esqueci minha senha do Painel Rango, como troco?" também. A análise dos resultados gravados em `eval/resultados/` aponta quatro causas:

1. **O modelo recebe pouco contexto.** O fatiamento corta por seção `## `, e a base de 11 documentos (48,6 mil caracteres) vira 117 trechos com mediana de 405 caracteres. Nenhum passa de 1.073, então o `chunkSize` de 1.200 nunca é atingido. Com `topK` 5, o modelo vê cerca de 2 mil caracteres.
2. **A busca acha o arquivo certo, mas nem sempre a seção certa.** Na pergunta 116 da `v4`, vieram 5 trechos de planos e repasse, e a seção "Retirada no balcão", que tem os 6%, ficou de fora. O modelo recusou porque a resposta não estava no contexto.
3. **O Hit@K não mostra isso**, porque conta o acerto por arquivo. Das 5 falsas recusas da `v4`, 2 não tinham os termos esperados no contexto (116 e 121) e 3 tinham, e o modelo recusou assim mesmo (119, 124 e 134).
4. **O conjunto de perguntas é parecido demais com o texto da base:** 15 perguntas factuais e só 6 paráfrases.

Esta change corrige a régua primeiro e depois mexe no comportamento em três passos pequenos, cada um medido numa rodada própria e com critério de aceite. O passo que não passar no critério não entra.

## What Changes

- **Avaliação (passo 1):** o conjunto vai de 62 para 73 perguntas (ids 163 a 173): mais 4 `parafrase`, 4 do tipo novo `aberta` (pergunta ampla, com a resposta espalhada por várias seções de um documento), 1 `perfil` e 2 `fora_de_escopo` próximas do tema, que protegem a recusa. As quatro perguntas que motivaram a change entram no conjunto.
- **Métrica nova "contexto suficiente":** sobre as perguntas do escopo, a fração em que todos os termos de `deve_conter` estão no texto enviado ao modelo. O relatório passa a dizer, em cada falha, se a causa foi a **busca** (o contexto não tinha os termos) ou a **geração** (tinha, e o modelo não respondeu). Não tem meta: é diagnóstico. O Hit@K continua igual.
- **Contexto por documento (passo 2):** a busca não muda. Os trechos que passam do `minScore` elegem até 3 arquivos, pela ordem do melhor score, e o modelo recebe esses documentos inteiros, remontados a partir dos trechos já gravados no banco. Dois parâmetros novos no preset: `contextMode` (`chunks` ou `documents`) e `maxContextDocs`. O `padrao` passa a usar `documents` com 3; o `baseline` fica em `chunks`. Sem migração e sem reingestão.
- **Fontes da resposta:** passam a ser os documentos enviados ao modelo (no máximo 3), e não mais os arquivos de todos os trechos recuperados.
- **Prompt do RAG (passo 3, só acréscimos):** uma instrução nova ("a pergunta pode usar palavras diferentes das do contexto") e um terceiro exemplo fictício, de uma pergunta informal respondida pelo contexto. Nada é removido: a regra do fallback exato, o exemplo de fallback e a instrução de sistema ficam como estão.
- **`minScore` (passo 4):** candidato único, de 0.55 para 0.50, testado só nas perguntas afetadas. Entra só se nenhuma pergunta de recusa mudar de resultado e alguma pergunta do escopo melhorar. Nenhum valor abaixo de 0.50 é testado nesta change.
- **Eval:** flags `--context chunks|documents` e `--max-docs <n>`; a comparação entre rodadas mostra os dois parâmetros e o "contexto suficiente".
- **CLI:** o `--debug` do `npm run chat` mostra os documentos enviados ao modelo e o tamanho do contexto.
- **ADR 0027** "Busca por trecho, contexto por documento".
- `docs/architecture.md`, `docs/business.md`, `docs/qa.md`, `AGENTS.md`, `README.md`, `eval/resultados/CALIBRACAO.md` e `eval/resultados/COMPARACAO.md` atualizados.

## Critérios de aceite de cada passo

Cada passo é comparado com a rodada anterior. Uma pergunta que muda de resultado é repetida uma vez antes de contar, porque a rodada é ruidosa.

| Passo | Rodada | Entra se | Se não passar |
|---|---|---|---|
| 2. Contexto por documento | `v5-docs` contra `v5-baseline` | O contexto suficiente sobe, a falsa recusa não sobe e nenhuma das 16 perguntas de recusa passa a ser respondida | O `padrao` fica em `chunks`; o código do modo `documents` fica, desligado |
| 3. Prompt | `v5-prompt` contra `v5-docs` | Nenhuma das 16 perguntas de recusa passa a ser respondida, e o acerto não cai | O grupo do prompt é revertido |
| 4. `minScore` 0.50 | `cal-v5-minscore-050` contra `v5-prompt` | Nenhuma pergunta de recusa muda de resultado e pelo menos uma do escopo melhora | Fica 0.55 |

A change é entregue mesmo que a falsa recusa continue acima da meta de 10%: o resultado de cada passo vai para o `CALIBRACAO.md` e para o README.

## Fora do escopo

- **Resposta parcial** ("responda o que o contexto sustenta e diga o que falta"). É a mudança de prompt com mais risco para a recusa correta. Fica para uma change própria, se a falsa recusa continuar acima da meta depois desta.
- Trocar o modelo de resposta ou o nível de *thinking* (ADR 0014 continua valendo).
- Menu de assuntos antes da pergunta, ou sugestões de pergunta na tela.
- Mudar o fatiamento, a fórmula do score híbrido, o `topK`, o `alpha`, a reescrita ou a regra "resposta que contém o fallback vira fallback".
- Remover o corte por `minScore` (a regra 6 de IA e RAG do `AGENTS.md` continua valendo).
- Enviar a base inteira ao modelo em toda pergunta.
- Mudanças na interface, na API e no banco.

## Chamadas reais e checkpoints humanos

Nenhum subagente faz chamada real. Todas as rodadas são do orquestrador, contra o `dev`, com autorização prévia e em blocos com `--append` e `--delay-ms 4000` ([`docs/qa.md`](../../../docs/qa.md#avaliação)).

1. **Diagnóstico inicial:** `npm run chat -- --plano misto --debug --context chunks` com as quatro perguntas que motivaram a change, para registrar os trechos e os scores de hoje. Cerca de 10 chamadas.
2. **`v5-baseline`:** rodada completa das 73 perguntas com `--context chunks`. É o comportamento de hoje, medido com a régua nova.
3. **`v5-docs`:** rodada completa com o `padrao` (modo `documents`). Decisão do passo 2.
4. **`v5-prompt`:** rodada completa depois do grupo do prompt. Decisão do passo 3.
5. **`cal-v5-minscore-050`:** rodada parcial com `--min-score 0.5 --only <ids>`, nas 16 perguntas de recusa e nas do escopo que, na `v5-prompt`, terminaram em fallback ou tiveram menos de 5 trechos. Decisão do passo 4.
6. **`v5`:** rodada completa final, só se o `minScore` mudar. Se não mudar, a `v5-prompt` é a rodada final.

Cada rodada completa faz perto de 175 chamadas de geração. Com 500 por dia no plano gratuito, as rodadas ocupam pelo menos **2 dias**. No modo `documents`, cada resposta envia cerca de 3 vezes mais tokens de entrada (perto de 4,5 mil por pergunta), o que fica dentro do limite por minuto com o intervalo de 4 s.

Não há migração, ingestão nem `db push`. O `prod` muda só pelo deploy normal depois do merge.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `retrieval`: o contexto por documento (como os documentos são escolhidos e remontados) e os dois parâmetros novos do preset.
- `answer-generation`: a ordem do turno ganha a montagem do contexto, a mensagem ao modelo leva documentos e um terceiro exemplo, e as fontes passam a ser os documentos enviados.
- `evaluation`: o conjunto de 73 perguntas com o tipo `aberta`, a métrica "contexto suficiente", a causa de cada falha, as flags novas e a comparação.

## Impact

- **Código:** `src/core/rag/context.ts` (novo), `src/config.ts`, `src/core/types.ts`, `src/core/prompts.ts`, `src/core/assistant.ts`, `src/infra/db/chunk-repository.ts`, `scripts/chat.ts`, `scripts/eval.ts`, `scripts/eval/` (`questions`, `metrics`, `report`, `compare`) e `eval/perguntas.json`. A lista fechada está no `design.md`.
- **API e interface:** nenhuma mudança de contrato. As fontes mostradas embaixo da resposta podem mudar (são os documentos enviados).
- **Banco:** uma consulta nova de leitura em `document_chunks`. Nenhuma migração.
- **Dependências:** nenhuma.
- **Custo e latência:** uma consulta a mais ao banco por resposta e cerca de 3 vezes mais tokens de entrada na geração. A latência é medida nas rodadas (p50 e p95).
- **Comparabilidade:** as métricas do escopo passam a usar 45 perguntas, e as de recusa, 16. Os números da `v5` não se comparam com os da `v4`; a `v5-baseline` é a ponte.
