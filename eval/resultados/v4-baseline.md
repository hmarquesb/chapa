# Avaliação: v4-baseline

Data: 2026-11-12T11:57:22.409Z · Commit: `a0d1cd8`

## Configuração

- Preset: `baseline`
- Modelo de chat: `gemini-3.5-flash-lite`
- Modelo rápido (reescrita, resumo e juiz): `gemini-3.5-flash-lite`
- Modelo de embedding: `gemini-embedding-001` (768 dimensões)
- Roteador: desligado (só a regra de cumprimento)

| Campo | Valor |
|---|---|
| topK | 5 |
| minScore | 0.7 |
| alpha | 0.7 |
| candidateLimit | 30 |
| chunkStrategy | fixed |
| chunkSize | 500 |
| chunkOverlap | 100 |
| rewriteQuery | false |

## Métricas

Perguntas: 62 (36 no escopo). Erros: 0.

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Hit@K | 61,1% | ≥ 85% | ❌ |
| Acerto | 41,7% | ≥ 80% | ❌ |
| Recusa correta | 100,0% | ≥ 92% | ✅ |
| Falsa recusa | 58,3% | ≤ 10% | ❌ |
| Latência p50 | 1035 ms | registrar | — |
| Latência p95 | 6037 ms | registrar | — |
| Chamadas e tokens | 90 chamadas, 34474 de entrada, 1149 de saída | registrar | — |

## Rotas

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Acerto de rota | 93,2% | ≥ 95% | ❌ |
| Falso small talk | 0 | 0 | ✅ |
| Chamadas evitadas | 4 | registrar | — |
| Acerto cumprimento | 100,0% | registrar | — |
| Acerto conversa | 0,0% | registrar | — |
| Acerto mistas | 50,0% | registrar | — |
| Latência média das curtas no RAG | 2787 ms | registrar | — |

## Por pergunta

Fora do escopo e bloqueio: “Correto” indica recusa correta.

