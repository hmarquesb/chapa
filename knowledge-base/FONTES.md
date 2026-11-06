# Fontes da base de conhecimento

Este arquivo não é ingerido pelo RAG. Ele registra as páginas públicas consultadas para escrever os documentos de `knowledge-base/` e o que essas páginas **não** respondem. Todas as fontes são artigos do blog oficial para parceiros da plataforma de delivery usada como referência. O conteúdo foi reescrito com palavras próprias, para fins de estudo, sem afiliação com a empresa.

Nos documentos, cada página é citada por um nome neutro (coluna "Nome usado no texto"), para que o nome da empresa não apareça no corpo.

## Tabela de fontes

| Arquivo | URLs | Data de consulta | Nome usado no texto | Lacunas (não encontrado nas fontes oficiais) |
|---|---|---|---|---|
| `01-planos-e-taxas.md` | https://blog-parceiros.ifood.com.br/planos-ifood/ ; https://blog-parceiros.ifood.com.br/taxas-ifood/ ; https://blog-parceiros.ifood.com.br/area-de-entrega/ ; https://blog-parceiros.ifood.com.br/taxa-de-entrega-flexivel/ | 05/11/2026 (planos e taxas); 06/11/2026 (as quatro, para a taxa de entrega e a entrega grátis) | página de planos; página de taxas; página de área de entrega; página de taxa de entrega flexível | Comissão de pedidos de retirada no balcão (a página de taxas só fala da taxa de serviço nesse caso). Preço do serviço de entregador avulso (Sob Demanda). Taxa de pagamento online do Plano Entrega Flex (a página de planos diz que é igual; a página de taxas não cita o Flex). Prazo para a troca de plano começar a valer. Quem fica com o valor da taxa de entrega em cada plano e como ela é calculada no Plano Entrega. Quem arca com o custo de uma campanha de entrega grátis. |
| `02-repasse-financeiro.md` | https://blog-parceiros.ifood.com.br/repasse-ifood/ ; https://blog-parceiros.ifood.com.br/ciclo-de-repasses-ifood/ ; https://blog-parceiros.ifood.com.br/painel-financeiro/ | 05/11/2026 | página do calendário de repasse; página do ciclo de repasse; (painel financeiro, sem números citados) | Valor atual da taxa do repasse semanal e das antecipações (as fontes dizem só que a taxa varia e aparece no Portal do Parceiro). Regra de pagamento quando a quarta-feira é feriado bancário (a fonte diz que não há regra fixa divulgada). Quais tributos são retidos na fonte e em que percentual. |
| `03-cancelamentos-e-contestacoes.md` | https://blog-parceiros.ifood.com.br/politica-cancelamento-pedidos/ ; https://blog-parceiros.ifood.com.br/contestacao-cancelamento/ | 05/11/2026 | página da política de cancelamento; página de contestação de cancelamento | Quanto tempo a loja tem para confirmar um pedido antes do cancelamento automático. Prazo para o cliente responder no acordo de preparo. Lista completa dos casos com reembolso automático à loja. Quanto da taxa de cancelamento derruba a posição nas buscas. |
| `04-cardapio-e-fotos.md` | https://blog-parceiros.ifood.com.br/novo-cardapio-ifood/ ; https://blog-parceiros.ifood.com.br/cardapio-ifood/ ; https://blog-parceiros.ifood.com.br/como-tirar-foto-de-comida-para-delivery/ | 05/11/2026 | página do novo cardápio; página de dicas de cardápio; página de fotos para delivery | Se o preço no app pode ser diferente do preço no salão. Limite de itens, categorias ou complementos por cardápio. Prazo para uma foto nova aparecer no app (se há moderação de fotos). |
| `05-horarios-pausas-e-disponibilidade.md` | https://blog-parceiros.ifood.com.br/horario-de-funcionamento/ ; https://blog-parceiros.ifood.com.br/pausa-programada/ ; https://blog-parceiros.ifood.com.br/loja-fechada-ifood/ | 05/11/2026 | página de horário de funcionamento; página de pausa programada; página de loja fechada | Quantos pedidos ignorados ou cancelamentos seguidos ("muitos") disparam o fechamento preventivo. Duração máxima de uma pausa programada. Quanto a disponibilidade pesa exatamente no ranking. |
| `06-avaliacoes-e-reputacao.md` | https://blog-parceiros.ifood.com.br/avaliacoes-e-moderacoes/ ; https://blog-parceiros.ifood.com.br/como-responder-avaliacao-no-ifood/ ; https://blog-parceiros.ifood.com.br/como-tratar-avaliacao-negativa-no-ifood/ | 05/11/2026 | página de avaliações e moderações | Peso exato da nota no algoritmo de recomendação. Critérios e números atuais do programa de reconhecimento de restaurantes. Como pedir moderação manual de uma avaliação que passou pelo filtro automático. |
| `07-embalagem-e-entrega.md` | https://blog-parceiros.ifood.com.br/embalagem-delivery/ ; https://blog-parceiros.ifood.com.br/tempo-de-preparo/ ; https://blog-parceiros.ifood.com.br/como-tratar-avaliacao-negativa-no-ifood/ | 05/11/2026 | (sem números citados) | Regra da plataforma sobre lacre obrigatório (a fonte só recomenda vedação para líquidos). Tempo de preparo mínimo ou máximo permitido. Regras para bebidas alcoólicas e itens frágeis na entrega. |

