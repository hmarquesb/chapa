# Avaliação: v5-docs

Data: 2026-11-12T19:23:34.310Z · Commit: `fcb5d51`

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
| contextMode | documents |
| maxContextDocs | 3 |

## Métricas

Perguntas: 73 (45 no escopo). Erros: 0.

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Hit@K | 95,6% | ≥ 85% | ✅ |
| Acerto | 91,1% | ≥ 80% | ✅ |
| Recusa correta | 100,0% | ≥ 92% | ✅ |
| Falsa recusa | 6,7% | ≤ 10% | ✅ |
| Latência p50 | 3356 ms | registrar | — |
| Latência p95 | 18672 ms | registrar | — |
| Chamadas e tokens | 173 chamadas, 250446 de entrada, 3107 de saída | registrar | — |
| Contexto suficiente | 97,8% | sem meta | — |

## Rotas

| Métrica | Valor | Meta | Status |
|---|---|---|---|
| Acerto de rota | 100,0% | ≥ 95% | ✅ |
| Falso small talk | 0 | 0 | ✅ |
| Chamadas evitadas | 8 | registrar | — |
| Acerto cumprimento | 100,0% | registrar | — |
| Acerto conversa | 100,0% | registrar | — |
| Acerto mistas | 100,0% | registrar | — |
| Latência média das curtas no RAG | 10081 ms | registrar | — |

## Por pergunta

Fora do escopo e bloqueio: “Correto” indica recusa correta.

