# Spec Delta

## ADDED Requirements

### Requirement: Resumo do perfil no chat
O chat SHALL mostrar o perfil da conta como um resumo de uma linha, com o nome e o plano pelo nome oficial separados por " · " (por exemplo "Marmitaria Boa Panela · Plano Misto"), ou só o plano quando não há nome, e o link "Editar perfil", que leva a `/perfil`.

#### Scenario: Demo
- **WHEN** uma conta demo abre o chat
- **THEN** vê "Marmitaria Boa Panela · Plano Misto" e o link "Editar perfil"

#### Scenario: Sem nome
- **WHEN** o perfil da conta tem só o plano Próprio
- **THEN** o resumo é "Plano Próprio"

### Requirement: Tela de perfil
A página `/perfil` SHALL ter os campos "Nome do restaurante", "Plano na Rango" (escolha obrigatória entre "Plano Próprio", "Plano Entrega" e "Plano Misto"), "Tipo de cozinha", "Cidade" e "Horário de funcionamento", cada campo de texto com até 60 caracteres, o aviso de privacidade e o botão "Salvar". Salvo o perfil, volta ao chat, e o perfil vale a partir da próxima mensagem.

#### Scenario: Editar o plano
- **WHEN** a conta troca o plano para Entrega, salva e faz uma pergunta sobre a mensalidade
- **THEN** a resposta considera o Plano Entrega

#### Scenario: Erro ao salvar
- **WHEN** a API recusa o perfil com 400
- **THEN** a página mostra o texto do campo `error` e mantém o que foi digitado

### Requirement: Primeiro acesso pede o perfil
Uma conta sem plano salvo SHALL ser levada de `/` a `/perfil` antes do chat, com o título "Conte sobre o seu restaurante" e o botão "Salvar e começar", sem o link para voltar ao chat. Só o plano é obrigatório.

#### Scenario: Primeiro login com Google
- **WHEN** uma conta Google nova abre `/`
- **THEN** é levada a `/perfil`, e só chega ao chat depois de escolher o plano e salvar

### Requirement: Confirmar a exclusão da conta
"Excluir minha conta", no menu da conta, SHALL abrir um diálogo com o texto "Excluir sua conta? A conta, o perfil e todas as conversas são apagados na hora e não podem ser recuperados." e os botões "Excluir conta" e "Cancelar". Confirmada a exclusão, a interface MUST encerrar a sessão e ir para `/entrar`.

#### Scenario: Confirmar
- **WHEN** a pessoa clica em "Excluir conta" no diálogo
- **THEN** a conta é apagada e a página vai para `/entrar`

#### Scenario: Erro ao excluir
- **WHEN** a API responde 503 ao pedido de exclusão
- **THEN** o diálogo mostra o texto do erro, e a sessão continua

### Requirement: Página de privacidade
A página pública `/privacidade` SHALL mostrar, em linguagem simples, o aviso de privacidade, o que a conta guarda (o identificador e o e-mail do Google, o perfil do restaurante e as conversas), o que não guarda (nome e foto do Google, CNPJ, CPF, endereço, telefone, dados bancários, faturamento e o IP em claro), a tabela de retenção e como excluir a conta. O link "Privacidade" MUST aparecer na tela de entrada, no rodapé do chat e na tela de perfil.

#### Scenario: Tabela de retenção
- **WHEN** alguém abre `/privacidade`
- **THEN** vê que a conta demo e as conversas dela somem em 7 dias, a conversa de uma conta Google em 30 dias sem mensagem nova, a conta Google em 180 dias sem acesso, e qualquer conta na hora, por "Excluir minha conta"

## MODIFIED Requirements

### Requirement: Página única em PT-BR
A interface do chat SHALL ser uma página só, em `/`, aberta só com sessão válida e perfil com plano (ver `auth`), em PT-BR (`lang="pt-BR"`), com o título "Chapa", a linha "Tire dúvidas sobre taxas, repasse, cancelamentos, cardápio e avaliações.", o menu da conta, a lista de conversas, o botão "Nova conversa", o resumo do perfil, a conversa, a caixa de mensagem e o rodapé com o link "Privacidade" e o texto "Projeto de estudo, não oficial e sem afiliação com nenhuma empresa de delivery. As conversas são apagadas depois de 30 dias sem uso. Não envie dados pessoais."

#### Scenario: Textos fixos
- **WHEN** alguém logado, com o perfil salvo, abre a página
- **THEN** o subtítulo é "Tire dúvidas sobre taxas, repasse, cancelamentos, cardápio e avaliações." e o rodapé é "Projeto de estudo, não oficial e sem afiliação com nenhuma empresa de delivery. As conversas são apagadas depois de 30 dias sem uso. Não envie dados pessoais.", seguido do link "Privacidade"

#### Scenario: Primeira visita
- **WHEN** alguém logado, com o perfil salvo, abre a página pela primeira vez
- **THEN** vê o título, o menu da conta, a lista de conversas vazia, o resumo do perfil, a dica "Faça uma pergunta sobre a operação do seu restaurante ou escolha um exemplo abaixo.", as perguntas de exemplo, a caixa de mensagem e o rodapé com o aviso de não afiliação

### Requirement: Menu da conta
O chat SHALL ter um menu da conta que mostra o e-mail da conta Google, ou "Conta de demonstração" numa demo, e as opções "Editar perfil", "Sair" e "Excluir minha conta".

#### Scenario: Conta Google
- **WHEN** uma conta Google abre o menu da conta
- **THEN** vê o e-mail dela e as opções "Editar perfil", "Sair" e "Excluir minha conta"

#### Scenario: Conta demo
- **WHEN** uma conta demo abre o menu da conta
- **THEN** vê "Conta de demonstração" e as opções "Editar perfil", "Sair" e "Excluir minha conta"

## REMOVED Requirements

### Requirement: Perfil opcional do restaurante
**Reason**: O perfil sai da conversa e do navegador e vai para a conta, com o plano obrigatório e em escolha fechada.
**Migration**: Ver "Tela de perfil", "Primeiro acesso pede o perfil" e "Resumo do perfil no chat". Um perfil antigo salvo no `localStorage` é ignorado.

### Requirement: Funciona sem localStorage
**Reason**: A interface deixa de usar o `localStorage`. Nada do chat depende do armazenamento do navegador.
**Migration**: Nenhuma.