| Id | Tipo | Status | Rota | Hit | Correto | Latência | Fontes |
|---|---|---|---|---|---|---|---|
| 101 | factual | answered | rag → rag | ✅ | ✅ | 6811 ms | 01-planos-e-taxas.md |
| 102 | factual | answered | rag → rag | ✅ | ✅ | 4313 ms | 02-repasse-financeiro.md |
| 103 | factual | answered | rag → rag | ✅ | ✅ | 1967 ms | 03-cancelamentos-e-contestacoes.md |
| 104 | factual | answered | rag → rag | ✅ | ✅ | 3456 ms | 04-cardapio-e-fotos.md |
| 105 | factual | fallback | rag → rag | ❌ | ❌ | 752 ms | — |
| 106 | factual | answered | rag → rag | ✅ | ✅ | 6037 ms | 06-avaliacoes-e-reputacao.md |
| 107 | factual | fallback | rag → rag | ❌ | ❌ | 707 ms | — |
| 108 | factual | fallback | rag → rag | ❌ | ❌ | 707 ms | — |
| 109 | factual | fallback | rag → rag | ❌ | ❌ | 1234 ms | — |
| 110 | factual | fallback | rag → rag | ✅ | ❌ | 4478 ms | — |
| 111 | factual | answered | rag → rag | ✅ | ✅ | 1933 ms | 11-pagamentos-e-fiscal.md |
| 112 | factual | answered | rag → rag | ✅ | ✅ | 1878 ms | 01-planos-e-taxas.md |
| 113 | factual | answered | rag → rag | ✅ | ✅ | 2027 ms | 02-repasse-financeiro.md |
| 114 | factual | fallback | rag → rag | ❌ | ❌ | 605 ms | — |
| 115 | factual | fallback | rag → rag | ✅ | ❌ | 2557 ms | — |
| 116 | parafrase | fallback | rag → rag | ✅ | ❌ | 2467 ms | — |
| 117 | parafrase | fallback | rag → rag | ❌ | ❌ | 631 ms | — |
| 118 | parafrase | fallback | rag → rag | ❌ | ❌ | 686 ms | — |
| 119 | parafrase | fallback | rag → rag | ❌ | ❌ | 643 ms | — |
| 120 | parafrase | fallback | rag → rag | ❌ | ❌ | 669 ms | — |
| 121 | parafrase | fallback | rag → rag | ❌ | ❌ | 1378 ms | — |
| 122 | perfil | answered | rag → rag | ✅ | ✅ | 1829 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md |
| 123 | perfil | fallback | rag → rag | ✅ | ❌ | 2543 ms | — |
| 124 | perfil | answered | rag → rag | ✅ | ✅ | 2628 ms | 01-planos-e-taxas.md |
| 125 | perfil | answered | rag → rag | ✅ | ✅ | 3167 ms | 01-planos-e-taxas.md |
| 126 | perfil | fallback | rag → rag | ❌ | ❌ | 619 ms | — |
| 127 | multi_doc | answered | rag → rag | ✅ | ✅ | 5803 ms | 08-promocoes-e-cupons.md |
| 128 | multi_doc | answered | rag → rag | ✅ | ✅ | 3524 ms | 03-cancelamentos-e-contestacoes.md |
| 129 | multi_doc | fallback | rag → rag | ❌ | ❌ | 707 ms | — |
| 130 | multi_doc | fallback | rag → rag | ✅ | ❌ | 1719 ms | — |
| 131 | multi_doc | fallback | rag → rag | ✅ | ❌ | 4404 ms | — |
| 132 | multi_turno | fallback | rag → rag | ✅ | ❌ | 10396 ms | — |
| 133 | multi_turno | answered | rag → rag | ✅ | ✅ | 14996 ms | 01-planos-e-taxas.md, 11-pagamentos-e-fiscal.md |
| 134 | multi_turno | fallback | rag → rag | ❌ | ❌ | 3312 ms | — |
| 135 | multi_turno | fallback | rag → rag | ❌ | ❌ | 2674 ms | — |
| 136 | multi_turno | answered | rag → rag | ✅ | ✅ | 4856 ms | 09-suporte-e-chamados.md, 05-horarios-pausas-e-disponibilidade.md |
| 137 | fora_de_escopo | fallback | rag → rag | — | ✅ | 759 ms | — |
| 138 | fora_de_escopo | fallback | rag → rag | — | ✅ | 665 ms | — |
| 139 | fora_de_escopo | fallback | rag → rag | — | ✅ | 641 ms | — |
| 140 | fora_de_escopo | fallback | rag → rag | — | ✅ | 691 ms | — |
| 141 | fora_de_escopo | fallback | rag → rag | — | ✅ | 929 ms | — |
| 142 | fora_de_escopo | fallback | rag → rag | — | ✅ | 686 ms | — |
| 143 | fora_de_escopo | fallback | rag → rag | — | ✅ | 1219 ms | — |
| 144 | adversarial | fallback | rag → rag | — | ✅ | 1205 ms | — |
| 145 | adversarial | fallback | rag → rag | — | ✅ | 680 ms | — |
| 146 | adversarial | fallback | rag → rag | — | ✅ | 746 ms | — |
| 147 | adversarial | fallback | rag → rag | — | ✅ | 702 ms | — |
| 148 | bloqueio | blocked_input | rag → — | — | ✅ | 1 ms | — |
| 149 | bloqueio | blocked_input | rag → — | — | ✅ | 1 ms | — |
| 150 | bloqueio | blocked_input | rag → — | — | ✅ | 1 ms | — |
| 151 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 538 ms | — |
| 152 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 186 ms | — |
| 153 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 182 ms | — |
| 154 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 194 ms | — |
| 155 | conversa | fallback | conversa → rag | — | ❌ | 1035 ms | — |
| 156 | conversa | fallback | conversa → rag | — | ❌ | 2915 ms | — |
| 157 | conversa | fallback | conversa → rag | — | ❌ | 679 ms | — |
| 158 | conversa | fallback | conversa → rag | — | ❌ | 699 ms | — |
| 159 | misto | answered | rag → rag | — | ✅ | 2248 ms | 01-planos-e-taxas.md |
| 160 | misto | fallback | rag → rag | — | ❌ | 693 ms | — |
| 161 | misto | answered | rag → rag | — | ✅ | 2727 ms | 01-planos-e-taxas.md, 11-pagamentos-e-fiscal.md |
| 162 | misto | fallback | rag → rag | — | ❌ | 758 ms | — |

