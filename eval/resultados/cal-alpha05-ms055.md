# Avaliação: cal-alpha05-ms055

Data: 2026-11-06T14:12:58.256Z · Commit: `8a91048`

## Configuração

- Preset: `padrao`
- Modelo de chat: `gemini-3.5-flash-lite`
- Modelo rápido (reescrita, resumo e juiz): `gemini-3.5-flash-lite`
- Modelo de embedding: `gemini-embedding-001` (768 dimensões)

| Campo | Valor |
|---|---|
| topK | 5 |
| minScore | 0.55 |
| alpha | 0.5 |
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
| Acerto | 0,0% | ≥ 80% | ❌ |
| Recusa correta | 0,0% | 100% | ❌ |
| Falsa recusa | 66,7% | ≤ 10% | ❌ |
| Latência p50 | 4953 ms | registrar | — |
| Latência p95 | 5693 ms | registrar | — |
| Chamadas e tokens | 6 chamadas, 4669 de entrada, 142 de saída | registrar | — |

## Por pergunta

Fora do escopo e bloqueio: “Correto” indica recusa correta.

| Id | Tipo | Status | Hit | Correto | Latência | Fontes |
|---|---|---|---|---|---|---|
| 9 | parafrase | fallback | ✅ | ❌ | 5693 ms | — |
| 13 | multi_doc | fallback | ✅ | ❌ | 4786 ms | — |
| 14 | multi_doc | answered | ✅ | ❌ | 4953 ms | 01-planos-e-taxas.md |

## Falhas

### Pergunta 9 (parafrase)

- Pergunta: o cliente cancelou e eu perdi a comida, e agora?
- Esperado: resposta com contest de 03-cancelamentos-e-contestacoes.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Portal do Parceiro.
- Busca: o cliente cancelou e eu perdi a comida, e agora?
- Trechos recuperados (5) [score | sem | kw]:
  - 03-cancelamentos-e-contestacoes.md › Quem cancela e por quê [0.68 | 0.75 | 0.60]
  - 03-cancelamentos-e-contestacoes.md › Quem arca com o custo [0.57 | 0.74 | 0.40]
  - 03-cancelamentos-e-contestacoes.md › Quando dá para contestar [0.56 | 0.73 | 0.40]
  - 03-cancelamentos-e-contestacoes.md › Como evitar cancelamentos [0.56 | 0.72 | 0.40]
  - 03-cancelamentos-e-contestacoes.md › Como contestar [0.55 | 0.71 | 0.40]

### Pergunta 13 (multi_doc)

- Pergunta: Se eu pausar muito a loja, minha nota cai?
- Esperado: resposta com visibilidade de 05-horarios-pausas-e-disponibilidade.md, 06-avaliacoes-e-reputacao.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Portal do Parceiro.
- Busca: Se eu pausar muito a loja, minha nota cai?
- Trechos recuperados (5) [score | sem | kw]:
  - 06-avaliacoes-e-reputacao.md › Como melhorar [0.72 | 0.69 | 0.75]
  - 05-horarios-pausas-e-disponibilidade.md › Impacto da indisponibilidade na visibilidade [0.63 | 0.76 | 0.50]
  - 05-horarios-pausas-e-disponibilidade.md › Por que a loja fecha sozinha [0.62 | 0.73 | 0.50]
  - 05-horarios-pausas-e-disponibilidade.md › Pausas programadas [0.62 | 0.73 | 0.50]
  - 06-avaliacoes-e-reputacao.md › Como a nota é calculada [0.61 | 0.71 | 0.50]

### Pergunta 14 (multi_doc)

- Pergunta: Num pedido de R$ 50 pago pelo app no Plano Básico, quanto eu recebo e em que dia esse dinheiro cai?
- Esperado: resposta com 42,40, quarta de 01-planos-e-taxas.md, 02-repasse-financeiro.md
- Motivo: resposta sem todos os termos de deve_conter
- Resposta: No Plano Básico, em um pedido de R$ 50,00 pago pelo app, o repasse do pedido fica em R$ 42,40 (já descontados a comissão de R$ 6,00 e a taxa de pagamento online de R$ 1,60). Não encontrei a informação sobre o dia em que esse dinheiro cai na base do parceiro. Fale com o suporte pelo Portal do Parceir…
- Busca: Num pedido de R$ 50 pago pelo app no Plano Básico, quanto eu recebo e em que dia esse dinheiro cai?
- Trechos recuperados (1) [score | sem | kw]:
  - 01-planos-e-taxas.md › Taxa de pagamento online [0.69 | 0.72 | 0.67]
