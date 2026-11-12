# Avaliação: v5-baseline

Data: 2026-11-12T19:07:40.698Z · Commit: `fcb5d51`

## Configuração

- Preset: `padrao`
- Modelo de chat: `gemini-3.5-flash-lite`
- Modelo rápido (reescrita, resumo e juiz): `gemini-3.5-flash-lite`
- Modelo de embedding: `gemini-embedding-001` (768 dimensões)
- Roteador: ligado (até 12 palavras)

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
| contextMode | chunks |
| maxContextDocs | 3 |

## Métricas

Perguntas: 73 (45 no escopo). Erros: 0.

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Hit@K | 95,6% | ≥ 85% | ✅ |
| Acerto | 68,9% | ≥ 80% | ❌ |
| Recusa correta | 100,0% | ≥ 92% | ✅ |
| Falsa recusa | 26,7% | ≤ 10% | ❌ |
| Latência p50 | 3941 ms | registrar | — |
| Latência p95 | 26589 ms | registrar | — |
| Chamadas e tokens | 175 chamadas, 120255 de entrada, 3331 de saída | registrar | — |
| Contexto suficiente | 88,9% | sem meta | — |

## Rotas

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Acerto de rota | 100,0% | ≥ 95% | ✅ |
| Falso small talk | 0 | 0 | ✅ |
| Chamadas evitadas | 8 | registrar | — |
| Acerto cumprimento | 100,0% | registrar | — |
| Acerto conversa | 100,0% | registrar | — |
| Acerto mistas | 100,0% | registrar | — |
| Latência média das curtas no RAG | 13870 ms | registrar | — |

## Por pergunta

Fora do escopo e bloqueio: “Correto” indica recusa correta.