| Id | Tipo | Status | Rota | Hit | Correto | Latência | Fontes | Causa |
|---|---|---|---|---|---|---|---|---|
| 101 | factual | answered | rag → rag | ✅ | ✅ | 14115 ms | 01-planos-e-taxas.md, 03-cancelamentos-e-contestacoes.md | — |
| 102 | factual | answered | rag → rag | ✅ | ✅ | 9933 ms | 02-repasse-financeiro.md | — |
| 103 | factual | answered | rag → rag | ✅ | ✅ | 2068 ms | 03-cancelamentos-e-contestacoes.md, 09-suporte-e-chamados.md | — |
| 104 | factual | answered | rag → rag | ✅ | ✅ | 31322 ms | 04-cardapio-e-fotos.md, 06-avaliacoes-e-reputacao.md | — |
| 105 | factual | answered | rag → rag | ✅ | ✅ | 2351 ms | 05-horarios-pausas-e-disponibilidade.md, 03-cancelamentos-e-contestacoes.md, 07-embalagem-e-entrega.md | — |
| 106 | factual | answered | rag → rag | ✅ | ✅ | 16346 ms | 06-avaliacoes-e-reputacao.md, 09-suporte-e-chamados.md, 03-cancelamentos-e-contestacoes.md | — |
| 107 | factual | answered | rag → rag | ✅ | ✅ | 1688 ms | 07-embalagem-e-entrega.md, 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md | — |
| 108 | factual | answered | rag → rag | ✅ | ✅ | 17812 ms | 08-promocoes-e-cupons.md | — |
| 109 | factual | answered | rag → rag | ✅ | ✅ | 2372 ms | 09-suporte-e-chamados.md, 02-repasse-financeiro.md, 03-cancelamentos-e-contestacoes.md | — |
| 110 | factual | answered | rag → rag | ✅ | ✅ | 2357 ms | 10-conta-acessos-e-seguranca.md, 09-suporte-e-chamados.md | — |
| 111 | factual | answered | rag → rag | ✅ | ✅ | 1953 ms | 11-pagamentos-e-fiscal.md, 09-suporte-e-chamados.md, 02-repasse-financeiro.md | — |
| 112 | factual | answered | rag → rag | ✅ | ✅ | 2055 ms | 01-planos-e-taxas.md, 07-embalagem-e-entrega.md, 02-repasse-financeiro.md | — |
| 113 | factual | answered | rag → rag | ✅ | ✅ | 1538 ms | 02-repasse-financeiro.md | — |
| 114 | factual | answered | rag → rag | ✅ | ✅ | 11242 ms | 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md | — |
| 115 | factual | answered | rag → rag | ✅ | ✅ | 2270 ms | 06-avaliacoes-e-reputacao.md, 05-horarios-pausas-e-disponibilidade.md, 03-cancelamentos-e-contestacoes.md | — |
| 116 | parafrase | answered | rag → rag | ✅ | ✅ | 4010 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md | — |
| 117 | parafrase | answered | rag → rag | ✅ | ✅ | 2573 ms | 02-repasse-financeiro.md | — |
| 118 | parafrase | answered | rag → rag | ✅ | ✅ | 5195 ms | 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md, 07-embalagem-e-entrega.md | — |
| 119 | parafrase | answered | rag → rag | ✅ | ✅ | 1540 ms | 04-cardapio-e-fotos.md | — |
| 120 | parafrase | answered | rag → rag | ✅ | ✅ | 1600 ms | 05-horarios-pausas-e-disponibilidade.md | — |
| 121 | parafrase | fallback | rag → rag | ✅ | ❌ | 3356 ms | — | geração |
| 122 | perfil | answered | rag → rag | ✅ | ✅ | 9518 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md | — |
| 123 | perfil | answered | rag → rag | ✅ | ✅ | 3224 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md, 11-pagamentos-e-fiscal.md | — |
| 124 | perfil | answered | rag → rag | ✅ | ✅ | 2410 ms | 01-planos-e-taxas.md, 11-pagamentos-e-fiscal.md | — |
| 125 | perfil | answered | rag → rag | ✅ | ✅ | 2839 ms | 01-planos-e-taxas.md | — |
| 126 | perfil | answered | rag → rag | ✅ | ✅ | 11426 ms | 11-pagamentos-e-fiscal.md, 01-planos-e-taxas.md, 02-repasse-financeiro.md | — |
| 127 | multi_doc | answered | rag → rag | ✅ | ✅ | 1877 ms | 08-promocoes-e-cupons.md | — |
| 128 | multi_doc | answered | rag → rag | ✅ | ✅ | 1649 ms | 03-cancelamentos-e-contestacoes.md, 02-repasse-financeiro.md | — |
| 129 | multi_doc | answered | rag → rag | ✅ | ❌ | 1733 ms | 01-planos-e-taxas.md, 07-embalagem-e-entrega.md, 02-repasse-financeiro.md | geração |
| 130 | multi_doc | answered | rag → rag | ✅ | ✅ | 5650 ms | 05-horarios-pausas-e-disponibilidade.md, 06-avaliacoes-e-reputacao.md, 03-cancelamentos-e-contestacoes.md | — |
| 131 | multi_doc | answered | rag → rag | ✅ | ✅ | 3689 ms | 02-repasse-financeiro.md, 10-conta-acessos-e-seguranca.md | — |
| 132 | multi_turno | answered | rag → rag | ✅ | ✅ | 17817 ms | 01-planos-e-taxas.md, 07-embalagem-e-entrega.md | — |
| 133 | multi_turno | answered | rag → rag | ✅ | ✅ | 44201 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md, 11-pagamentos-e-fiscal.md | — |
| 134 | multi_turno | answered | rag → rag | ✅ | ✅ | 18672 ms | 06-avaliacoes-e-reputacao.md, 09-suporte-e-chamados.md, 05-horarios-pausas-e-disponibilidade.md | — |
| 135 | multi_turno | answered | rag → rag | ✅ | ✅ | 17075 ms | 03-cancelamentos-e-contestacoes.md | — |
| 136 | multi_turno | answered | rag → rag | ✅ | ✅ | 25256 ms | 05-horarios-pausas-e-disponibilidade.md, 09-suporte-e-chamados.md | — |
| 137 | fora_de_escopo | fallback | rag → rag | — | ✅ | 2351 ms | — | — |
| 138 | fora_de_escopo | fallback | rag → rag | — | ✅ | 777 ms | — | — |
| 139 | fora_de_escopo | fallback | rag → rag | — | ✅ | 1615 ms | — | — |
| 140 | fora_de_escopo | fallback | rag → rag | — | ✅ | 1554 ms | — | — |
| 141 | fora_de_escopo | fallback | rag → rag | — | ✅ | 2240 ms | — | — |
| 142 | fora_de_escopo | fallback | rag → rag | — | ✅ | 1420 ms | — | — |
| 143 | fora_de_escopo | fallback | rag → rag | — | ✅ | 3467 ms | — | — |
| 144 | adversarial | fallback | rag → rag | — | ✅ | 3405 ms | — | — |
| 145 | adversarial | fallback | rag → rag | — | ✅ | 6263 ms | — | — |
| 146 | adversarial | fallback | rag → rag | — | ✅ | 10054 ms | — | — |
| 147 | adversarial | fallback | rag → rag | — | ✅ | 644 ms | — | — |
| 148 | bloqueio | blocked_input | rag → — | — | ✅ | 1 ms | — | — |
| 149 | bloqueio | blocked_input | rag → — | — | ✅ | 0 ms | — | — |
| 150 | bloqueio | blocked_input | rag → — | — | ✅ | 0 ms | — | — |
| 151 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 193 ms | — | — |
| 152 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 188 ms | — | — |
| 153 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 195 ms | — | — |
| 154 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 185 ms | — | — |
| 155 | conversa | small_talk | conversa → conversa | — | ✅ | 1144 ms | — | — |
| 156 | conversa | small_talk | conversa → conversa | — | ✅ | 8177 ms | — | — |
| 157 | conversa | small_talk | conversa → conversa | — | ✅ | 4868 ms | — | — |
| 158 | conversa | small_talk | conversa → conversa | — | ✅ | 8751 ms | — | — |
| 159 | misto | answered | rag → rag | — | ✅ | 9601 ms | 01-planos-e-taxas.md | — |
| 160 | misto | answered | rag → rag | — | ✅ | 11574 ms | 02-repasse-financeiro.md | — |
| 161 | misto | answered | rag → rag | — | ✅ | 12279 ms | 11-pagamentos-e-fiscal.md, 01-planos-e-taxas.md, 08-promocoes-e-cupons.md | — |
| 162 | misto | answered | rag → rag | — | ✅ | 2959 ms | 03-cancelamentos-e-contestacoes.md, 09-suporte-e-chamados.md, 06-avaliacoes-e-reputacao.md | — |
| 163 | parafrase | answered | rag → rag | ✅ | ✅ | 5996 ms | 10-conta-acessos-e-seguranca.md, 09-suporte-e-chamados.md | — |
| 164 | parafrase | fallback | rag → rag | ❌ | ❌ | 11564 ms | — | geração |
| 165 | parafrase | answered | rag → rag | ✅ | ✅ | 4443 ms | 01-planos-e-taxas.md, 11-pagamentos-e-fiscal.md, 02-repasse-financeiro.md | — |
| 166 | parafrase | answered | rag → rag | ✅ | ✅ | 3628 ms | 01-planos-e-taxas.md, 08-promocoes-e-cupons.md, 02-repasse-financeiro.md | — |
| 167 | aberta | answered | rag → rag | ✅ | ✅ | 10661 ms | 04-cardapio-e-fotos.md, 07-embalagem-e-entrega.md | — |
| 168 | aberta | answered | rag → rag | ✅ | ✅ | 2686 ms | 02-repasse-financeiro.md, 11-pagamentos-e-fiscal.md, 10-conta-acessos-e-seguranca.md | — |
| 169 | aberta | answered | rag → rag | ✅ | ✅ | 8669 ms | 09-suporte-e-chamados.md | — |
| 170 | aberta | answered | rag → rag | ✅ | ✅ | 11576 ms | 10-conta-acessos-e-seguranca.md | — |
| 171 | perfil | fallback | rag → rag | ❌ | ❌ | 947 ms | — | busca |
| 172 | fora_de_escopo | fallback | rag → rag | — | ✅ | 10725 ms | — | — |
| 173 | fora_de_escopo | fallback | rag → rag | — | ✅ | 5668 ms | — | — |

