# Spec Delta

## ADDED Requirements

### Requirement: Conversa criada na primeira mensagem
O sistema SHALL criar a conversa na primeira mensagem que passa pelo guardrail de entrada, com o canal de origem (`web`, `cli` ou `eval`), que não muda depois. Uma conversa `web` MUST pertencer à conta logada e ter o id gerado pelo servidor. Conversas `cli` e `eval` não têm conta e usam o id que o script informa.

#### Scenario: Primeira mensagem pela web
- **WHEN** uma conta logada envia a primeira mensagem válida sem id de conversa
- **THEN** o servidor cria uma conversa `web` dessa conta, com um id novo

#### Scenario: Primeira mensagem bloqueada
- **WHEN** a primeira mensagem de uma conversa nova traz um CPF
- **THEN** nenhuma conversa é criada

#### Scenario: CLI sem conta
- **WHEN** o `npm run chat` envia a primeira mensagem com um id novo
- **THEN** a conversa é criada com o canal `cli` e sem conta

### Requirement: Continuar uma conversa do mesmo dono
Uma mensagem com o id de uma conversa existente SHALL continuar a conversa, com o histórico, o resumo e o perfil dela, só quando o dono é o mesmo: a mesma conta, na web, ou nenhuma conta, no CLI e no eval. Com outro dono, a conversa MUST ser tratada como inexistente, sem ler nem gravar nada nela.

#### Scenario: Conta continua a própria conversa
- **WHEN** a conta A envia uma mensagem com o id de uma conversa dela que já tem mensagens
- **THEN** o assistente usa o histórico e o resumo dessa conversa para responder

#### Scenario: Conta tenta continuar a conversa de outra
- **WHEN** a conta A envia uma mensagem com o id de uma conversa da conta B
- **THEN** a conversa de B não muda, e a mensagem é recusada como se a conversa não existisse

#### Scenario: CLI tenta abrir uma conversa da web
- **WHEN** o `npm run chat -- --sessao <id>` recebe o id de uma conversa `web`
- **THEN** o CLI trata o id como uma conversa que não existe

### Requirement: Expiração das conversas
O sistema SHALL apagar, junto com todas as mensagens, as conversas `web` sem mensagem nova há mais de 30 dias e as conversas `cli` e `eval` sem mensagem nova há mais de 7 dias. Apagar uma conta MUST apagar as conversas dela. Ler o histórico ou a lista MUST NOT contar como atividade.

#### Scenario: Conversa web parada há 31 dias
- **WHEN** a limpeza diária roda e uma conversa `web` está sem mensagem nova há 31 dias
- **THEN** a conversa e as mensagens dela são apagadas

#### Scenario: Conversa web parada há 8 dias
- **WHEN** a limpeza diária roda e uma conversa `web` está sem mensagem nova há 8 dias
- **THEN** a conversa continua

#### Scenario: Conversa do eval parada há 8 dias
- **WHEN** a limpeza diária roda e uma conversa `eval` está sem atividade há 8 dias
- **THEN** a conversa e as mensagens dela são apagadas

#### Scenario: Só leitura não renova
- **WHEN** alguém abre uma conversa parada há 29 dias, lê o histórico e não envia mensagem
- **THEN** a última atividade da conversa não muda

## REMOVED Requirements

### Requirement: Sessão anônima identificada por UUID
**Reason**: A conversa web deixa de ser anônima e de ter o id gerado pelo cliente. Ela pertence a uma conta e tem o id gerado pelo servidor.
**Migration**: Ver "Conversa criada na primeira mensagem". O CLI e o eval continuam informando o id.

### Requirement: Retomar a conversa pelo identificador
**Reason**: O identificador deixa de funcionar como credencial. Só o dono continua a conversa.
**Migration**: Ver "Continuar uma conversa do mesmo dono". Na web, a conversa antiga é aberta pela lista de conversas da conta.

### Requirement: Expiração depois de 7 dias sem atividade
**Reason**: A retenção da conversa web passa a ser de 30 dias, e a das conversas do CLI e do eval continua em 7.
**Migration**: Ver "Expiração das conversas".
