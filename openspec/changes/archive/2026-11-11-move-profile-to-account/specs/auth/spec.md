# Spec Delta

## ADDED Requirements

### Requirement: Conta demo com perfil de exemplo
Toda conta demo SHALL nascer com o mesmo perfil fictício: nome "Marmitaria Boa Panela", plano Misto, cozinha "Brasileira caseira", cidade "Rio de Janeiro" e horário "11h às 15h e 18h às 23h". O visitante MAY editar o perfil da própria demo, e a edição não muda o perfil das outras demos.

#### Scenario: Demo nova
- **WHEN** o visitante clica em "Testar como demo"
- **THEN** o chat mostra o resumo "Marmitaria Boa Panela · Plano Misto" sem passar pela tela de perfil

#### Scenario: Demo troca o plano
- **WHEN** o visitante troca o plano da demo para Próprio
- **THEN** a próxima demo criada continua com o plano Misto

### Requirement: Excluir a conta
"Excluir minha conta" SHALL apagar, na hora, a conta, o perfil e todas as conversas e mensagens dela, encerrar a sessão e levar a `/entrar`. Depois disso, o cookie antigo MUST ser tratado como sem sessão.

#### Scenario: Exclusão de uma conta Google
- **WHEN** uma conta Google com duas conversas confirma "Excluir minha conta"
- **THEN** a conta e as duas conversas somem do banco, a pessoa chega a `/entrar`, e um novo login com o mesmo Google cria uma conta vazia, que pede o perfil

## MODIFIED Requirements

### Requirement: Login obrigatório na web
Toda página do chat SHALL exigir uma sessão válida. Sem ela, a página MUST levar a `/entrar`. A tela de entrada e a página de privacidade são públicas. O CLI e a avaliação não passam pelo login.

#### Scenario: Visitante sem sessão
- **WHEN** alguém sem sessão abre `/`
- **THEN** é levado a `/entrar`

#### Scenario: Já logado abre a entrada
- **WHEN** alguém com sessão válida abre `/entrar`
- **THEN** é levado a `/`

#### Scenario: Privacidade sem login
- **WHEN** alguém sem sessão abre `/privacidade`
- **THEN** vê a página de privacidade

### Requirement: Tela de entrada
A página `/entrar` SHALL mostrar o título "Chapa", a linha "Assistente de parceiros da Rango", a frase "Tire dúvidas sobre taxas, repasse, cancelamentos, cardápio e avaliações.", o botão "Testar como demo" em destaque, o botão "Entrar com Google" (quando o Google está configurado), o aviso de privacidade e o link "Privacidade", em PT-BR e sem marca de empresa real.

#### Scenario: Primeira visita
- **WHEN** um visitante abre `/entrar`
- **THEN** vê o título, a frase, o botão "Testar como demo" como ação principal, o link "Privacidade" e o aviso: "Projeto de estudo. A Rango é uma empresa fictícia. As mensagens são processadas pelo Google Gemini, que pode usar o conteúdo para melhorar os serviços dele. Não escreva dados pessoais, senhas nem informações reais do seu negócio."
