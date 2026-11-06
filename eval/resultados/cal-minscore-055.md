# Avaliação: cal-minscore-055

Data: 2026-11-06T14:10:13.071Z · Commit: `8a91048`

## Configuração

- Preset: `padrao`
- Modelo de chat: `gemini-3.5-flash-lite`
- Modelo rápido (reescrita, resumo e juiz): `gemini-3.5-flash-lite`
- Modelo de embedding: `gemini-embedding-001` (768 dimensões)

| Campo | Valor |
|---|---|
| topK | 5 |
| minScore | 0.55 |
| alpha | 0.7 |
| candidateLimit | 30 |
| chunkStrategy | markdown |
| chunkSize | 1200 |
| chunkOverlap | 150 |
| rewriteQuery | true |

## Métricas

Perguntas: 8 (4 no escopo). Erros: 0.

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Hit@K | 100,0% | ≥ 85% | ✅ |
| Acerto | 100,0% | ≥ 80% | ✅ |
| Recusa correta | 100,0% | 100% | ✅ |
| Falsa recusa | 0,0% | ≤ 10% | ✅ |
| Latência p50 | 4589 ms | registrar | — |
| Latência p95 | 5782 ms | registrar | — |
| Chamadas e tokens | 14 chamadas, 8382 de entrada, 320 de saída | registrar | — |

## Por pergunta

Fora do escopo e bloqueio: “Correto” indica recusa correta.

| Id | Tipo | Status | Hit | Correto | Latência | Fontes |
|---|---|---|---|---|---|---|
| 4 | factual | answered | ✅ | ✅ | 5782 ms | 04-cardapio-e-fotos.md |
| 7 | factual | answered | ✅ | ✅ | 4589 ms | 07-embalagem-e-entrega.md |
| 10 | parafrase | answered | ✅ | ✅ | 5134 ms | 02-repasse-financeiro.md |
| 14 | multi_doc | answered | ✅ | ✅ | 5107 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md |
| 15 | fora_de_escopo | fallback | — | ✅ | 3606 ms | — |
| 16 | fora_de_escopo | fallback | — | ✅ | 5047 ms | — |
| 17 | fora_de_escopo | fallback | — | ✅ | 4069 ms | — |
| 18 | fora_de_escopo | fallback | — | ✅ | 4574 ms | — |

## Falhas

Nenhuma falha.
