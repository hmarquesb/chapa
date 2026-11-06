# Avaliação: v2-inicial

Data: 2026-11-06T14:08:39.445Z · Commit: `8a91048`

## Configuração

- Preset: `padrao`
- Modelo de chat: `gemini-3.5-flash-lite`
- Modelo rápido (reescrita, resumo e juiz): `gemini-3.5-flash-lite`
- Modelo de embedding: `gemini-embedding-001` (768 dimensões)

| Campo | Valor |
|---|---|
| topK | 5 |
| minScore | 0.5 |
| alpha | 0.7 |
| candidateLimit | 30 |
| chunkStrategy | markdown |
| chunkSize | 1200 |
| chunkOverlap | 150 |
| rewriteQuery | true |

## Métricas

Perguntas: 20 (14 no escopo). Erros: 0.

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Hit@K | 100,0% | ≥ 85% | ✅ |
| Acerto | 85,7% | ≥ 80% | ✅ |
| Recusa correta | 100,0% | 100% | ✅ |
| Falsa recusa | 14,3% | ≤ 10% | ❌ |
| Latência p50 | 5017 ms | registrar | — |
| Latência p95 | 10556 ms | registrar | — |
| Chamadas e tokens | 42 chamadas, 37292 de entrada, 1093 de saída | registrar | — |

## Por pergunta

Fora do escopo e bloqueio: “Correto” indica recusa correta.

| Id | Tipo | Status | Hit | Correto | Latência | Fontes |
|---|---|---|---|---|---|---|
| 1 | factual | answered | ✅ | ✅ | 6678 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md |
| 2 | factual | answered | ✅ | ✅ | 6474 ms | 02-repasse-financeiro.md |
| 3 | factual | answered | ✅ | ✅ | 5488 ms | 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md |
| 4 | factual | answered | ✅ | ✅ | 5267 ms | 04-cardapio-e-fotos.md |
| 5 | factual | answered | ✅ | ✅ | 6314 ms | 05-horarios-pausas-e-disponibilidade.md, 06-avaliacoes-e-reputacao.md |
| 6 | factual | answered | ✅ | ✅ | 4765 ms | 06-avaliacoes-e-reputacao.md, 02-repasse-financeiro.md |
| 7 | factual | answered | ✅ | ✅ | 4844 ms | 07-embalagem-e-entrega.md, 04-cardapio-e-fotos.md |
| 8 | parafrase | answered | ✅ | ✅ | 5017 ms | 02-repasse-financeiro.md, 01-planos-e-taxas.md |
| 9 | parafrase | fallback | ✅ | ❌ | 4612 ms | — |
| 10 | parafrase | answered | ✅ | ✅ | 5922 ms | 02-repasse-financeiro.md, 01-planos-e-taxas.md |
| 11 | multi_turno | answered | ✅ | ✅ | 10556 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md, 03-cancelamentos-e-contestacoes.md |
| 12 | multi_turno | answered | ✅ | ✅ | 11836 ms | 03-cancelamentos-e-contestacoes.md |
| 13 | multi_doc | fallback | ✅ | ❌ | 4817 ms | — |
| 14 | multi_doc | answered | ✅ | ✅ | 5654 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md |
| 15 | fora_de_escopo | fallback | — | ✅ | 5900 ms | — |
| 16 | fora_de_escopo | fallback | — | ✅ | 4581 ms | — |
| 17 | fora_de_escopo | fallback | — | ✅ | 4848 ms | — |
| 18 | fora_de_escopo | fallback | — | ✅ | 4259 ms | — |
| 19 | bloqueio | blocked_input | — | ✅ | 1 ms | — |
| 20 | bloqueio | blocked_input | — | ✅ | 0 ms | — |

## Falhas

### Pergunta 9 (parafrase)

- Pergunta: o cliente cancelou e eu perdi a comida, e agora?
- Esperado: resposta com contest de 03-cancelamentos-e-contestacoes.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Portal do Parceiro.
- Busca: o cliente cancelou e eu perdi a comida, e agora?
- Trechos recuperados (5) [score | sem | kw]:
  - 03-cancelamentos-e-contestacoes.md › Quem cancela e por quê [0.71 | 0.75 | 0.60]
  - 03-cancelamentos-e-contestacoes.md › Quem arca com o custo [0.64 | 0.74 | 0.40]
  - 03-cancelamentos-e-contestacoes.md › Quando dá para contestar [0.63 | 0.73 | 0.40]
  - 03-cancelamentos-e-contestacoes.md › Como evitar cancelamentos [0.62 | 0.72 | 0.40]
  - 03-cancelamentos-e-contestacoes.md › Como contestar [0.61 | 0.71 | 0.40]

### Pergunta 13 (multi_doc)

- Pergunta: Se eu pausar muito a loja, minha nota cai?
- Esperado: resposta com visibilidade de 05-horarios-pausas-e-disponibilidade.md, 06-avaliacoes-e-reputacao.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Portal do Parceiro.
- Busca: Se eu pausar muito a loja, minha nota cai?
- Trechos recuperados (5) [score | sem | kw]:
  - 06-avaliacoes-e-reputacao.md › Como melhorar [0.71 | 0.69 | 0.75]
  - 05-horarios-pausas-e-disponibilidade.md › Impacto da indisponibilidade na visibilidade [0.68 | 0.76 | 0.50]
  - 05-horarios-pausas-e-disponibilidade.md › Por que a loja fecha sozinha [0.66 | 0.73 | 0.50]
  - 05-horarios-pausas-e-disponibilidade.md › Pausas programadas [0.66 | 0.73 | 0.50]
  - 06-avaliacoes-e-reputacao.md › Como a nota é calculada [0.65 | 0.71 | 0.50]
