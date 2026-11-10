# Spec Delta

## Purpose

Impede que dados sensíveis (CPF, número de cartão, senha) entrem ou saiam do assistente e barra respostas com sinais proibidos, bloqueando padrões e nunca palavras soltas.

## ADDED Requirements

### Requirement: Comparação sobre o texto normalizado
O sistema SHALL aplicar as regras de entrada e de saída sobre o texto normalizado: em minúsculas, sem acentos e com os espaços em sequência reduzidos a um só, sem espaços nas pontas.

#### Scenario: Maiúsculas e acentos não escapam da regra
- **WHEN** a resposta gerada contém "EU ACHO QUE VOCÊ DEVERIA mudar de plano"
- **THEN** o sistema trata o texto como se fosse "eu acho que voce deveria mudar de plano" e aplica a regra de saída

### Requirement: Mensagem vazia é bloqueada
O sistema SHALL bloquear a mensagem que fica vazia depois de normalizada, com o status `blocked_input` e a mensagem fixa "Escreva sua dúvida para eu poder ajudar."

#### Scenario: Só espaços
- **WHEN** o parceiro envia "   "
- **THEN** a resposta tem o status `blocked_input` e a mensagem "Escreva sua dúvida para eu poder ajudar."

### Requirement: Mensagem longa demais é bloqueada
O sistema SHALL bloquear a mensagem com mais de 1.000 caracteres depois de normalizada, com o status `blocked_input` e uma mensagem fixa que pede para resumir em até 1.000 caracteres.

#### Scenario: Acima do limite
- **WHEN** o parceiro envia uma mensagem de 1.001 caracteres
- **THEN** a resposta tem o status `blocked_input` e a mensagem "Sua mensagem ficou muito longa. Resuma em até 1.000 caracteres."

#### Scenario: No limite
- **WHEN** o parceiro envia uma mensagem de exatamente 1.000 caracteres sem dado sensível
- **THEN** a mensagem passa pelo guardrail de entrada

### Requirement: CPF na entrada é bloqueado
O sistema SHALL bloquear a mensagem que contém um CPF, com 11 dígitos seguidos ou no formato `000.000.000-00` (pontos e hífen opcionais), com o status `blocked_input` e a mensagem fixa que pede para não enviar CPF, cartão ou senha.

#### Scenario: CPF com pontuação
- **WHEN** o parceiro envia "Meu CPF é 123.456.789-09, pode verificar?"
- **THEN** a resposta tem o status `blocked_input` e a mensagem "Por segurança, não envie CPF, número de cartão ou senha por aqui. Reescreva a pergunta sem esses dados."

#### Scenario: CPF sem pontuação
- **WHEN** o parceiro envia "cpf 12345678909 ok"
- **THEN** a resposta tem o status `blocked_input`

### Requirement: Número de cartão na entrada é bloqueado
O sistema SHALL bloquear a mensagem que contém uma sequência de 13 a 19 dígitos, separados ou não por um espaço ou hífen entre eles, que passa na verificação de Luhn, com o status `blocked_input` e a mesma mensagem fixa do CPF.

#### Scenario: Cartão válido com espaços
- **WHEN** o parceiro envia "4111 1111 1111 1111"
- **THEN** a resposta tem o status `blocked_input`

#### Scenario: Sequência que falha no Luhn passa
- **WHEN** o parceiro envia "4111 1111 1111 1112"
- **THEN** a mensagem não é bloqueada como cartão

#### Scenario: Telefone, data e valor passam
- **WHEN** o parceiro envia "Ligue 11 98765-4321 até 05/11/2026, valor R$ 1.234,56"
- **THEN** a mensagem não é bloqueada como cartão

### Requirement: Senha informada na entrada é bloqueada
O sistema SHALL bloquear a mensagem em que o parceiro informa a senha ("minha senha é" seguido de algum texto, com ou sem dois-pontos), com o status `blocked_input` e a mesma mensagem fixa do CPF.

