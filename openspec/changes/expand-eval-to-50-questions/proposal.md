# Proposal

## Why

As 20 perguntas de `eval/perguntas.json` medem a base antiga: citam o "Plano Básico", a comissão de 12% e lacunas do `FONTES.md`, que deixam de existir com a base da Rango (change `add-rango-knowledge-base`). A base nova é maior (11 documentos), tem regras que dependem do plano do restaurante e é mais exposta a pedidos para inventar números. Medir isso exige mais perguntas, dois tipos novos e uma linha de base nova, a rodada **`v3`**. Esta change é o requisito R6 do PRD da peça 1 do Chapa v2.

## What Changes

- **BREAKING (eval):** o conjunto passa de 20 para **50 perguntas** (36 no escopo e 14 de recusa): 15 `factual` (pelo menos 1 por documento), 6 `parafrase`, 5 `perfil`, 5 `multi_doc`, 5 `multi_turno`, 7 `fora_de_escopo`, 4 `adversarial` e 3 `bloqueio`. As perguntas antigas saem; as novas usam os ids **101 a 150**, para que nenhum id dos resultados `v1`, `v2` e `cal-*` mude de sentido.
- Tipos novos: **`perfil`** (no escopo; a resposta depende do plano informado no perfil, que passa a ser obrigatório nesse tipo) e **`adversarial`** (fora do escopo; prompt injection, pedido para inventar número, dados de outra loja, pedido para ignorar regras; qualquer recusa conta como certa).
- Campo novo e opcional **`nao_deve_conter`**: uma resposta que contém um desses termos não conta como acerto (no escopo) nem como recusa correta (fora do escopo).
- Validação nova: todo documento ingerido aparece na `fonte_esperada` de pelo menos uma pergunta `factual`. Um teste confere que todo número com unidade em `deve_conter` existe no `regras.yaml`.
- Metas da `v3`: Hit@K ≥ 85%, acerto ≥ 80% e falsa recusa ≤ 10% continuam; a recusa correta passa de 100% para **≥ 92%**, ou seja, no máximo 1 erro em 14. O PRD propunha "≥ 95% (no máximo 1 erro em 14)", mas 13 de 14 dá 92,9%: a meta escrita aqui segue a intenção de tolerar um erro. **Revisar e aprovar esta proposta vale como a confirmação das metas.**
- Rodada em blocos: nova opção **`--append`**, que junta as perguntas rodadas agora ao `eval/resultados/<label>.json` existente (mesmo preset e mesma configuração) e recalcula as métricas. Sem ela, uma rodada de 50 perguntas (~150 a 225 chamadas) não cabe na cota gratuita de uma vez, e cada bloco com `--only` sobrescreveria o anterior.
- Prompt do juiz: "parceiros da Rango" no lugar de "parceiros de um app de delivery".
- Rodada **`v3`** completa no `dev`, gravada em `eval/resultados/v3.json` e `v3.md`. Os resultados `v1`, `v2` e `cal-*` ficam como histórico da base anterior, e o `COMPARACAO.md` ganha a nota de que a `v3` é uma nova linha de base, não comparável.
- Documentação: `docs/qa.md` (50 perguntas, cota, blocos com `--only`, `--append` e `--delay-ms`), `docs/business.md` (metas) e `README.md` (resultados da `v3`, exemplos de conversa da `v3` e o histórico da base antiga).

Fora do escopo:

- Juiz LLM calibrado, eval na CI e observabilidade (onda 1). O juiz continua opcional.
- Mudanças no RAG, nos prompts do assistente ou na base para subir as métricas. Se a `v3` ficar abaixo de uma meta, a diferença é explicada no `COMPARACAO.md` e vira assunto da onda 1.
- O formato do `--compare`: ele continua comparando métricas, e a `v3` só não deve ser lida contra a `v2`.

Chamadas reais e checkpoints humanos:

- **Ordem:** o *apply* começa depois do merge da `add-rango-knowledge-base` (as perguntas citam os documentos `08` a `11` e o teste usa o módulo de consistência dela). A rodada `v3` só roda com a `rebrand-app-texts-to-rango` também na `main`, com a branch rebaseada.
- `npm run ingest` (se o `dev` ainda não tiver a base da Rango) e `npm run eval` no `dev`, em blocos, com `--delay-ms` e `--only`: já autorizados no `CLAUDE.md`. Se a cota estourar, espera e retoma, sem trocar de modelo.
- **(pessoa)** Revisar as 50 perguntas no PR antes da rodada final `v3`.
- Nada no `prod`.
- Sem decisão de arquitetura nova, então sem ADR.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `evaluation`: conjunto de 50 perguntas e a distribuição nova; validação dos tipos `perfil` e `adversarial`, do `nao_deve_conter` e da cobertura por documento; métricas com o `nao_deve_conter` e a recusa de qualquer tipo no `adversarial`; meta de recusa correta ≥ 92%; rodada em blocos com `--append`; termos esperados conferidos com o `regras.yaml`.

## Impact

- `eval/perguntas.json` (reescrito), `eval/resultados/v3.json`, `v3.md` e `COMPARACAO.md`.
- `scripts/eval/questions.ts`, `metrics.ts`, `report.ts`, `judge.ts`, um módulo novo `scripts/eval/append.ts`, `scripts/eval.ts` e os testes de cada um.
- `docs/qa.md`, `docs/business.md`, `README.md`.
- Banco `dev`: ~150 a 225 chamadas ao Gemini e as sessões do canal `eval`, apagadas pelo cron depois de 7 dias.
- Sem dependências novas (o teste do `regras.yaml` usa o `yaml` e o módulo de consistência que a `add-rango-knowledge-base` traz).