## Falhas

### Pergunta 105 (factual)

- Pergunta: Por quanto tempo no máximo dá para deixar uma pausa programada?
- Esperado: resposta com 8 horas de 05-horarios-pausas-e-disponibilidade.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Por quanto tempo no máximo dá para deixar uma pausa programada?
- Trechos recuperados (0) [score | sem | kw]:

### Pergunta 107 (factual)

- Pergunta: Qual é o maior tempo de preparo que eu consigo configurar para a cozinha?
- Esperado: resposta com 90 minutos de 07-embalagem-e-entrega.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Qual é o maior tempo de preparo que eu consigo configurar para a cozinha?
- Trechos recuperados (0) [score | sem | kw]:

### Pergunta 108 (factual)

- Pergunta: Qual o maior desconto que posso dar num cupom e por quanto tempo a campanha pode ficar no ar?
- Esperado: resposta com 50%, 30 dias de 08-promocoes-e-cupons.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Qual o maior desconto que posso dar num cupom e por quanto tempo a campanha pode ficar no ar?
- Trechos recuperados (0) [score | sem | kw]:

### Pergunta 109 (factual)

- Pergunta: Abri um chamado sobre um desconto estranho no extrato. Em quanto tempo a Rango tem que responder?
- Esperado: resposta com 3 dias úteis de 09-suporte-e-chamados.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Abri um chamado sobre um desconto estranho no extrato. Em quanto tempo a Rango tem que responder?
- Trechos recuperados (0) [score | sem | kw]:

### Pergunta 110 (factual)

- Pergunta: Quantos caracteres a senha do Painel Rango precisa ter no mínimo?
- Esperado: resposta com 10 caracteres de 10-conta-acessos-e-seguranca.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Quantos caracteres a senha do Painel Rango precisa ter no mínimo?
- Trechos recuperados (1) [score | sem | kw]:
  - 10-conta-acessos-e-seguranca.md [0.70 | 0.79 | 0.50]

### Pergunta 114 (factual)

- Pergunta: Quanto tempo a loja tem para aceitar um pedido antes de ele ser cancelado sozinho?
- Esperado: resposta com 8 minutos de 03-cancelamentos-e-contestacoes.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Quanto tempo a loja tem para aceitar um pedido antes de ele ser cancelado sozinho?
- Trechos recuperados (0) [score | sem | kw]:

### Pergunta 115 (factual)

- Pergunta: Quais são os critérios para a minha loja ganhar o selo Rango Recomenda?
- Esperado: resposta com 4,6, 2%, 95% de 06-avaliacoes-e-reputacao.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Quais são os critérios para a minha loja ganhar o selo Rango Recomenda?
- Trechos recuperados (2) [score | sem | kw]:
  - 06-avaliacoes-e-reputacao.md [0.73 | 0.78 | 0.63]
  - 03-cancelamentos-e-contestacoes.md [0.71 | 0.75 | 0.63]

### Pergunta 116 (parafrase)

- Pergunta: quanto a Rango morde de comissão quando o cliente passa aqui e leva o pedido?
- Esperado: resposta com 6% de 01-planos-e-taxas.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: quanto a Rango morde de comissão quando o cliente passa aqui e leva o pedido?
- Trechos recuperados (2) [score | sem | kw]:
  - 01-planos-e-taxas.md [0.72 | 0.79 | 0.56]
  - 01-planos-e-taxas.md [0.72 | 0.74 | 0.67]