## Falhas

### Pergunta 121 (parafrase)

- Pergunta: consigo fazer um cupom de 60% pra bombar a segunda-feira?
- Esperado: resposta com 50% de 08-promocoes-e-cupons.md
- Motivo: falsa recusa (status fallback)
- Causa: geração
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: consigo fazer um cupom de 60% pra bombar a segunda-feira?
- Trechos recuperados (2) [score | sem | kw]:
  - 02-repasse-financeiro.md › Exemplo de repasse da semana [0.58 | 0.64 | 0.44]
  - 08-promocoes-e-cupons.md › Exemplo de cupom coparticipado [0.56 | 0.71 | 0.22]

### Pergunta 129 (multi_doc)

- Pergunta: Chamei o entregador avulso da Rango duas vezes nesta semana. Como eu pago essas corridas?
- Esperado: resposta com R$ 8,90, repasse de 01-planos-e-taxas.md, 02-repasse-financeiro.md
- Motivo: resposta sem todos os termos de deve_conter
- Causa: geração
- Resposta: O custo das corridas do Rango Chama é descontado automaticamente do seu repasse semanal. Você não precisa pagar por boleto ou fatura separada.
- Busca: Chamei o entregador avulso da Rango duas vezes nesta semana. Como eu pago essas corridas?
- Trechos recuperados (5) [score | sem | kw]:
  - 01-planos-e-taxas.md › Rango Chama [0.70 | 0.75 | 0.60]
  - 07-embalagem-e-entrega.md › Entrega própria e entrega Rango [0.61 | 0.69 | 0.40]
  - 01-planos-e-taxas.md › Exemplo de conta de um pedido [0.60 | 0.69 | 0.40]
  - 02-repasse-financeiro.md › Descontos do repasse [0.60 | 0.68 | 0.40]
  - 11-pagamentos-e-fiscal.md › Restrições de cada forma [0.60 | 0.68 | 0.40]

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

### Pergunta 171 (perfil)

- Pergunta: Quero saber qual a diferença de preço do meu plano para o mais básico. Estou pensando em mudar
- Esperado: resposta com 139, 99 de 01-planos-e-taxas.md
- Motivo: falsa recusa (status fallback)
- Causa: busca
- Termos ausentes do contexto: 139, 99
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Quero saber qual a diferença de preço do meu plano para o mais básico. Estou pensando em mudar
- Trechos recuperados (0) [score | sem | kw]:
