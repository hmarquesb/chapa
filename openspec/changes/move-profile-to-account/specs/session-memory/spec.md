# Spec Delta

## MODIFIED Requirements

### Requirement: Perfil do restaurante por sessão
No CLI e no eval, quando a mensagem traz um perfil, o sistema SHALL substituir o perfil da sessão por ele, com os valores aparados, os campos vazios descartados e o plano só se for `proprio`, `entrega` ou `misto`. Sem perfil, MUST usar o salvo na sessão. Na web, o perfil vem sempre da conta, lido a cada mensagem, e MUST NOT ser gravado na conversa.

#### Scenario: Perfil enviado com espaços
- **WHEN** uma mensagem do CLI traz o perfil `{ "name": "  Pizzaria Bella ", "city": "" }`
- **THEN** a sessão passa a ter o perfil `{ "name": "Pizzaria Bella" }`, que também vai para a instrução de sistema

#### Scenario: Perfil vazio apaga o salvo
- **WHEN** uma mensagem do CLI ou do eval traz `profile: {}` (ou só campos vazios) e a sessão tem um perfil salvo
- **THEN** o perfil da sessão passa a ser vazio

#### Scenario: Perfil omitido
- **WHEN** uma mensagem do CLI não traz perfil e a sessão tem um perfil salvo
- **THEN** a resposta usa o perfil salvo e o perfil da sessão não muda

#### Scenario: Perfil da conta na web
- **WHEN** uma conta com o plano Misto envia uma mensagem e depois troca o plano para Próprio
- **THEN** a mensagem seguinte, em qualquer conversa da conta, usa o Plano Próprio, e o perfil gravado na conversa continua vazio

### Requirement: Continuar uma conversa do mesmo dono
Uma mensagem com o id de uma conversa existente SHALL continuar a conversa, com o histórico e o resumo dela, só quando o dono é o mesmo: a mesma conta, na web, ou nenhuma conta, no CLI e no eval. No CLI e no eval, o perfil da conversa também vale. Com outro dono, a conversa MUST ser tratada como inexistente, sem ler nem gravar nada nela.

#### Scenario: Conta continua a própria conversa
- **WHEN** a conta A envia uma mensagem com o id de uma conversa dela que já tem mensagens
- **THEN** o assistente usa o histórico e o resumo dessa conversa para responder

#### Scenario: Conta tenta continuar a conversa de outra
- **WHEN** a conta A envia uma mensagem com o id de uma conversa da conta B
- **THEN** a conversa de B não muda, e a mensagem é recusada como se a conversa não existisse

#### Scenario: CLI tenta abrir uma conversa da web
- **WHEN** o `npm run chat -- --sessao <id>` recebe o id de uma conversa `web`
- **THEN** o CLI trata o id como uma conversa que não existe
