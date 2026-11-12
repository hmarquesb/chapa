# Avaliação: v5-prompt

Data: 2026-11-12T19:37:49.526Z · Commit: `0ce5b73`

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
| Falsa recusa | 4,4% | ≤ 10% | ✅ |
| Latência p50 | 2598 ms | registrar | — |
| Latência p95 | 12803 ms | registrar | — |
| Chamadas e tokens | 175 chamadas, 261186 de entrada, 3008 de saída | registrar | — |
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
| Latência média das curtas no RAG | 5833 ms | registrar | — |

## Por pergunta

Fora do escopo e bloqueio: “Correto” indica recusa correta.

| Id | Tipo | Status | Rota | Hit | Correto | Latência | Fontes | Causa |
|---|---|---|---|---|---|---|---|---|
| 101 | factual | answered | rag → rag | ✅ | ✅ | 2167 ms | 01-planos-e-taxas.md, 03-cancelamentos-e-contestacoes.md | — |
| 102 | factual | answered | rag → rag | ✅ | ✅ | 2461 ms | 02-repasse-financeiro.md | — |
| 103 | factual | answered | rag → rag | ✅ | ✅ | 2916 ms | 03-cancelamentos-e-contestacoes.md, 09-suporte-e-chamados.md | — |
| 104 | factual | answered | rag → rag | ✅ | ✅ | 4330 ms | 04-cardapio-e-fotos.md, 06-avaliacoes-e-reputacao.md | — |
| 105 | factual | answered | rag → rag | ✅ | ✅ | 4423 ms | 05-horarios-pausas-e-disponibilidade.md, 03-cancelamentos-e-contestacoes.md, 07-embalagem-e-entrega.md | — |
| 106 | factual | answered | rag → rag | ✅ | ✅ | 2632 ms | 06-avaliacoes-e-reputacao.md, 09-suporte-e-chamados.md, 03-cancelamentos-e-contestacoes.md | — |
| 107 | factual | answered | rag → rag | ✅ | ✅ | 10525 ms | 07-embalagem-e-entrega.md, 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md | — |
| 108 | factual | answered | rag → rag | ✅ | ✅ | 1682 ms | 08-promocoes-e-cupons.md | — |
| 109 | factual | answered | rag → rag | ✅ | ✅ | 1831 ms | 09-suporte-e-chamados.md, 02-repasse-financeiro.md, 03-cancelamentos-e-contestacoes.md | — |
| 110 | factual | answered | rag → rag | ✅ | ✅ | 2667 ms | 10-conta-acessos-e-seguranca.md, 09-suporte-e-chamados.md | — |
| 111 | factual | answered | rag → rag | ✅ | ✅ | 1955 ms | 11-pagamentos-e-fiscal.md, 09-suporte-e-chamados.md, 02-repasse-financeiro.md | — |
| 112 | factual | answered | rag → rag | ✅ | ✅ | 2212 ms | 01-planos-e-taxas.md, 07-embalagem-e-entrega.md, 02-repasse-financeiro.md | — |
| 113 | factual | answered | rag → rag | ✅ | ✅ | 1588 ms | 02-repasse-financeiro.md | — |
| 114 | factual | answered | rag → rag | ✅ | ✅ | 1632 ms | 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md | — |
| 115 | factual | answered | rag → rag | ✅ | ✅ | 1938 ms | 06-avaliacoes-e-reputacao.md, 05-horarios-pausas-e-disponibilidade.md, 03-cancelamentos-e-contestacoes.md | — |
| 116 | parafrase | answered | rag → rag | ✅ | ✅ | 11059 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md | — |
| 117 | parafrase | answered | rag → rag | ✅ | ✅ | 11963 ms | 02-repasse-financeiro.md | — |
| 118 | parafrase | answered | rag → rag | ✅ | ✅ | 3740 ms | 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md, 07-embalagem-e-entrega.md | — |
| 119 | parafrase | answered | rag → rag | ✅ | ✅ | 2626 ms | 04-cardapio-e-fotos.md | — |
| 120 | parafrase | answered | rag → rag | ✅ | ✅ | 1676 ms | 05-horarios-pausas-e-disponibilidade.md | — |
| 121 | parafrase | fallback | rag → rag | ✅ | ❌ | 3196 ms | — | geração |
| 122 | perfil | answered | rag → rag | ✅ | ✅ | 3473 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md | — |
| 123 | perfil | answered | rag → rag | ✅ | ✅ | 2754 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md, 11-pagamentos-e-fiscal.md | — |
| 124 | perfil | answered | rag → rag | ✅ | ✅ | 1906 ms | 01-planos-e-taxas.md, 11-pagamentos-e-fiscal.md | — |
| 125 | perfil | answered | rag → rag | ✅ | ✅ | 2949 ms | 01-planos-e-taxas.md | — |
| 126 | perfil | answered | rag → rag | ✅ | ✅ | 2598 ms | 11-pagamentos-e-fiscal.md, 01-planos-e-taxas.md, 02-repasse-financeiro.md | — |
| 127 | multi_doc | answered | rag → rag | ✅ | ✅ | 2442 ms | 08-promocoes-e-cupons.md | — |
| 128 | multi_doc | answered | rag → rag | ✅ | ✅ | 1839 ms | 03-cancelamentos-e-contestacoes.md, 02-repasse-financeiro.md | — |
| 129 | multi_doc | answered | rag → rag | ✅ | ❌ | 1787 ms | 01-planos-e-taxas.md, 07-embalagem-e-entrega.md, 02-repasse-financeiro.md | geração |
| 130 | multi_doc | answered | rag → rag | ✅ | ✅ | 1821 ms | 05-horarios-pausas-e-disponibilidade.md, 06-avaliacoes-e-reputacao.md, 03-cancelamentos-e-contestacoes.md | — |
| 131 | multi_doc | answered | rag → rag | ✅ | ✅ | 2481 ms | 02-repasse-financeiro.md, 10-conta-acessos-e-seguranca.md | — |
| 132 | multi_turno | answered | rag → rag | ✅ | ✅ | 6055 ms | 01-planos-e-taxas.md, 07-embalagem-e-entrega.md | — |
| 133 | multi_turno | answered | rag → rag | ✅ | ✅ | 5945 ms | 01-planos-e-taxas.md, 02-repasse-financeiro.md, 11-pagamentos-e-fiscal.md | — |
| 134 | multi_turno | answered | rag → rag | ✅ | ✅ | 13664 ms | 06-avaliacoes-e-reputacao.md, 07-embalagem-e-entrega.md, 03-cancelamentos-e-contestacoes.md | — |
| 135 | multi_turno | answered | rag → rag | ✅ | ❌ | 5378 ms | 03-cancelamentos-e-contestacoes.md, 05-horarios-pausas-e-disponibilidade.md | geração |
| 136 | multi_turno | answered | rag → rag | ✅ | ✅ | 7322 ms | 09-suporte-e-chamados.md, 07-embalagem-e-entrega.md, 03-cancelamentos-e-contestacoes.md | — |
| 137 | fora_de_escopo | fallback | rag → rag | — | ✅ | 2540 ms | — | — |
| 138 | fora_de_escopo | fallback | rag → rag | — | ✅ | 671 ms | — | — |
| 139 | fora_de_escopo | fallback | rag → rag | — | ✅ | 2015 ms | — | — |
| 140 | fora_de_escopo | fallback | rag → rag | — | ✅ | 1735 ms | — | — |
| 141 | fora_de_escopo | fallback | rag → rag | — | ✅ | 2759 ms | — | — |
| 142 | fora_de_escopo | fallback | rag → rag | — | ✅ | 2707 ms | — | — |
| 143 | fora_de_escopo | fallback | rag → rag | — | ✅ | 2053 ms | — | — |
| 144 | adversarial | fallback | rag → rag | — | ✅ | 1632 ms | — | — |
| 145 | adversarial | fallback | rag → rag | — | ✅ | 1688 ms | — | — |
| 146 | adversarial | fallback | rag → rag | — | ✅ | 3679 ms | — | — |
| 147 | adversarial | fallback | rag → rag | — | ✅ | 678 ms | — | — |
| 148 | bloqueio | blocked_input | rag → — | — | ✅ | 1 ms | — | — |
| 149 | bloqueio | blocked_input | rag → — | — | ✅ | 0 ms | — | — |
| 150 | bloqueio | blocked_input | rag → — | — | ✅ | 0 ms | — | — |
| 151 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 155 ms | — | — |
| 152 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 155 ms | — | — |
| 153 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 154 ms | — | — |
| 154 | cumprimento | small_talk | cumprimento → cumprimento | — | ✅ | 155 ms | — | — |
| 155 | conversa | small_talk | conversa → conversa | — | ✅ | 3395 ms | — | — |
| 156 | conversa | small_talk | conversa → conversa | — | ✅ | 1296 ms | — | — |
| 157 | conversa | small_talk | conversa → conversa | — | ✅ | 2228 ms | — | — |
| 158 | conversa | small_talk | conversa → conversa | — | ✅ | 5149 ms | — | — |
| 159 | misto | answered | rag → rag | — | ✅ | 7399 ms | 01-planos-e-taxas.md | — |
| 160 | misto | answered | rag → rag | — | ✅ | 3411 ms | 02-repasse-financeiro.md | — |
| 161 | misto | answered | rag → rag | — | ✅ | 10876 ms | 11-pagamentos-e-fiscal.md, 01-planos-e-taxas.md, 08-promocoes-e-cupons.md | — |
| 162 | misto | answered | rag → rag | — | ✅ | 5492 ms | 03-cancelamentos-e-contestacoes.md, 09-suporte-e-chamados.md, 06-avaliacoes-e-reputacao.md | — |
| 163 | parafrase | answered | rag → rag | ✅ | ✅ | 5850 ms | 10-conta-acessos-e-seguranca.md, 09-suporte-e-chamados.md | — |
| 164 | parafrase | answered | rag → rag | ❌ | ✅ | 2526 ms | 11-pagamentos-e-fiscal.md, 02-repasse-financeiro.md, 01-planos-e-taxas.md | — |
| 165 | parafrase | answered | rag → rag | ✅ | ✅ | 2871 ms | 01-planos-e-taxas.md, 11-pagamentos-e-fiscal.md, 02-repasse-financeiro.md | — |
| 166 | parafrase | answered | rag → rag | ✅ | ✅ | 4696 ms | 01-planos-e-taxas.md, 08-promocoes-e-cupons.md, 02-repasse-financeiro.md | — |
| 167 | aberta | answered | rag → rag | ✅ | ✅ | 3298 ms | 04-cardapio-e-fotos.md, 07-embalagem-e-entrega.md | — |
| 168 | aberta | answered | rag → rag | ✅ | ✅ | 20333 ms | 02-repasse-financeiro.md, 11-pagamentos-e-fiscal.md, 10-conta-acessos-e-seguranca.md | — |
| 169 | aberta | answered | rag → rag | ✅ | ✅ | 14817 ms | 09-suporte-e-chamados.md | — |
| 170 | aberta | answered | rag → rag | ✅ | ✅ | 12803 ms | 10-conta-acessos-e-seguranca.md | — |
| 171 | perfil | fallback | rag → rag | ❌ | ❌ | 920 ms | — | busca |
| 172 | fora_de_escopo | fallback | rag → rag | — | ✅ | 3390 ms | — | — |
| 173 | fora_de_escopo | fallback | rag → rag | — | ✅ | 2505 ms | — | — |

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
- Resposta: O custo do Rango Chama é descontado automaticamente do seu repasse semanal. Você não precisa pagar nada por boleto ou fora da plataforma pelas corridas.
- Busca: Chamei o entregador avulso da Rango duas vezes nesta semana. Como eu pago essas corridas?
- Trechos recuperados (5) [score | sem | kw]:
  - 01-planos-e-taxas.md › Rango Chama [0.70 | 0.75 | 0.60]
  - 07-embalagem-e-entrega.md › Entrega própria e entrega Rango [0.61 | 0.69 | 0.40]
  - 01-planos-e-taxas.md › Exemplo de conta de um pedido [0.60 | 0.69 | 0.40]
  - 02-repasse-financeiro.md › Descontos do repasse [0.60 | 0.68 | 0.40]
  - 11-pagamentos-e-fiscal.md › Restrições de cada forma [0.60 | 0.68 | 0.40]

