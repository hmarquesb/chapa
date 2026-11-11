# Avaliação: perfil-enum

Data: 2026-11-11T14:55:04.400Z · Commit: `e8db0c4`

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

Perguntas: 5 (5 no escopo). Erros: 0.

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Hit@K | 100,0% | ≥ 85% | ✅ |
| Acerto | 80,0% | ≥ 80% | ✅ |
| Recusa correta | 0,0% | ≥ 92% | ❌ |
| Falsa recusa | 20,0% | ≤ 10% | ❌ |
| Latência p50 | 2088 ms | registrar | — |
| Latência p95 | 7120 ms | registrar | — |
| Chamadas e tokens | 10 chamadas, 7447 de entrada, 258 de saída | registrar | — |

## Por pergunta

Fora do escopo e bloqueio: “Correto” indica recusa correta.

| Id | Tipo | Status | Hit | Correto | Latência | Fontes |
|---|---|---|---|---|---|---|
| 122 | perfil | answered | ✅ | ✅ | 2194 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md |
| 123 | perfil | answered | ✅ | ✅ | 1667 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md, 11-pagamentos-e-fiscal.md |
| 124 | perfil | answered | ✅ | ✅ | 7120 ms | 01-planos-e-taxas.md, 11-pagamentos-e-fiscal.md |
| 125 | perfil | answered | ✅ | ✅ | 2053 ms | 01-planos-e-taxas.md |
| 126 | perfil | fallback | ✅ | ❌ | 2088 ms | — |

## Falhas

### Pergunta 126 (perfil)

- Pergunta: Posso aceitar pagamento em dinheiro na entrega?
- Esperado: resposta com online de 11-pagamentos-e-fiscal.md, 01-planos-e-taxas.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Posso aceitar pagamento em dinheiro na entrega?
- Trechos recuperados (5) [score | sem | kw]:
  - 11-pagamentos-e-fiscal.md › Restrições de cada forma [0.72 | 0.77 | 0.60]
  - 01-planos-e-taxas.md › Dinheiro na entrega [0.71 | 0.76 | 0.60]
  - 11-pagamentos-e-fiscal.md › Formas de pagamento [0.67 | 0.69 | 0.60]
  - 02-repasse-financeiro.md › O que é o repasse [0.65 | 0.67 | 0.60]
  - 11-pagamentos-e-fiscal.md › Taxas de pagamento online [0.64 | 0.66 | 0.60]
