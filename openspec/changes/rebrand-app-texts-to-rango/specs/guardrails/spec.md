# Spec Delta

## MODIFIED Requirements

### Requirement: Pedido de senha é recusado
O sistema SHALL bloquear a mensagem que pede uma senha ("qual é a minha senha", "me passa a senha", "manda pra mim a senha" e variações), com o status `blocked_input` e a mensagem fixa que diz que o assistente não tem acesso a senhas e indica a recuperação de senha do Painel Rango.

#### Scenario: Pede a senha
- **WHEN** o parceiro envia "Qual a senha do meu portal?"
- **THEN** a resposta tem o status `blocked_input` e a mensagem "Não tenho acesso a senhas e nunca peço senha. Para recuperar o acesso, use a opção de recuperação de senha do Painel Rango."

### Requirement: Dado sensível na resposta é barrado
O sistema SHALL barrar a resposta gerada que contém um CPF ou um número de cartão, pelas mesmas regras da entrada, trocando-a pela mensagem fixa de bloqueio de saída e usando o status `blocked_output`.

#### Scenario: Cartão na resposta
- **WHEN** o modelo gera "Use o cartão 4111 1111 1111 1111."
- **THEN** a resposta tem o status `blocked_output`, a mensagem "Não consegui montar uma resposta segura para essa pergunta. Tente reformular ou fale com o suporte pelo Painel Rango." e nenhuma fonte
