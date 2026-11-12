# Avaliação: v4-regras

Data: 2026-11-12T11:50:59.755Z · Commit: `a0d1cd8`

## Configuração

- Preset: `padrao`
- Modelo de chat: `gemini-3.5-flash-lite`
- Modelo rápido (reescrita, resumo e juiz): `gemini-3.5-flash-lite`
- Modelo de embedding: `gemini-embedding-001` (768 dimensões)
- Roteador: desligado (só a regra de cumprimento)

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

Perguntas: 62 (36 no escopo). Erros: 0.

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Hit@K | 100,0% | ≥ 85% | ✅ |
| Acerto | 80,6% | ≥ 80% | ✅ |
| Recusa correta | 100,0% | ≥ 92% | ✅ |
| Falsa recusa | 16,7% | ≤ 10% | ❌ |
| Latência p50 | 1953 ms | registrar | — |
| Latência p95 | 5955 ms | registrar | — |
| Chamadas e tokens | 121 chamadas, 84426 de entrada, 2529 de saída | registrar | — |

## Rotas

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Acerto de rota | 93,2% | ≥ 95% | ❌ |
| Falso small talk | 0 | 0 | ✅ |
| Chamadas evitadas | 4 | registrar | — |
| Acerto cumprimento | 100,0% | registrar | — |
| Acerto conversa | 0,0% | registrar | — |
| Acerto mistas | 100,0% | registrar | — |
| Latência média das curtas no RAG | 3525 ms | registrar | — |

## Por pergunta

Fora do escopo e bloqueio: “Correto” indica recusa correta.