#### Scenario: Senha informada
- **WHEN** o parceiro envia "Minha senha e: abc123"
- **THEN** a resposta tem o status `blocked_input` e a mensagem que pede para não enviar CPF, cartão ou senha

### Requirement: Pedido de senha é recusado
O sistema SHALL bloquear a mensagem que pede uma senha ("qual é a minha senha", "me passa a senha", "manda pra mim a senha" e variações), com o status `blocked_input` e a mensagem fixa que diz que o assistente não tem acesso a senhas e indica a recuperação de senha do Portal do Parceiro.

#### Scenario: Pede a senha
- **WHEN** o parceiro envia "Qual a senha do meu portal?"
- **THEN** a resposta tem o status `blocked_input` e a mensagem "Não tenho acesso a senhas e nunca peço senha. Para recuperar o acesso, use a opção de recuperação de senha do Portal do Parceiro."

### Requirement: Palavras soltas não bloqueiam
O sistema MUST NOT bloquear uma mensagem só por conter palavras como "CPF", "CNPJ", "Pix", "cartão" ou "senha" fora dos padrões acima.

#### Scenario: Perguntas legítimas passam
- **WHEN** o parceiro envia qualquer uma destas mensagens: "O repasse cai via Pix?", "Posso pagar com cartão?", "Onde vejo meu CPF cadastrado?", "Esqueci a senha do portal, como recupero?", "Como troco a senha do Wi-Fi da loja?", "Paguei 1234 de comissão este mês?"
- **THEN** nenhuma delas é bloqueada pelo guardrail de entrada

### Requirement: Entrada bloqueada não sai do servidor nem é gravada
Quando o guardrail de entrada bloqueia a mensagem, o sistema SHALL responder sem chamar o provedor de LLM, sem consultar nem alterar a sessão e sem gravar a mensagem, e a resposta MUST ter a lista de fontes vazia.

#### Scenario: CPF não chega ao banco nem ao LLM
- **WHEN** o parceiro envia uma mensagem com CPF
- **THEN** nenhuma chamada ao provedor de LLM é feita, nenhuma mensagem é gravada e a sessão não é criada nem atualizada

### Requirement: Dado sensível na resposta é barrado
O sistema SHALL barrar a resposta gerada que contém um CPF ou um número de cartão, pelas mesmas regras da entrada, trocando-a pela mensagem fixa de bloqueio de saída e usando o status `blocked_output`.

#### Scenario: Cartão na resposta
- **WHEN** o modelo gera "Use o cartão 4111 1111 1111 1111."
- **THEN** a resposta tem o status `blocked_output`, a mensagem "Não consegui montar uma resposta segura para essa pergunta. Tente reformular ou fale com o suporte pelo Portal do Parceiro." e nenhuma fonte

### Requirement: Sinais proibidos na resposta são barrados
O sistema SHALL barrar com o status `blocked_output` a resposta que contém um dos sinais proibidos: conselho pessoal ("eu acho que você deveria", "o meu conselho para você é"), autorreferência ("como modelo de linguagem") ou pedido de senha ("informe sua senha", "me envie sua senha", "digite sua senha aqui").

#### Scenario: Conselho pessoal
- **WHEN** o modelo gera "Olá. Eu acho que você deveria trocar de plano."
- **THEN** a resposta tem o status `blocked_output` e a mensagem fixa de bloqueio de saída

#### Scenario: Resposta normal passa
- **WHEN** o modelo gera "Você deve fazer a contestação pelo portal em até 7 dias."
- **THEN** a resposta não é barrada

### Requirement: Saída barrada é gravada no lugar da resposta
Quando a resposta é barrada, o sistema SHALL gravar no histórico a pergunta do parceiro e a mensagem fixa de bloqueio de saída, nunca o texto que o modelo gerou.

#### Scenario: Texto barrado não fica no histórico
- **WHEN** a resposta gerada é barrada pelo guardrail de saída
- **THEN** o histórico da sessão mostra a mensagem fixa de bloqueio de saída com o status `blocked_output`, e o texto gerado não é gravado nem devolvido
