# Avaliação: cal-topk3-ms055

Data: 2026-11-06T14:12:25.021Z · Commit: `8a91048`

## Configuração

- Preset: `padrao`
- Modelo de chat: `gemini-3.5-flash-lite`
- Modelo rápido (reescrita, resumo e juiz): `gemini-3.5-flash-lite`
- Modelo de embedding: `gemini-embedding-001` (768 dimensões)

| Campo | Valor |
|---|---|
| topK | 3 |
| minScore | 0.55 |
| alpha | 0.7 |
| candidateLimit | 30 |
| chunkStrategy | markdown |
| chunkSize | 1200 |
| chunkOverlap | 150 |
| rewriteQuery | true |

## Métricas

Perguntas: 3 (3 no escopo). Erros: 0.

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Hit@K | 100,0% | ≥ 85% | ✅ |
| Acerto | 33,3% | ≥ 80% | ❌ |
| Recusa correta | 0,0% | 100% | ❌ |
| Falsa recusa | 33,3% | ≤ 10% | ❌ |
| Latência p50 | 4933 ms | registrar | — |
| Latência p95 | 9359 ms | registrar | — |
| Chamadas e tokens | 6 chamadas, 4167 de entrada, 349 de saída | registrar | — |

## Por pergunta

Fora do escopo e bloqueio: “Correto” indica recusa correta.

| Id | Tipo | Status | Hit | Correto | Latência | Fontes |
|---|---|---|---|---|---|---|
| 9 | parafrase | answered | ✅ | ✅ | 9359 ms | 03-cancelamentos-e-contestacoes.md |
| 13 | multi_doc | fallback | ✅ | ❌ | 4386 ms | — |
| 14 | multi_doc | answered | ✅ | ❌ | 4933 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md |

## Falhas

### Pergunta 13 (multi_doc)

- Pergunta: Se eu pausar muito a loja, minha nota cai?
- Esperado: resposta com visibilidade de 05-horarios-pausas-e-disponibilidade.md, 06-avaliacoes-e-reputacao.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Portal do Parceiro.
- Busca: Se eu pausar muito a loja, minha nota cai?
- Trechos recuperados (3) [score | sem | kw]:
  - 06-avaliacoes-e-reputacao.md › Como melhorar [0.71 | 0.69 | 0.75]
  - 05-horarios-pausas-e-disponibilidade.md › Impacto da indisponibilidade na visibilidade [0.68 | 0.76 | 0.50]
  - 05-horarios-pausas-e-disponibilidade.md › Por que a loja fecha sozinha [0.66 | 0.73 | 0.50]

### Pergunta 14 (multi_doc)

- Pergunta: Num pedido de R$ 50 pago pelo app no Plano Básico, quanto eu recebo e em que dia esse dinheiro cai?
- Esperado: resposta com 42,40, quarta de 01-planos-e-taxas.md, 02-repasse-financeiro.md
- Motivo: resposta sem todos os termos de deve_conter
- Resposta: Olá! No seu Plano Básico, em um pedido de R$ 50,00 pago pelo app, o repasse do pedido fica em R$ 42,40 (já descontados a comissão de R$ 6,00 e a taxa de pagamento online de R$ 1,60). Sobre o dia em que o dinheiro cai, veja como funciona o ciclo: 1. A venda fica em andamento quando o pedido é confirm…
- Busca: Num pedido de R$ 50 pago pelo app no Plano Básico, quanto eu recebo e em que dia esse dinheiro cai?
- Trechos recuperados (3) [score | sem | kw]:
  - 01-planos-e-taxas.md › Taxa de pagamento online [0.70 | 0.72 | 0.67]
  - 02-repasse-financeiro.md › Ciclo de repasse [0.59 | 0.70 | 0.33]
  - 01-planos-e-taxas.md › Mensalidade [0.58 | 0.69 | 0.33]