### Pergunta 117 (parafrase)

- Pergunta: a grana das vendas da semana cai na minha conta que dia?
- Esperado: resposta com quarta de 02-repasse-financeiro.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: a grana das vendas da semana cai na minha conta que dia?
- Trechos recuperados (0) [score | sem | kw]:

### Pergunta 118 (parafrase)

- Pergunta: se eu demorar pra aceitar, em quantos minutos o pedido cai sozinho?
- Esperado: resposta com 8 minutos de 03-cancelamentos-e-contestacoes.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: se eu demorar pra aceitar, em quantos minutos o pedido cai sozinho?
- Trechos recuperados (0) [score | sem | kw]:

### Pergunta 119 (parafrase)

- Pergunta: mandei a foto do x-salada e voltou recusada, qual tamanho de imagem vocês aceitam?
- Esperado: resposta com 1200, 900 de 04-cardapio-e-fotos.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: mandei a foto do x-salada e voltou recusada, qual tamanho de imagem vocês aceitam?
- Trechos recuperados (0) [score | sem | kw]:

### Pergunta 120 (parafrase)

- Pergunta: dá pra fechar a loja a tarde toda numa pausa só? qual é o limite?
- Esperado: resposta com 8 horas de 05-horarios-pausas-e-disponibilidade.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: dá pra fechar a loja a tarde toda numa pausa só? qual é o limite?
- Trechos recuperados (0) [score | sem | kw]:

### Pergunta 121 (parafrase)

- Pergunta: consigo fazer um cupom de 60% pra bombar a segunda-feira?
- Esperado: resposta com 50% de 08-promocoes-e-cupons.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: consigo fazer um cupom de 60% pra bombar a segunda-feira?
- Trechos recuperados (0) [score | sem | kw]:

### Pergunta 123 (perfil)

- Pergunta: Quanto eu pago de mensalidade por mês?
- Esperado: resposta com 139 sem R$ 99 de 01-planos-e-taxas.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Quanto eu pago de mensalidade por mês?
- Trechos recuperados (2) [score | sem | kw]:
  - 01-planos-e-taxas.md [0.74 | 0.74 | 0.75]
  - 02-repasse-financeiro.md [0.72 | 0.71 | 0.75]

### Pergunta 126 (perfil)

- Pergunta: Posso aceitar pagamento em dinheiro na entrega?
- Esperado: resposta com online de 11-pagamentos-e-fiscal.md, 01-planos-e-taxas.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Posso aceitar pagamento em dinheiro na entrega?
- Trechos recuperados (0) [score | sem | kw]:

### Pergunta 129 (multi_doc)

- Pergunta: Chamei o entregador avulso da Rango duas vezes nesta semana. Como eu pago essas corridas?
- Esperado: resposta com R$ 8,90, repasse de 01-planos-e-taxas.md, 02-repasse-financeiro.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Chamei o entregador avulso da Rango duas vezes nesta semana. Como eu pago essas corridas?
- Trechos recuperados (0) [score | sem | kw]:

### Pergunta 130 (multi_doc)

- Pergunta: Minha disponibilidade está em 92%. Isso me impede de ganhar o selo Rango Recomenda?
- Esperado: resposta com 95% de 06-avaliacoes-e-reputacao.md, 05-horarios-pausas-e-disponibilidade.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Minha disponibilidade está em 92%. Isso me impede de ganhar o selo Rango Recomenda?
- Trechos recuperados (2) [score | sem | kw]:
  - 05-horarios-pausas-e-disponibilidade.md [0.75 | 0.83 | 0.57]
  - 05-horarios-pausas-e-disponibilidade.md [0.73 | 0.79 | 0.57]