## Conflitos e pontos de atenção para a revisão (H3)

- **Prazo para responder avaliações:** a página de avaliações e moderações (atualizada em 16/07/2026) e a página sobre como responder avaliações dizem 5 dias; a página sobre avaliação negativa (08/06/2026) e uma página mais antiga sobre avaliações dizem 7 dias. O documento `06` usa 5 dias, da página mais recente.
- **Fechamento preventivo:** a página de loja fechada lista fechamentos com duração fixa (5 minutos e 1 hora), mas o FAQ da mesma página diz que a loja não reabre sozinha. O documento `05` diz "em geral" para não afirmar uma regra única.
- **Taxa do repasse semanal:** uma página de 2022 traz percentuais antigos para o repasse semanal. Eles não foram usados por estarem desatualizados.
- **Lacre:** a afirmação de que algumas cidades e estados têm regras próprias de lacre vem de legislação pública encontrada na busca, não do blog oficial. Ela não traz número nem nome de lei. A frase de que o lacre "mostra que o pedido não foi aberto" é a definição comum de lacre, não um trecho da fonte.
- **Taxa de entrega:** a página de área de entrega (atualizada em 07/07/2025) diz que a taxa não pode passar de R$ 50,00 e que dá para salvar até 5 combinações de taxa e tempo; essas regras vêm da seção de novidades da tela de áreas, taxas e tempos, para o modelo em que a loja entrega e para o Plano Entrega Flex. A página de taxa de entrega flexível cita uma faixa de R$ 5,99 a R$ 12,99 sem deixar claro se é a taxa vista pelo cliente ou o valor coberto pela campanha, por isso a faixa não foi usada. O raio máximo da área atendida pela rede parceira também diverge (até 10 km na página de planos, até 20 km na de área de entrega) e ficou de fora.
- **Nomes de planos e telas:** Plano Básico, Plano Entrega, Plano Entrega Flex, Portal do Parceiro, Gestor de Pedidos, App do Parceiro, Painel Financeiro, Central de Crescimento, Farol da Operação e Fechamentos Preventivos são os nomes usados nas próprias fontes.

## Perguntas que a base não responde

Perguntas plausíveis de restaurante parceiro que caem nas lacunas acima. A avaliação (S08) pode usá-las como casos de fallback.

1. Qual é a taxa cobrada para eu receber o repasse toda semana?
2. Se a quarta-feira do repasse cair num feriado, em que dia o dinheiro entra?
3. Quantos minutos eu tenho para aceitar um pedido antes de ele ser cancelado automaticamente?
4. A comissão é diferente para pedidos de retirada no balcão?
5. Quantos cancelamentos seguidos fazem a plataforma fechar a minha loja?
6. Quanto custa chamar um entregador avulso quando a minha equipe não dá conta?
7. Qual é o tempo de preparo máximo que eu posso configurar?
8. Na minha cidade o lacre na embalagem de delivery é obrigatório?
9. Posso cobrar no app um preço diferente do preço do salão?
10. Quem paga a entrega grátis quando eu crio uma campanha?