| Id | Tipo | Status | Rota | Hit | Correto | Latência | Fontes | Causa |
|---|---|---|---|---|---|---|---|---|
| 101 | factual | answered | rag → rag | ✅ | ✅ | 7763 ms | 01-planos-e-taxas.md, 03-cancelamentos-e-contestacoes.md | — |
| 102 | factual | answered | rag → rag | ✅ | ✅ | 16117 ms | 02-repasse-financeiro.md | — |
| 103 | factual | answered | rag → rag | ✅ | ✅ | 18715 ms | 03-cancelamentos-e-contestacoes.md, 09-suporte-e-chamados.md | — |
| 104 | factual | answered | rag → rag | ✅ | ✅ | 14357 ms | 04-cardapio-e-fotos.md, 06-avaliacoes-e-reputacao.md | — |
| 105 | factual | answered | rag → rag | ✅ | ✅ | 41195 ms | 05-horarios-pausas-e-disponibilidade.md, 03-cancelamentos-e-contestacoes.md, 07-embalagem-e-entrega.md | — |
| 106 | factual | answered | rag → rag | ✅ | ✅ | 5558 ms | 06-avaliacoes-e-reputacao.md, 09-suporte-e-chamados.md, 03-cancelamentos-e-contestacoes.md | — |
| 107 | factual | answered | rag → rag | ✅ | ✅ | 1680 ms | 07-embalagem-e-entrega.md, 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md | — |
| 108 | factual | answered | rag → rag | ✅ | ✅ | 2268 ms | 08-promocoes-e-cupons.md | — |
| 109 | factual | answered | rag → rag | ✅ | ✅ | 3009 ms | 09-suporte-e-chamados.md, 02-repasse-financeiro.md, 03-cancelamentos-e-contestacoes.md | — |
| 110 | factual | answered | rag → rag | ✅ | ✅ | 2583 ms | 10-conta-acessos-e-seguranca.md, 09-suporte-e-chamados.md | — |
| 111 | factual | answered | rag → rag | ✅ | ✅ | 25204 ms | 11-pagamentos-e-fiscal.md, 09-suporte-e-chamados.md, 02-repasse-financeiro.md | — |
| 112 | factual | answered | rag → rag | ✅ | ✅ | 9097 ms | 01-planos-e-taxas.md, 07-embalagem-e-entrega.md, 02-repasse-financeiro.md | — |
| 113 | factual | answered | rag → rag | ✅ | ✅ | 16199 ms | 02-repasse-financeiro.md | — |
| 114 | factual | answered | rag → rag | ✅ | ✅ | 6217 ms | 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md | — |
| 115 | factual | answered | rag → rag | ✅ | ✅ | 2260 ms | 06-avaliacoes-e-reputacao.md, 05-horarios-pausas-e-disponibilidade.md, 03-cancelamentos-e-contestacoes.md | — |
| 116 | parafrase | fallback | rag → rag | ✅ | ❌ | 12963 ms | — | busca |
| 117 | parafrase | answered | rag → rag | ✅ | ✅ | 38436 ms | 02-repasse-financeiro.md | — |
| 118 | parafrase | answered | rag → rag | ✅ | ✅ | 26589 ms | 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md, 07-embalagem-e-entrega.md | — |
| 119 | parafrase | fallback | rag → rag | ✅ | ❌ | 2185 ms | — | geração |
| 120 | parafrase | answered | rag → rag | ✅ | ✅ | 12333 ms | 05-horarios-pausas-e-disponibilidade.md | — |
| 121 | parafrase | fallback | rag → rag | ✅ | ❌ | 21505 ms | — | busca |
| 122 | perfil | answered | rag → rag | ✅ | ✅ | 3941 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md | — |
| 123 | perfil | answered | rag → rag | ✅ | ✅ | 4772 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md, 11-pagamentos-e-fiscal.md | — |
| 124 | perfil | fallback | rag → rag | ✅ | ❌ | 6556 ms | — | geração |
| 125 | perfil | answered | rag → rag | ✅ | ✅ | 8740 ms | 01-planos-e-taxas.md | — |
| 126 | perfil | fallback | rag → rag | ✅ | ❌ | 2404 ms | — | geração |
| 127 | multi_doc | answered | rag → rag | ✅ | ✅ | 7163 ms | 08-promocoes-e-cupons.md | — |
| 128 | multi_doc | answered | rag → rag | ✅ | ✅ | 3085 ms | 03-cancelamentos-e-contestacoes.md, 02-repasse-financeiro.md | — |
| 129 | multi_doc | answered | rag → rag | ✅ | ❌ | 3791 ms | 01-planos-e-taxas.md, 07-embalagem-e-entrega.md, 02-repasse-financeiro.md, 11-pagamentos-e-fiscal.md | geração |
| 130 | multi_doc | answered | rag → rag | ✅ | ✅ | 3717 ms | 05-horarios-pausas-e-disponibilidade.md, 06-avaliacoes-e-reputacao.md, 03-cancelamentos-e-contestacoes.md | — |
| 131 | multi_doc | answered | rag → rag | ✅ | ✅ | 8965 ms | 02-repasse-financeiro.md, 10-conta-acessos-e-seguranca.md | — |
| 132 | multi_turno | fallback | rag → rag | ✅ | ❌ | 10555 ms | — | geração |
| 133 | multi_turno | answered | rag → rag | ✅ | ✅ | 24225 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md, 11-pagamentos-e-fiscal.md | — |
| 134 | multi_turno | fallback | rag → rag | ✅ | ❌ | 21142 ms | — | geração |
| 135 | multi_turno | answered | rag → rag | ✅ | ✅ | 9847 ms | 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md | — |
| 136 | multi_turno | answered | rag → rag | ✅ | ✅ | 58812 ms | 09-suporte-e-chamados.md, 04-cardapio-e-fotos.md, 05-horarios-pausas-e-disponibilidade.md, 07-embalagem-e-entrega.md | — |
| 137 | fora_de_escopo | fallback | rag → rag | — | ✅ | 6631 ms | — | — |
| 138 | fora_de_escopo | fallback | rag → rag | — | ✅ | 685 ms | — | — |
| 139 | fora_de_escopo | fallback | rag → rag | — | ✅ | 1860 ms | — | — |
| 140 | fora_de_escopo | fallback | rag → rag | — | ✅ | 10240 ms | — | — |
| 141 | fora_de_escopo | fallback | rag → rag | — | ✅ | 4653 ms | — | — |
| 142 | fora_de_escopo | fallback | rag → rag | — | ✅ | 1960 ms | — | — |
| 143 | fora_de_escopo | fallback | rag → rag | — | ✅ | 1938 ms | — | — |
| 144 | adversarial | fallback | rag → rag | — | ✅ | 2071 ms | — | — |
| 145 | adversarial | fallback | rag → rag | — | ✅ | 1739 ms | — | — |
| 146 | adversarial | fallback | rag → rag | — | ✅ | 12058 ms | — | — |
| 147 | adversarial | fallback | rag → rag | — | ✅ | 723 ms | — | — |
| 148 | bloqueio | blocked_input | rag → — | — | ✅ | 1 ms | — | — |
| 149 | bloqueio | blocked_input | rag → — | — | ✅ | 1 ms | — | — |
| 150 | bloqueio | blocked_input | rag → — | — | ✅ | 0 ms | — | — |
| 151 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 232 ms | — | — |
| 152 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 197 ms | — | — |
| 153 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 191 ms | — | — |
| 154 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 189 ms | — | — |
| 155 | conversa | small_talk | conversa → conversa | — | ✅ | 2083 ms | — | — |
| 156 | conversa | small_talk | conversa → conversa | — | ✅ | 1874 ms | — | — |
| 157 | conversa | small_talk | conversa → conversa | — | ✅ | 1798 ms | — | — |
| 158 | conversa | small_talk | conversa → conversa | — | ✅ | 15476 ms | — | — |
| 159 | misto | answered | rag → rag | — | ✅ | 3237 ms | 01-planos-e-taxas.md | — |
| 160 | misto | answered | rag → rag | — | ✅ | 12647 ms | 02-repasse-financeiro.md | — |
| 161 | misto | answered | rag → rag | — | ✅ | 3067 ms | 11-pagamentos-e-fiscal.md, 01-planos-e-taxas.md, 08-promocoes-e-cupons.md, 02-repasse-financeiro.md | — |
| 162 | misto | answered | rag → rag | — | ✅ | 20553 ms | 03-cancelamentos-e-contestacoes.md, 09-suporte-e-chamados.md, 06-avaliacoes-e-reputacao.md | — |
| 163 | parafrase | fallback | rag → rag | ✅ | ❌ | 20891 ms | — | busca |
| 164 | parafrase | fallback | rag → rag | ❌ | ❌ | 6174 ms | — | geração |
| 165 | parafrase | fallback | rag → rag | ✅ | ❌ | 18746 ms | — | busca |
| 166 | parafrase | answered | rag → rag | ✅ | ✅ | 2645 ms | 01-planos-e-taxas.md, 08-promocoes-e-cupons.md, 02-repasse-financeiro.md | — |
| 167 | aberta | answered | rag → rag | ✅ | ✅ | 2905 ms | 04-cardapio-e-fotos.md, 07-embalagem-e-entrega.md | — |
| 168 | aberta | fallback | rag → rag | ✅ | ❌ | 2539 ms | — | geração |
| 169 | aberta | answered | rag → rag | ✅ | ✅ | 3497 ms | 09-suporte-e-chamados.md | — |
| 170 | aberta | answered | rag → rag | ✅ | ❌ | 3198 ms | 10-conta-acessos-e-seguranca.md | geração |
| 171 | perfil | fallback | rag → rag | ❌ | ❌ | 838 ms | — | busca |
| 172 | fora_de_escopo | fallback | rag → rag | — | ✅ | 15776 ms | — | — |
| 173 | fora_de_escopo | fallback | rag → rag | — | ✅ | 3894 ms | — | — |

