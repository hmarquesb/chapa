# Proposal

## Why

As changes 1 (`greeting-fixed-reply`) e 2 (`conversation-router`) põem uma regra local e um roteador com o Flash-Lite antes do RAG. O risco que importa é o **falso small talk**: uma dúvida sobre a Rango respondida como conversa, sem a base. Esta é a change 3 de 3 do PRD `prd-chapa-conversa.md` (objetivo O5): o eval passa a saber a rota esperada de cada pergunta, mede o roteador e registra as rodadas `v4`, `v4-baseline` e `v4-regras`, que mostram quanto o Flash-Lite acrescenta à regra local e quanto custa em latência. Ela **depende da change 2 estar mergeada** (usa a rota `conversa` e o interruptor `router.enabled`).

## What Changes

- **12 perguntas novas** (ids 151 a 162), num total de **62**:
  - 4 `cumprimento` ("bom dia", "oi, tudo bem?", "boa noite chapa", "boa tarde!"), com o nome no perfil, que esperam a resposta fixa;
  - 4 `conversa` ("obrigada, ajudou muito", "valeu, era só isso", "o que você sabe fazer?", "tchau, até amanhã"), que esperam uma resposta `small_talk` sem número e sem fallback;
  - 4 `misto` ("bom dia! quanto é a comissão no Plano Próprio?" e outras três), que esperam a resposta da base com os termos do `regras.yaml` e o cumprimento retribuído.
- **Campo obrigatório `rota_esperada`** (`cumprimento`, `conversa` ou `rag`) em todas as perguntas. As 50 atuais recebem `rag`. A validação confere a coerência com o tipo.
- **Métricas novas no relatório:** falso small talk (pergunta com `rota_esperada: "rag"` que terminou em `small_talk`, **meta 0**), acerto de rota (**meta ≥ 95%**), acerto das perguntas de conversa e das mistas, chamadas evitadas (perguntas que terminaram sem busca) e a latência média das perguntas curtas que foram para o RAG.
- **As métricas antigas não mudam de base:** Hit@K, acerto, falsa recusa e recusa correta continuam calculadas sobre as 36 + 14 perguntas de antes, para comparar a `v4` com a `v3`.
- **Flag `--router on|off`** no eval, com `on` por padrão no preset `padrao` e `off` no `baseline`, que continua congelado como referência. A configuração do roteador vai para o arquivo da rodada, entra na checagem do `--append` e aparece na comparação quando muda.
- **Rodadas** `v4` (`padrao`, roteador ligado), `v4-regras` (`padrao`, `--router off`) e `v4-baseline` (`baseline`), em blocos, e o `COMPARACAO.md` com a leitura das três contra a `v3`.
- `docs/qa.md`, `docs/business.md` (metas) e `README.md` (fluxo com o roteador, as 62 perguntas e a tabela da `v4`) atualizados.

## Fora do escopo

- Mudar a regra de cumprimento, o roteador, o prompt ou o `maxWords` por causa do resultado. Se a `v4` ficar abaixo das metas de rota, a calibração vira uma change própria, e a diferença é explicada no `COMPARACAO.md`.
- Mudar ou renumerar as 50 perguntas atuais (além de acrescentar a `rota_esperada`).
- Juiz para as respostas de conversa.

## Chamadas reais e checkpoints humanos

1. **Orquestrador (autorização prévia):** as três rodadas contra o `dev`, em blocos com `--append`, `--only` e `--delay-ms`, como na `v3`. Estimativa: 110 a 130 chamadas na `v4`, um pouco menos na `v4-regras` e na `v4-baseline`. As três não cabem num dia da cota gratuita do Flash-Lite junto com outro uso; se a cota estourar, esperar e retomar com `--append --only` nos pendentes, sem trocar de modelo.
2. **Orquestrador (autorização prévia):** se o `dev` não tiver os trechos do preset `baseline`, rodar `npm run ingest -- --preset baseline` antes da `v4-baseline` (a base não muda, então não há texto para a pessoa revisar).
3. **Pessoa:** revisar as 12 perguntas novas no PR antes das rodadas, e a leitura no `COMPARACAO.md` e no README.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `evaluation`: o conjunto passa a 62 perguntas, com os tipos de conversa e a `rota_esperada`; a validação, as opções da rodada (`--router`), a rodada em blocos e a comparação passam a considerar o roteador; entram as métricas e as metas de rota.

## Impact

- **Código:** `scripts/eval/questions.ts`, `metrics.ts`, `report.ts`, `compare.ts`, `append.ts` (e os testes), `scripts/eval.ts` e `eval/perguntas.json`. A lista fechada está no `design.md`.
- **Resultados:** `eval/resultados/v4*.json` e `.md` e o `COMPARACAO.md`.
- **API, banco e dependências:** nenhuma mudança.
- **Paralelismo:** não divide arquivos com as changes 1 e 2, mas o código usa os tipos e o config da change 2. Os grupos de perguntas e validação podem começar antes, sobre a `main` com a change 1; o resto, depois do merge da change 2.