### Pergunta 131 (multi_doc)

- Pergunta: Meu repasse ficou retido porque a conta do banco foi encerrada. Troquei a conta hoje: quando recebo o dinheiro?
- Esperado: resposta com 48 horas, 5 dias úteis de 10-conta-acessos-e-seguranca.md, 02-repasse-financeiro.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Meu repasse ficou retido porque a conta do banco foi encerrada. Troquei a conta hoje: quando recebo o dinheiro?
- Trechos recuperados (1) [score | sem | kw]:
  - 02-repasse-financeiro.md [0.71 | 0.71 | 0.73]

### Pergunta 132 (multi_turno)

- Pergunta: Estou no Plano Próprio. Quanto é a mensalidade? → E no outro plano, em que a Rango faz as entregas?
- Esperado: resposta com 139 de 01-planos-e-taxas.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: E no outro plano, em que a Rango faz as entregas?
- Trechos recuperados (5) [score | sem | kw]:
  - 01-planos-e-taxas.md [0.78 | 0.77 | 0.80]
  - 07-embalagem-e-entrega.md [0.77 | 0.76 | 0.80]
  - 01-planos-e-taxas.md [0.77 | 0.75 | 0.80]
  - 01-planos-e-taxas.md [0.75 | 0.73 | 0.80]
  - 01-planos-e-taxas.md [0.75 | 0.73 | 0.80]

### Pergunta 134 (multi_turno)

- Pergunta: Como eu peço para a Rango remover uma avaliação com ofensa? → E quanto tempo vocês levam para responder?
- Esperado: resposta com 3 dias úteis de 06-avaliacoes-e-reputacao.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: E quanto tempo vocês levam para responder?
- Trechos recuperados (0) [score | sem | kw]:

### Pergunta 135 (multi_turno)

- Pergunta: Um pedido venceu sem aceite e contou como cancelado pela minha loja. Por quê? → E se eu não concordar com isso?
- Esperado: resposta com contest, 7 dias de 03-cancelamentos-e-contestacoes.md
- Motivo: falsa recusa (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: E se eu não concordar com isso?
- Trechos recuperados (0) [score | sem | kw]:

### Pergunta 155 (conversa)

- Pergunta: obrigada, ajudou muito
- Esperado: conversa sem Não encontrei essa informação na base do parceiro
- Motivo: não foi small_talk (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: obrigada, ajudou muito
- Trechos recuperados (0) [score | sem | kw]:

### Pergunta 156 (conversa)

- Pergunta: valeu, era só isso
- Esperado: conversa sem Não encontrei essa informação na base do parceiro
- Motivo: não foi small_talk (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: valeu, era só isso
- Trechos recuperados (5) [score | sem | kw]:
  - 11-pagamentos-e-fiscal.md [0.75 | 0.64 | 1.00]
  - 01-planos-e-taxas.md [0.74 | 0.63 | 1.00]
  - 01-planos-e-taxas.md [0.74 | 0.63 | 1.00]
  - 01-planos-e-taxas.md [0.73 | 0.62 | 1.00]
  - 08-promocoes-e-cupons.md [0.73 | 0.61 | 1.00]

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
- Trechos recuperados (0) [score | sem | kw]:

### Pergunta 160 (misto)

- Pergunta: Boa tarde, em que dia cai o repasse?
- Esperado: resposta com boa tarde, quarta de 02-repasse-financeiro.md
- Motivo: não respondeu (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Boa tarde, em que dia cai o repasse?
- Trechos recuperados (0) [score | sem | kw]:

### Pergunta 162 (misto)

- Pergunta: boa noite, até quantos dias posso contestar um cancelamento?
- Esperado: resposta com boa noite, 7 dias de 03-cancelamentos-e-contestacoes.md
- Motivo: não respondeu (status fallback)
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: boa noite, até quantos dias posso contestar um cancelamento?
- Trechos recuperados (0) [score | sem | kw]:
