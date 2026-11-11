## MODIFIED Requirements

### Requirement: Perfil do restaurante por sessão
No CLI e no eval, quando a mensagem traz um perfil, o sistema SHALL substituir o perfil da sessão por ele, depois de validá-lo pelas mesmas regras do `PUT /api/profile` (ver `chat-api`), exceto o plano, que no CLI e no eval é opcional. Um perfil inválido MUST interromper o CLI com a mensagem do erro, antes de qualquer chamada ao LLM. Sem perfil, MUST usar o salvo na sessão. Na web, o perfil vem sempre da conta, lido a cada mensagem, e MUST NOT ser gravado na conversa.

#### Scenario: Perfil enviado com espaços
- **WHEN** uma mensagem do CLI traz o perfil `{ "version": 2, "name": "  Pizzaria Bella " }`
- **THEN** a sessão passa a ter o perfil `{ "version": 2, "name": "Pizzaria Bella" }`, que também vai para a instrução de sistema

#### Scenario: Perfil vazio apaga o salvo
- **WHEN** uma mensagem do CLI ou do eval traz `profile: { "version": 2 }` (ou só campos vazios) e a sessão tem um perfil salvo
- **THEN** o perfil da sessão passa a ser vazio

#### Scenario: Perfil omitido
- **WHEN** uma mensagem do CLI não traz perfil e a sessão tem um perfil salvo
- **THEN** a resposta usa o perfil salvo e o perfil da sessão não muda

#### Scenario: Perfil da conta na web
- **WHEN** uma conta com o plano Misto envia uma mensagem e depois troca o plano para Próprio
- **THEN** a mensagem seguinte, em qualquer conversa da conta, usa o Plano Próprio, e o perfil gravado na conversa continua vazio

#### Scenario: Arquivo de perfil inválido no CLI
- **WHEN** alguém roda `npm run chat -- --perfil perfil.json` com `"location": { "uf": "SP", "cityCode": 3304557 }` no arquivo
- **THEN** o comando termina com "Escolha o estado e a cidade da lista." e nenhuma chamada ao LLM é feita
