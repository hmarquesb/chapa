# Spec Delta

## MODIFIED Requirements

### Requirement: Página única em PT-BR
A interface do chat SHALL ser uma página só, em `/`, aberta só com sessão válida (ver `auth`), em PT-BR (`lang="pt-BR"`), com o título "Chapa", a linha "Tire dúvidas sobre taxas, repasse, cancelamentos, cardápio e avaliações.", o menu da conta, o perfil, a conversa, a caixa de mensagem, os botões "Continuar depois" e "Nova conversa" e o rodapé "Projeto de estudo, não oficial e sem afiliação com nenhuma empresa de delivery. As conversas são apagadas depois de 7 dias sem uso. Não envie dados pessoais."

#### Scenario: Primeira visita
- **WHEN** alguém logado abre a página pela primeira vez
- **THEN** vê o título, o menu da conta, o perfil recolhido, a dica "Faça uma pergunta sobre a operação do seu restaurante ou escolha um exemplo abaixo.", as perguntas de exemplo, a caixa de mensagem e o rodapé com o aviso de não afiliação

## ADDED Requirements

### Requirement: Sessão encerrada leva à tela de entrada
Quando qualquer rota da API responde `401`, a interface SHALL levar a `/entrar`, sem mostrar o erro no chat.

#### Scenario: Demo vence com a página aberta
- **WHEN** a conta demo vence e o parceiro envia uma mensagem
- **THEN** a API responde `401` e a página vai para `/entrar`

### Requirement: Menu da conta
O chat SHALL ter um menu da conta que mostra o e-mail da conta Google, ou "Conta de demonstração" numa demo, e a opção "Sair".

#### Scenario: Conta Google
- **WHEN** uma conta Google abre o menu da conta
- **THEN** vê o e-mail dela e a opção "Sair"

#### Scenario: Conta demo
- **WHEN** uma conta demo abre o menu da conta
- **THEN** vê "Conta de demonstração" e a opção "Sair"

### Requirement: Faixa da conta de demonstração
Numa conta demo, o chat SHALL mostrar uma faixa fixa com o texto "Conta de demonstração. Ela e as conversas são apagadas em 7 dias." e, quando o Google está configurado, o botão "Entrar com Google". Numa conta Google, a faixa MUST NOT aparecer.

#### Scenario: Demo quer salvar o trabalho
- **WHEN** o visitante da demo clica em "Entrar com Google" na faixa
- **THEN** ele passa pelo login do Google e chega ao chat numa conta Google, sem as conversas da demo
