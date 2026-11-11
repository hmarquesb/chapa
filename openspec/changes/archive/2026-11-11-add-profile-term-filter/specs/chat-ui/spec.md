## ADDED Requirements

### Requirement: Erro no campo do perfil
A tela de perfil SHALL checar o nome e o tipo de cozinha com o mesmo filtro do servidor ao sair do campo e ao salvar, e mostrar a mensagem embaixo do campo recusado, ligada a ele (`aria-describedby`, `aria-invalid`), com `role="alert"`. Com um campo recusado, "Salvar" MUST NOT enviar o perfil e MUST levar o foco ao primeiro campo inválido. Um `400` da API com `field` SHALL aparecer no campo indicado.

#### Scenario: Palavrão disfarçado no nome
- **WHEN** a pessoa digita "M3rd@ Burguer" no nome e sai do campo
- **THEN** aparece "Esse nome tem um termo que não é permitido. Escolha outro." embaixo do nome, e "Salvar" não envia o perfil

#### Scenario: Corrigir o campo limpa o erro
- **WHEN** a pessoa troca o nome recusado por "Burguer do Centro"
- **THEN** a mensagem some ao sair do campo, e o perfil pode ser salvo

#### Scenario: Recusa vinda da API
- **WHEN** a API responde `400` com `field: "cuisine"`
- **THEN** a mensagem aparece embaixo do tipo de cozinha, e o que foi digitado continua nos campos
