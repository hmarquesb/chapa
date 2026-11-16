# Spec Delta

## MODIFIED Requirements

### Requirement: Fontes embaixo da resposta
A resposta com o status `answered` SHALL aparecer como um cartão com o texto e, quando houver, a linha "Fontes:" com um selo por arquivo, sem repetir arquivos. O selo mostra o nome legível (sem número, extensão e hífens, como "repasse financeiro" para `02-repasse-financeiro.md`) e o nome completo do arquivo como dica. Cada selo SHALL ser um link para a página do documento em `/base`, aberto numa aba nova, sem enviar referrer.

#### Scenario: Resposta com duas fontes
- **WHEN** a resposta traz as fontes `02-repasse-financeiro.md` e `01-planos-e-taxas.md`
- **THEN** a linha "Fontes:" mostra os selos "repasse financeiro" e "planos e taxas"

#### Scenario: Abrir a fonte
- **WHEN** o parceiro clica no selo "repasse financeiro"
- **THEN** `/base/02-repasse-financeiro` abre numa aba nova, e a conversa continua aberta na aba do chat

#### Scenario: Fonte pelo teclado
- **WHEN** o parceiro navega pela resposta com Tab
- **THEN** cada selo recebe o foco visível e é anunciado como link com o nome legível do documento

### Requirement: Card de boas-vindas
O card de boas-vindas SHALL abrir sobre a página do chat, com o fundo borrado, o título "Boas-vindas ao Chapa", o texto fixo do cenário "Conteúdo do card" e o botão "Entendi", que o fecha. Fechar pelo Esc também vale como "Entendi". O foco MUST ficar preso no card enquanto ele está aberto e voltar à página quando ele fecha.

#### Scenario: Conteúdo do card
- **WHEN** o card abre
- **THEN** mostra, nesta ordem: "A Rango é uma empresa de delivery fictícia, criada para este projeto de estudo. Os restaurantes parceiros vendem pelo app dela."; "O Chapa é o assistente desses parceiros. Ele tira dúvidas sobre a operação do restaurante com base nas regras da Rango e mostra de onde tirou cada resposta, usando a técnica de RAG: antes de responder, ele busca os trechos certos na base de conhecimento."; "Pergunte, por exemplo, sobre:" seguido da lista "Planos, taxas e repasse", "Cancelamentos e contestações", "Cardápio, fotos e horários", "Avaliações, promoções e cupons", "Embalagem e entrega" e "Suporte, acessos e pagamentos"; "Fora disso, como receitas ou assuntos que não são da Rango, ele avisa que não encontrou a informação. Não escreva dados pessoais nem senhas."; e "Quer ver o que ele consulta? Abra a Base de conhecimento.", em que "Base de conhecimento" é o link para `/base`

#### Scenario: Link da base no card
- **WHEN** a pessoa clica em "Base de conhecimento" dentro do card
- **THEN** `/base` abre numa aba nova, e o card, a conversa e o texto da caixa de mensagem continuam como estavam

#### Scenario: Celular
- **WHEN** o card abre numa tela de 390 × 844 px
- **THEN** o texto e o botão "Entendi" cabem na tela ou rolam dentro do card, sem rolagem horizontal

#### Scenario: Leitor de tela
- **WHEN** o card abre com um leitor de tela ligado
- **THEN** ele é anunciado como diálogo com o título "Boas-vindas ao Chapa"