| Id | Tipo | Status | Rota | Hit | Correto | Latência | Fontes |
|---|---|---|---|---|---|---|---|
| 101 | factual | answered | rag → rag | ✅ | ✅ | 1831 ms | 01-planos-e-taxas.md, 03-cancelamentos-e-contestacoes.md |
| 102 | factual | answered | rag → rag | ✅ | ✅ | 1453 ms | 02-repasse-financeiro.md |
| 103 | factual | answered | rag → rag | ✅ | ✅ | 2034 ms | 03-cancelamentos-e-contestacoes.md, 09-suporte-e-chamados.md |
| 104 | factual | answered | rag → rag | ✅ | ✅ | 2415 ms | 04-cardapio-e-fotos.md, 06-avaliacoes-e-reputacao.md |
| 105 | factual | answered | rag → rag | ✅ | ✅ | 2431 ms | 05-horarios-pausas-e-disponibilidade.md, 03-cancelamentos-e-contestacoes.md, 07-embalagem-e-entrega.md |
| 106 | factual | answered | rag → rag | ✅ | ✅ | 4648 ms | 06-avaliacoes-e-reputacao.md, 09-suporte-e-chamados.md, 03-cancelamentos-e-contestacoes.md |
| 107 | factual | answered | rag → rag | ✅ | ✅ | 2151 ms | 07-embalagem-e-entrega.md, 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md |
| 108 | factual | answered | rag → rag | ✅ | ✅ | 1516 ms | 08-promocoes-e-cupons.md |
| 109 | factual | answered | rag → rag | ✅ | ✅ | 1398 ms | 09-suporte-e-chamados.md, 02-repasse-financeiro.md, 03-cancelamentos-e-contestacoes.md |
| 110 | factual | answered | rag → rag | ✅ | ✅ | 1348 ms | 10-conta-acessos-e-seguranca.md, 09-suporte-e-chamados.md |
| 111 | factual | answered | rag → rag | ✅ | ✅ | 1810 ms | 11-pagamentos-e-fiscal.md, 09-suporte-e-chamados.md, 02-repasse-financeiro.md |
| 112 | factual | answered | rag → rag | ✅ | ✅ | 1875 ms | 01-planos-e-taxas.md, 07-embalagem-e-entrega.md, 02-repasse-financeiro.md |
| 113 | factual | answered | rag → rag | ✅ | ✅ | 2991 ms | 02-repasse-financeiro.md |
| 114 | factual | answered | rag → rag | ✅ | ✅ | 2224 ms | 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md |
| 115 | factual | answered | rag → rag | ✅ | ✅ | 2675 ms | 06-avaliacoes-e-reputacao.md, 05-horarios-pausas-e-disponibilidade.md, 03-cancelamentos-e-contestacoes.md |
| 116 | parafrase | fallback | rag → rag | ✅ | ❌ | 1525 ms | — |
| 117 | parafrase | answered | rag → rag | ✅ | ✅ | 2596 ms | 02-repasse-financeiro.md |
| 118 | parafrase | answered | rag → rag | ✅ | ✅ | 2057 ms | 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md, 07-embalagem-e-entrega.md |
| 119 | parafrase | answered | rag → rag | ✅ | ✅ | 2261 ms | 04-cardapio-e-fotos.md |
| 120 | parafrase | answered | rag → rag | ✅ | ✅ | 1777 ms | 05-horarios-pausas-e-disponibilidade.md |
| 121 | parafrase | fallback | rag → rag | ✅ | ❌ | 1571 ms | — |
| 122 | perfil | answered | rag → rag | ✅ | ✅ | 1864 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md |
| 123 | perfil | answered | rag → rag | ✅ | ✅ | 1646 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md, 11-pagamentos-e-fiscal.md |
| 124 | perfil | fallback | rag → rag | ✅ | ❌ | 1389 ms | — |
| 125 | perfil | answered | rag → rag | ✅ | ✅ | 1865 ms | 01-planos-e-taxas.md |
| 126 | perfil | fallback | rag → rag | ✅ | ❌ | 1722 ms | — |
| 127 | multi_doc | answered | rag → rag | ✅ | ✅ | 1728 ms | 08-promocoes-e-cupons.md |
| 128 | multi_doc | answered | rag → rag | ✅ | ✅ | 1953 ms | 03-cancelamentos-e-contestacoes.md, 02-repasse-financeiro.md |
| 129 | multi_doc | answered | rag → rag | ✅ | ❌ | 2373 ms | 01-planos-e-taxas.md, 07-embalagem-e-entrega.md, 02-repasse-financeiro.md, 11-pagamentos-e-fiscal.md |
| 130 | multi_doc | fallback | rag → rag | ✅ | ❌ | 2648 ms | — |
| 131 | multi_doc | answered | rag → rag | ✅ | ✅ | 1853 ms | 02-repasse-financeiro.md, 10-conta-acessos-e-seguranca.md |
| 132 | multi_turno | answered | rag → rag | ✅ | ✅ | 4654 ms | 01-planos-e-taxas.md, 07-embalagem-e-entrega.md |
| 133 | multi_turno | answered | rag → rag | ✅ | ✅ | 4934 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md, 11-pagamentos-e-fiscal.md |
| 134 | multi_turno | fallback | rag → rag | ✅ | ❌ | 8750 ms | — |
| 135 | multi_turno | answered | rag → rag | ✅ | ✅ | 10992 ms | 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md |
| 136 | multi_turno | answered | rag → rag | ✅ | ✅ | 5955 ms | 09-suporte-e-chamados.md, 04-cardapio-e-fotos.md, 05-horarios-pausas-e-disponibilidade.md, 07-embalagem-e-entrega.md |
| 137 | fora_de_escopo | fallback | rag → rag | — | ✅ | 1676 ms | — |
| 138 | fora_de_escopo | fallback | rag → rag | — | ✅ | 1237 ms | — |
| 139 | fora_de_escopo | fallback | rag → rag | — | ✅ | 2750 ms | — |
| 140 | fora_de_escopo | fallback | rag → rag | — | ✅ | 2470 ms | — |
| 141 | fora_de_escopo | fallback | rag → rag | — | ✅ | 2341 ms | — |
| 142 | fora_de_escopo | fallback | rag → rag | — | ✅ | 683 ms | — |
| 143 | fora_de_escopo | fallback | rag → rag | — | ✅ | 1833 ms | — |
| 144 | adversarial | fallback | rag → rag | — | ✅ | 2474 ms | — |
| 145 | adversarial | fallback | rag → rag | — | ✅ | 2364 ms | — |
| 146 | adversarial | fallback | rag → rag | — | ✅ | 2488 ms | — |
| 147 | adversarial | fallback | rag → rag | — | ✅ | 1200 ms | — |
| 148 | bloqueio | blocked_input | rag → — | — | ✅ | 1 ms | — |
| 149 | bloqueio | blocked_input | rag → — | — | ✅ | 1 ms | — |
| 150 | bloqueio | blocked_input | rag → — | — | ✅ | 1 ms | — |
| 151 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 200 ms | — |
| 152 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 195 ms | — |
| 153 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 194 ms | — |
| 154 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 202 ms | — |
| 155 | conversa | fallback | conversa → rag | — | ❌ | 3768 ms | — |
| 156 | conversa | fallback | conversa → rag | — | ❌ | 5761 ms | — |
| 157 | conversa | fallback | conversa → rag | — | ❌ | 695 ms | — |
| 158 | conversa | fallback | conversa → rag | — | ❌ | 2568 ms | — |
| 159 | misto | answered | rag → rag | — | ✅ | 4836 ms | 01-planos-e-taxas.md |
| 160 | misto | answered | rag → rag | — | ✅ | 4613 ms | 02-repasse-financeiro.md |
| 161 | misto | answered | rag → rag | — | ✅ | 8446 ms | 11-pagamentos-e-fiscal.md, 01-planos-e-taxas.md, 08-promocoes-e-cupons.md, 02-repasse-financeiro.md |
| 162 | misto | answered | rag → rag | — | ✅ | 3028 ms | 03-cancelamentos-e-contestacoes.md, 09-suporte-e-chamados.md, 06-avaliacoes-e-reputacao.md |

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