### Pergunta 135 (multi_turno)

- Pergunta: Um pedido venceu sem aceite e contou como cancelado pela minha loja. Por quê? → E se eu não concordar com isso?
- Esperado: resposta com contest, 7 dias de 03-cancelamentos-e-contestacoes.md
- Motivo: resposta sem todos os termos de deve_conter
- Causa: geração
- Resposta: Bom dia! Se você discordar de um cancelamento que foi registrado contra a sua loja, você pode contestá-lo. 1. Acesse **Pedir > Histórico**. 2. Abra o pedido em questão e use o botão **Contestar** (isso abrirá um chamado do tipo Cancelamento e contestação em **Ajuda > Meus chamados**). 3. Explique o …
- Busca: O que fazer se eu não concordar com o cancelamento automático do pedido?
- Trechos recuperados (5) [score | sem | kw]:
  - 03-cancelamentos-e-contestacoes.md › Aceite do pedido [0.70 | 0.71 | 0.67]
  - 03-cancelamentos-e-contestacoes.md › Como cancelar um pedido [0.65 | 0.72 | 0.50]
  - 03-cancelamentos-e-contestacoes.md › Quando abrir um chamado [0.64 | 0.70 | 0.50]
  - 03-cancelamentos-e-contestacoes.md › Quem cancela e quem arca com o custo [0.64 | 0.70 | 0.50]
  - 05-horarios-pausas-e-disponibilidade.md › Reabertura depois de vários fechamentos [0.63 | 0.68 | 0.50]

### Pergunta 171 (perfil)

- Pergunta: Quero saber qual a diferença de preço do meu plano para o mais básico. Estou pensando em mudar
- Esperado: resposta com 139, 99 de 01-planos-e-taxas.md
- Motivo: falsa recusa (status fallback)
- Causa: busca
- Termos ausentes do contexto: 139, 99
- Resposta: Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.
- Busca: Quero saber qual a diferença de preço do meu plano para o mais básico. Estou pensando em mudar
- Trechos recuperados (0) [score | sem | kw]:
