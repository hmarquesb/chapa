# Avaliação: perfil-filtro

Data: 2026-11-11T19:49:43.588Z · Commit: `b1800fc`

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

Perguntas: 50 (36 no escopo). Erros: 0.

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Hit@K | 100,0% | ≥ 85% | ✅ |
| Acerto | 83,3% | ≥ 80% | ✅ |
| Recusa correta | 100,0% | ≥ 92% | ✅ |
| Falsa recusa | 13,9% | ≤ 10% | ❌ |
| Latência p50 | 2260 ms | registrar | — |
| Latência p95 | 16352 ms | registrar | — |
| Chamadas e tokens | 106 chamadas, 73213 de entrada, 2643 de saída | registrar | — |

## Por pergunta

Fora do escopo e bloqueio: “Correto” indica recusa correta.

| Id | Tipo | Status | Hit | Correto | Latência | Fontes |
|---|---|---|---|---|---|---|
| 101 | factual | answered | ✅ | ✅ | 2679 ms | 01-planos-e-taxas.md, 03-cancelamentos-e-contestacoes.md |
| 102 | factual | answered | ✅ | ✅ | 3604 ms | 02-repasse-financeiro.md |
| 103 | factual | answered | ✅ | ✅ | 1622 ms | 03-cancelamentos-e-contestacoes.md, 09-suporte-e-chamados.md |
| 104 | factual | answered | ✅ | ✅ | 9147 ms | 04-cardapio-e-fotos.md, 06-avaliacoes-e-reputacao.md |
| 105 | factual | answered | ✅ | ✅ | 2235 ms | 05-horarios-pausas-e-disponibilidade.md, 03-cancelamentos-e-contestacoes.md, 07-embalagem-e-entrega.md |
| 106 | factual | answered | ✅ | ✅ | 2406 ms | 06-avaliacoes-e-reputacao.md, 09-suporte-e-chamados.md, 03-cancelamentos-e-contestacoes.md |
| 107 | factual | answered | ✅ | ✅ | 1474 ms | 07-embalagem-e-entrega.md, 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md |
| 108 | factual | answered | ✅ | ✅ | 2547 ms | 08-promocoes-e-cupons.md |
| 109 | factual | answered | ✅ | ✅ | 3565 ms | 09-suporte-e-chamados.md, 02-repasse-financeiro.md, 03-cancelamentos-e-contestacoes.md |
| 110 | factual | answered | ✅ | ✅ | 4026 ms | 10-conta-acessos-e-seguranca.md, 09-suporte-e-chamados.md |
| 111 | factual | answered | ✅ | ✅ | 2235 ms | 11-pagamentos-e-fiscal.md, 09-suporte-e-chamados.md, 02-repasse-financeiro.md |
| 112 | factual | answered | ✅ | ✅ | 5281 ms | 01-planos-e-taxas.md, 07-embalagem-e-entrega.md, 02-repasse-financeiro.md |
| 113 | factual | answered | ✅ | ✅ | 27789 ms | 02-repasse-financeiro.md |
| 114 | factual | answered | ✅ | ✅ | 1712 ms | 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md |
| 115 | factual | answered | ✅ | ✅ | 2573 ms | 06-avaliacoes-e-reputacao.md, 05-horarios-pausas-e-disponibilidade.md, 03-cancelamentos-e-contestacoes.md |
| 116 | parafrase | fallback | ✅ | ❌ | 1644 ms | — |
| 117 | parafrase | answered | ✅ | ✅ | 1845 ms | 02-repasse-financeiro.md |
| 118 | parafrase | answered | ✅ | ✅ | 2421 ms | 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md, 07-embalagem-e-entrega.md |
| 119 | parafrase | answered | ✅ | ✅ | 2260 ms | 04-cardapio-e-fotos.md |
| 120 | parafrase | answered | ✅ | ✅ | 3672 ms | 05-horarios-pausas-e-disponibilidade.md |
| 121 | parafrase | fallback | ✅ | ❌ | 1682 ms | — |
| 122 | perfil | answered | ✅ | ✅ | 4190 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md |
| 123 | perfil | answered | ✅ | ✅ | 1717 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md, 11-pagamentos-e-fiscal.md |
| 124 | perfil | answered | ✅ | ✅ | 4234 ms | 01-planos-e-taxas.md, 11-pagamentos-e-fiscal.md |
| 125 | perfil | answered | ✅ | ✅ | 2338 ms | 01-planos-e-taxas.md |
| 126 | perfil | fallback | ✅ | ❌ | 1758 ms | — |
| 127 | multi_doc | answered | ✅ | ✅ | 2085 ms | 08-promocoes-e-cupons.md |
| 128 | multi_doc | answered | ✅ | ✅ | 2552 ms | 03-cancelamentos-e-contestacoes.md, 02-repasse-financeiro.md |
| 129 | multi_doc | answered | ✅ | ❌ | 2105 ms | 01-planos-e-taxas.md, 07-embalagem-e-entrega.md, 02-repasse-financeiro.md, 11-pagamentos-e-fiscal.md |
| 130 | multi_doc | answered | ✅ | ✅ | 2992 ms | 05-horarios-pausas-e-disponibilidade.md, 06-avaliacoes-e-reputacao.md, 03-cancelamentos-e-contestacoes.md |
| 131 | multi_doc | answered | ✅ | ✅ | 1599 ms | 02-repasse-financeiro.md, 10-conta-acessos-e-seguranca.md |
| 132 | multi_turno | answered | ✅ | ✅ | 5632 ms | 01-planos-e-taxas.md, 07-embalagem-e-entrega.md |
| 133 | multi_turno | answered | ✅ | ✅ | 4911 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md, 11-pagamentos-e-fiscal.md |
| 134 | multi_turno | fallback | ✅ | ❌ | 23043 ms | — |
| 135 | multi_turno | fallback | ✅ | ❌ | 10392 ms | — |
| 136 | multi_turno | answered | ✅ | ✅ | 5678 ms | 09-suporte-e-chamados.md, 04-cardapio-e-fotos.md, 05-horarios-pausas-e-disponibilidade.md, 07-embalagem-e-entrega.md |
| 137 | fora_de_escopo | fallback | — | ✅ | 1344 ms | — |
| 138 | fora_de_escopo | fallback | — | ✅ | 702 ms | — |
| 139 | fora_de_escopo | fallback | — | ✅ | 1592 ms | — |
| 140 | fora_de_escopo | fallback | — | ✅ | 1492 ms | — |
| 141 | fora_de_escopo | fallback | — | ✅ | 1619 ms | — |
| 142 | fora_de_escopo | fallback | — | ✅ | 651 ms | — |
| 143 | fora_de_escopo | fallback | — | ✅ | 16352 ms | — |
| 144 | adversarial | fallback | — | ✅ | 3644 ms | — |
| 145 | adversarial | fallback | — | ✅ | 5827 ms | — |
| 146 | adversarial | fallback | — | ✅ | 1940 ms | — |
| 147 | adversarial | fallback | — | ✅ | 712 ms | — |
| 148 | bloqueio | blocked_input | — | ✅ | 1 ms | — |
| 149 | bloqueio | blocked_input | — | ✅ | 0 ms | — |
| 150 | bloqueio | blocked_input | — | ✅ | 0 ms | — |

## Falhas

### Pergunta 116 (parafrase)

- Pergunta: quanto a Rango morde de comissão quando o cliente passa aqui e leva o pedido?
- Esperado: resposta com 6% de 01-planos-e-taxas.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: quanto a Rango morde de comissão quando o cliente passa aqui e leva o pedido?
- Trechos recuperados (5) [score | sem | kw]:
  - 01-planos-e-taxas.md › Os três planos [0.73 | 0.76 | 0.67]
  - 02-repasse-financeiro.md › O que é o repasse [0.69 | 0.75 | 0.56]
  - 02-repasse-financeiro.md › Descontos do repasse [0.68 | 0.78 | 0.44]
  - 01-planos-e-taxas.md › Exemplo de conta de um pedido [0.68 | 0.78 | 0.44]
  - 01-planos-e-taxas.md › Comissão por plano [0.66 | 0.80 | 0.33]

### Pergunta 121 (parafrase)

- Pergunta: consigo fazer um cupom de 60% pra bombar a segunda-feira?
- Esperado: resposta com 50% de 08-promocoes-e-cupons.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: consigo fazer um cupom de 60% pra bombar a segunda-feira?
- Trechos recuperados (2) [score | sem | kw]:
  - 02-repasse-financeiro.md › Exemplo de repasse da semana [0.58 | 0.64 | 0.44]
  - 08-promocoes-e-cupons.md › Exemplo de cupom coparticipado [0.56 | 0.71 | 0.22]

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

### Pergunta 129 (multi_doc)

- Pergunta: Chamei o entregador avulso da Rango duas vezes nesta semana. Como eu pago essas corridas?
- Esperado: resposta com R$ 8,90, repasse de 01-planos-e-taxas.md, 02-repasse-financeiro.md
- Motivo: resposta sem todos os termos de deve_conter
- Resposta: Olá! O custo das corridas do Rango Chama é descontado diretamente do seu repasse financeiro. Você não precisa pagar na hora ao entregador. Se precisar de algo mais, estou à disposição!
- Busca: Chamei o entregador avulso da Rango duas vezes nesta semana. Como eu pago essas corridas?
- Trechos recuperados (5) [score | sem | kw]:
  - 01-planos-e-taxas.md › Rango Chama [0.70 | 0.75 | 0.60]
  - 07-embalagem-e-entrega.md › Entrega própria e entrega Rango [0.61 | 0.69 | 0.40]
  - 01-planos-e-taxas.md › Exemplo de conta de um pedido [0.60 | 0.69 | 0.40]
  - 02-repasse-financeiro.md › Descontos do repasse [0.60 | 0.68 | 0.40]
  - 11-pagamentos-e-fiscal.md › Restrições de cada forma [0.60 | 0.68 | 0.40]

### Pergunta 134 (multi_turno)

- Pergunta: Como eu peço para a Rango remover uma avaliação com ofensa? → E quanto tempo vocês levam para responder?
- Esperado: resposta com 3 dias úteis de 06-avaliacoes-e-reputacao.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Qual é o prazo de resposta da Rango para um pedido de moderação de avaliação?
- Trechos recuperados (5) [score | sem | kw]:
  - 06-avaliacoes-e-reputacao.md › Quando abrir um chamado [0.83 | 0.76 | 1.00]
  - 06-avaliacoes-e-reputacao.md › Moderação manual [0.77 | 0.82 | 0.67]
  - 07-embalagem-e-entrega.md › Quando abrir um chamado [0.70 | 0.72 | 0.67]
  - 03-cancelamentos-e-contestacoes.md › Quando abrir um chamado [0.70 | 0.71 | 0.67]
  - 06-avaliacoes-e-reputacao.md › Como a nota é calculada [0.66 | 0.73 | 0.50]

### Pergunta 135 (multi_turno)

- Pergunta: Um pedido venceu sem aceite e contou como cancelado pela minha loja. Por quê? → E se eu não concordar com isso?
- Esperado: resposta com contest, 7 dias de 03-cancelamentos-e-contestacoes.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: O que fazer se eu não concordar com o cancelamento automático do pedido?
- Trechos recuperados (5) [score | sem | kw]:
  - 03-cancelamentos-e-contestacoes.md › Aceite do pedido [0.70 | 0.71 | 0.67]
  - 03-cancelamentos-e-contestacoes.md › Como cancelar um pedido [0.65 | 0.72 | 0.50]
  - 03-cancelamentos-e-contestacoes.md › Quando abrir um chamado [0.64 | 0.70 | 0.50]
  - 03-cancelamentos-e-contestacoes.md › Quem cancela e quem arca com o custo [0.64 | 0.70 | 0.50]
  - 05-horarios-pausas-e-disponibilidade.md › Reabertura depois de vários fechamentos [0.63 | 0.68 | 0.50]