### Pergunta 124 (perfil)

- Pergunta: Qual comissão eu pago nos pedidos de clientes que ficam fora da minha área de entrega?
- Esperado: resposta com 22% de 01-planos-e-taxas.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Qual comissão eu pago nos pedidos de clientes que ficam fora da minha área de entrega?
- Trechos recuperados (5) [score | sem | kw]:
  - 01-planos-e-taxas.md › Dinheiro na entrega [0.77 | 0.67 | 1.00]
  - 01-planos-e-taxas.md › Área própria e raio do Plano Misto [0.76 | 0.72 | 0.86]
  - 01-planos-e-taxas.md › Comissão por plano [0.75 | 0.70 | 0.86]
  - 01-planos-e-taxas.md › Exemplo de conta de um pedido [0.74 | 0.69 | 0.86]
  - 11-pagamentos-e-fiscal.md › Restrições de cada forma [0.73 | 0.62 | 1.00]

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
- Resposta: O custo do Rango Chama (entregador avulso) é descontado diretamente do seu repasse financeiro. Você não precisa fazer nenhum pagamento separado na hora: o valor de cada corrida realizada é abatido de forma automática no fechamento do seu repasse.
- Busca: Chamei o entregador avulso da Rango duas vezes nesta semana. Como eu pago essas corridas?
- Trechos recuperados (5) [score | sem | kw]:
  - 01-planos-e-taxas.md › Rango Chama [0.70 | 0.75 | 0.60]
  - 07-embalagem-e-entrega.md › Entrega própria e entrega Rango [0.61 | 0.69 | 0.40]
  - 01-planos-e-taxas.md › Exemplo de conta de um pedido [0.60 | 0.69 | 0.40]
  - 02-repasse-financeiro.md › Descontos do repasse [0.60 | 0.68 | 0.40]
  - 11-pagamentos-e-fiscal.md › Restrições de cada forma [0.60 | 0.68 | 0.40]

### Pergunta 130 (multi_doc)

- Pergunta: Minha disponibilidade está em 92%. Isso me impede de ganhar o selo Rango Recomenda?
- Esperado: resposta com 95% de 06-avaliacoes-e-reputacao.md, 05-horarios-pausas-e-disponibilidade.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Minha disponibilidade está em 92%. Isso me impede de ganhar o selo Rango Recomenda?
- Trechos recuperados (5) [score | sem | kw]:
  - 05-horarios-pausas-e-disponibilidade.md › Disponibilidade e visibilidade [0.75 | 0.82 | 0.57]
  - 06-avaliacoes-e-reputacao.md › Selo Rango Recomenda [0.73 | 0.80 | 0.57]
  - 03-cancelamentos-e-contestacoes.md › Taxa de cancelamento e visibilidade [0.63 | 0.72 | 0.43]
  - 06-avaliacoes-e-reputacao.md › Quando abrir um chamado [0.61 | 0.68 | 0.43]
  - 05-horarios-pausas-e-disponibilidade.md › Como manter a disponibilidade alta [0.61 | 0.74 | 0.29]

### Pergunta 134 (multi_turno)

- Pergunta: Como eu peço para a Rango remover uma avaliação com ofensa? → E quanto tempo vocês levam para responder?
- Esperado: resposta com 3 dias úteis de 06-avaliacoes-e-reputacao.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Quanto tempo a Rango leva para responder a solicitação de moderação de uma avaliação?
- Trechos recuperados (5) [score | sem | kw]:
  - 06-avaliacoes-e-reputacao.md › Moderação manual [0.73 | 0.83 | 0.50]
  - 06-avaliacoes-e-reputacao.md › Quando abrir um chamado [0.65 | 0.76 | 0.38]
  - 09-suporte-e-chamados.md › Escalonamento e ouvidoria [0.64 | 0.76 | 0.38]
  - 06-avaliacoes-e-reputacao.md › Como a nota é calculada [0.62 | 0.73 | 0.38]
  - 05-horarios-pausas-e-disponibilidade.md › Fechamento preventivo [0.60 | 0.69 | 0.38]

### Pergunta 155 (conversa)

- Pergunta: obrigada, ajudou muito
- Esperado: conversa sem Não encontrei essa informação na base do parceiro
- Motivo: não foi small_talk (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: obrigada, ajudou muito
- Trechos recuperados (5) [score | sem | kw]:
  - 09-suporte-e-chamados.md › Quando não é preciso abrir um chamado [0.58 | 0.62 | 0.50]
  - 04-cardapio-e-fotos.md › Quando abrir um chamado [0.58 | 0.61 | 0.50]
  - 09-suporte-e-chamados.md › Protocolo [0.58 | 0.61 | 0.50]
  - 08-promocoes-e-cupons.md › Para que servem as promoções [0.58 | 0.61 | 0.50]
  - 09-suporte-e-chamados.md › Resposta e reabertura [0.57 | 0.60 | 0.50]

### Pergunta 156 (conversa)

- Pergunta: valeu, era só isso
- Esperado: conversa sem Não encontrei essa informação na base do parceiro
- Motivo: não foi small_talk (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: valeu, era só isso
- Trechos recuperados (5) [score | sem | kw]:
  - 08-promocoes-e-cupons.md › Entrega grátis [0.73 | 0.62 | 1.00]
  - 11-pagamentos-e-fiscal.md › Restrições de cada forma [0.73 | 0.61 | 1.00]
  - 10-conta-acessos-e-seguranca.md › Troca de conta bancária [0.71 | 0.59 | 1.00]
  - 01-planos-e-taxas.md › Troca de plano [0.70 | 0.58 | 1.00]
  - 11-pagamentos-e-fiscal.md › Conferir os valores do mês [0.61 | 0.65 | 0.50]

### Pergunta 157 (conversa)

- Pergunta: o que você sabe fazer?
- Esperado: conversa sem Não encontrei essa informação na base do parceiro
- Motivo: não foi small_talk (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: o que você sabe fazer?
- Trechos recuperados (0) [score | sem | kw]:

### Pergunta 158 (conversa)

- Pergunta: tchau, até amanhã
- Esperado: conversa sem Não encontrei essa informação na base do parceiro
- Motivo: não foi small_talk (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: tchau, até amanhã
- Trechos recuperados (1) [score | sem | kw]:
  - 05-horarios-pausas-e-disponibilidade.md › Fechar o dia [0.56 | 0.65 | 0.33]
