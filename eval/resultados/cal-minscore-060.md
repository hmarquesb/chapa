# Avaliação: cal-minscore-060

Data: 2026-11-06T14:11:19.768Z · Commit: `8a91048`

## Configuração

- Preset: `padrao`
- Modelo de chat: `gemini-3.5-flash-lite`
- Modelo rápido (reescrita, resumo e juiz): `gemini-3.5-flash-lite`
- Modelo de embedding: `gemini-embedding-001` (768 dimensões)

| Campo | Valor |
|---|---|
| topK | 5 |
| minScore | 0.6 |
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
| Acerto | 75,0% | ≥ 80% | ❌ |
| Recusa correta | 100,0% | 100% | ✅ |
| Falsa recusa | 0,0% | ≤ 10% | ✅ |
| Latência p50 | 4470 ms | registrar | — |
| Latência p95 | 5755 ms | registrar | — |
| Chamadas e tokens | 13 chamadas, 4714 de entrada, 220 de saída | registrar | — |

## Por pergunta

Fora do escopo e bloqueio: “Correto” indica recusa correta.

| Id | Tipo | Status | Hit | Correto | Latência | Fontes |
|---|---|---|---|---|---|---|
| 4 | factual | answered | ✅ | ✅ | 5755 ms | 04-cardapio-e-fotos.md |
| 7 | factual | answered | ✅ | ✅ | 4164 ms | 07-embalagem-e-entrega.md |
| 10 | parafrase | answered | ✅ | ✅ | 4625 ms | 02-repasse-financeiro.md |
| 14 | multi_doc | answered | ✅ | ❌ | 4559 ms | 01-planos-e-taxas.md |
| 15 | fora_de_escopo | fallback | — | ✅ | 3888 ms | — |
| 16 | fora_de_escopo | fallback | — | ✅ | 4601 ms | — |
| 17 | fora_de_escopo | fallback | — | ✅ | 4470 ms | — |
| 18 | fora_de_escopo | fallback | — | ✅ | 4076 ms | — |

## Falhas

### Pergunta 14 (multi_doc)

- Pergunta: Num pedido de R$ 50 pago pelo app no Plano Básico, quanto eu recebo e em que dia esse dinheiro cai?
- Esperado: resposta com 42,40, quarta de 01-planos-e-taxas.md, 02-repasse-financeiro.md
- Motivo: resposta sem todos os termos de deve_conter
- Resposta: No Plano Básico, em um pedido de R$ 50,00 pago pelo app, o repasse do pedido fica em R$ 42,40 (já descontados a comissão de R$ 6,00 e a taxa de pagamento online de R$ 1,60). Não encontrei a informação sobre o dia em que esse dinheiro cai na base do parceiro. Fale com o suporte pelo Portal do Parceir…
- Busca: Num pedido de R$ 50 pago pelo app no Plano Básico, quanto eu recebo e em que dia esse dinheiro cai?
- Trechos recuperados (1) [score | sem | kw]:
  - 01-planos-e-taxas.md › Taxa de pagamento online [0.70 | 0.72 | 0.67]