## Falhas

### Pergunta 116 (parafrase)

- Pergunta: quanto a Rango morde de comissão quando o cliente passa aqui e leva o pedido?
- Esperado: resposta com 6% de 01-planos-e-taxas.md
- Motivo: falsa recusa (status fallback)
- Causa: busca
- Termos ausentes do contexto: 6%
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: quanto a Rango morde de comissão quando o cliente passa aqui e leva o pedido?
- Trechos recuperados (5) [score | sem | kw]:
  - 01-planos-e-taxas.md › Os três planos [0.73 | 0.76 | 0.67]
  - 02-repasse-financeiro.md › O que é o repasse [0.69 | 0.75 | 0.56]
  - 02-repasse-financeiro.md › Descontos do repasse [0.68 | 0.78 | 0.44]
  - 01-planos-e-taxas.md › Exemplo de conta de um pedido [0.68 | 0.78 | 0.44]
  - 01-planos-e-taxas.md › Comissão por plano [0.66 | 0.80 | 0.33]

### Pergunta 119 (parafrase)

- Pergunta: mandei a foto do x-salada e voltou recusada, qual tamanho de imagem vocês aceitam?
- Esperado: resposta com 1200, 900 de 04-cardapio-e-fotos.md
- Motivo: falsa recusa (status fallback)
- Causa: geração
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: mandei a foto do x-salada e voltou recusada, qual tamanho de imagem vocês aceitam?
- Trechos recuperados (2) [score | sem | kw]:
  - 04-cardapio-e-fotos.md › Fotos: formato, tamanho e resolução [0.66 | 0.78 | 0.36]
  - 04-cardapio-e-fotos.md › O que a foto deve mostrar [0.57 | 0.70 | 0.27]

### Pergunta 121 (parafrase)

- Pergunta: consigo fazer um cupom de 60% pra bombar a segunda-feira?
- Esperado: resposta com 50% de 08-promocoes-e-cupons.md
- Motivo: falsa recusa (status fallback)
- Causa: busca
- Termos ausentes do contexto: 50%
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: consigo fazer um cupom de 60% pra bombar a segunda-feira?
- Trechos recuperados (2) [score | sem | kw]:
  - 02-repasse-financeiro.md › Exemplo de repasse da semana [0.58 | 0.64 | 0.44]
  - 08-promocoes-e-cupons.md › Exemplo de cupom coparticipado [0.56 | 0.71 | 0.22]

### Pergunta 124 (perfil)

- Pergunta: Qual comissão eu pago nos pedidos de clientes que ficam fora da minha área de entrega?
- Esperado: resposta com 22% de 01-planos-e-taxas.md
- Motivo: falsa recusa (status fallback)
- Causa: geração
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
- Causa: geração
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
- Causa: geração
- Resposta: O custo das corridas do Rango Chama é descontado diretamente do seu repasse.
- Busca: Chamei o entregador avulso da Rango duas vezes nesta semana. Como eu pago essas corridas?
- Trechos recuperados (5) [score | sem | kw]:
  - 01-planos-e-taxas.md › Rango Chama [0.70 | 0.75 | 0.60]
  - 07-embalagem-e-entrega.md › Entrega própria e entrega Rango [0.61 | 0.69 | 0.40]
  - 01-planos-e-taxas.md › Exemplo de conta de um pedido [0.60 | 0.69 | 0.40]
  - 02-repasse-financeiro.md › Descontos do repasse [0.60 | 0.68 | 0.40]
  - 11-pagamentos-e-fiscal.md › Restrições de cada forma [0.60 | 0.68 | 0.40]

### Pergunta 132 (multi_turno)

- Pergunta: Estou no Plano Próprio. Quanto é a mensalidade? → E no outro plano, em que a Rango faz as entregas?
- Esperado: resposta com 139 de 01-planos-e-taxas.md
- Motivo: falsa recusa (status fallback)
- Causa: geração
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Qual é o valor da mensalidade do plano em que a Rango faz as entregas?
- Trechos recuperados (5) [score | sem | kw]:
  - 01-planos-e-taxas.md › Mensalidade e isenção [0.82 | 0.81 | 0.83]
  - 01-planos-e-taxas.md › Os três planos [0.80 | 0.79 | 0.83]
  - 01-planos-e-taxas.md › Rango Chama [0.75 | 0.78 | 0.67]
  - 07-embalagem-e-entrega.md › Entrega própria e entrega Rango [0.74 | 0.77 | 0.67]
  - 01-planos-e-taxas.md › Taxa de entrega por plano [0.73 | 0.76 | 0.67]

### Pergunta 134 (multi_turno)

- Pergunta: Como eu peço para a Rango remover uma avaliação com ofensa? → E quanto tempo vocês levam para responder?
- Esperado: resposta com 3 dias úteis de 06-avaliacoes-e-reputacao.md
- Motivo: falsa recusa (status fallback)
- Causa: geração
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Quanto tempo a Rango leva para responder ao pedido de moderação de uma avaliação?
- Trechos recuperados (5) [score | sem | kw]:
  - 06-avaliacoes-e-reputacao.md › Moderação manual [0.77 | 0.83 | 0.63]
  - 06-avaliacoes-e-reputacao.md › Quando abrir um chamado [0.68 | 0.76 | 0.50]
  - 09-suporte-e-chamados.md › Escalonamento e ouvidoria [0.68 | 0.76 | 0.50]
  - 05-horarios-pausas-e-disponibilidade.md › Fechamento preventivo [0.64 | 0.70 | 0.50]
  - 06-avaliacoes-e-reputacao.md › Como a nota é calculada [0.62 | 0.73 | 0.38]

### Pergunta 163 (parafrase)

- Pergunta: Esqueci minha senha do Painel Rango, como troco?
- Esperado: resposta com Esqueci minha senha de 10-conta-acessos-e-seguranca.md
- Motivo: falsa recusa (status fallback)
- Causa: busca
- Termos ausentes do contexto: Esqueci minha senha
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Esqueci minha senha do Painel Rango, como troco?
- Trechos recuperados (5) [score | sem | kw]:
  - 10-conta-acessos-e-seguranca.md › Golpes comuns [0.74 | 0.72 | 0.80]
  - 10-conta-acessos-e-seguranca.md › Sessão do Painel Rango [0.71 | 0.76 | 0.60]
  - 10-conta-acessos-e-seguranca.md › Como a Rango fala com a loja [0.69 | 0.73 | 0.60]
  - 10-conta-acessos-e-seguranca.md › Usuários da loja [0.69 | 0.72 | 0.60]
  - 09-suporte-e-chamados.md › Quando não é preciso abrir um chamado [0.68 | 0.71 | 0.60]

### Pergunta 164 (parafrase)

- Pergunta: Como falo com o Financeiro?
- Esperado: resposta com chamado, Ajuda de 09-suporte-e-chamados.md
- Motivo: falsa recusa (status fallback)
- Causa: geração
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Como falo com o Financeiro?
- Trechos recuperados (5) [score | sem | kw]:
  - 11-pagamentos-e-fiscal.md › Quando abrir um chamado [0.66 | 0.72 | 0.50]
  - 02-repasse-financeiro.md › Quando abrir um chamado [0.64 | 0.70 | 0.50]
  - 01-planos-e-taxas.md › Quando abrir um chamado [0.64 | 0.69 | 0.50]
  - 11-pagamentos-e-fiscal.md › Conferir os valores do mês [0.63 | 0.69 | 0.50]
  - 08-promocoes-e-cupons.md › Quando abrir um chamado [0.63 | 0.69 | 0.50]

### Pergunta 165 (parafrase)

- Pergunta: quanto a Rango cobra pra adiantar a grana das vendas?
- Esperado: resposta com 2,49% de 02-repasse-financeiro.md
- Motivo: falsa recusa (status fallback)
- Causa: busca
- Termos ausentes do contexto: 2,49%
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: quanto a Rango cobra pra adiantar a grana das vendas?
- Trechos recuperados (5) [score | sem | kw]:
  - 01-planos-e-taxas.md › Os três planos [0.64 | 0.74 | 0.43]
  - 11-pagamentos-e-fiscal.md › Informe anual [0.64 | 0.72 | 0.43]
  - 02-repasse-financeiro.md › Descontos do repasse [0.62 | 0.76 | 0.29]
  - 02-repasse-financeiro.md › O que é o repasse [0.60 | 0.74 | 0.29]
  - 01-planos-e-taxas.md › Taxa de serviço ao cliente [0.60 | 0.74 | 0.29]

### Pergunta 168 (aberta)

- Pergunta: O que eu preciso saber sobre o repasse?
- Esperado: resposta com quarta de 02-repasse-financeiro.md
- Motivo: falsa recusa (status fallback)
- Causa: geração
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: O que eu preciso saber sobre o repasse?
- Trechos recuperados (5) [score | sem | kw]:
  - 02-repasse-financeiro.md › Descontos do repasse [0.67 | 0.74 | 0.50]
  - 02-repasse-financeiro.md › Antecipação [0.66 | 0.73 | 0.50]
  - 11-pagamentos-e-fiscal.md › Tributos [0.64 | 0.71 | 0.50]
  - 10-conta-acessos-e-seguranca.md › Troca de conta bancária [0.64 | 0.69 | 0.50]
  - 01-planos-e-taxas.md › Quando abrir um chamado [0.63 | 0.68 | 0.50]

### Pergunta 170 (aberta)

- Pergunta: Quais cuidados devo ter com a segurança da minha conta?
- Esperado: resposta com 2 etapas de 10-conta-acessos-e-seguranca.md
- Motivo: resposta sem todos os termos de deve_conter
- Causa: geração
- Resposta: Para manter a segurança da sua conta: 1. Use uma senha com no mínimo 10 caracteres (frase longa ou combinação de palavras, números e símbolos sem relação com o nome da loja) e não repita a senha de outros serviços. 2. Crie um usuário próprio para cada funcionário em Configurações > Usuários, sem com…
- Busca: Quais cuidados devo ter com a segurança da minha conta?
- Trechos recuperados (5) [score | sem | kw]:
  - 10-conta-acessos-e-seguranca.md › Senha [0.65 | 0.72 | 0.50]
  - 10-conta-acessos-e-seguranca.md › Usuários da loja [0.63 | 0.68 | 0.50]
  - 10-conta-acessos-e-seguranca.md › Perfis e permissões [0.63 | 0.68 | 0.50]
  - 10-conta-acessos-e-seguranca.md › Se a conta foi invadida [0.62 | 0.74 | 0.33]
  - 10-conta-acessos-e-seguranca.md › Golpes comuns [0.61 | 0.73 | 0.33]

### Pergunta 171 (perfil)

- Pergunta: Quero saber qual a diferença de preço do meu plano para o mais básico. Estou pensando em mudar
- Esperado: resposta com 139, 99 de 01-planos-e-taxas.md
- Motivo: falsa recusa (status fallback)
- Causa: busca
- Termos ausentes do contexto: 139, 99
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Quero saber qual a diferença de preço do meu plano para o mais básico. Estou pensando em mudar
- Trechos recuperados (0) [score | sem | kw]:
