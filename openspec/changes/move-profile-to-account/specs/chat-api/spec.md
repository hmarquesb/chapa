# Spec Delta

## ADDED Requirements

### Requirement: Ler e salvar o perfil da conta
`GET /api/profile` SHALL responder 200 com `{ profile }`, o perfil da conta logada. `PUT /api/profile` SHALL receber `{ name?, plan, cuisine?, city?, hours? }`, aparar os valores, descartar os campos vazios, salvar o perfil na conta e responder 200 com `{ profile }`. O `plan` MUST ser `proprio`, `entrega` ou `misto`.

#### Scenario: Salvar o perfil
- **WHEN** a conta envia `PUT /api/profile` com `{ "name": "  Pizzaria Bella ", "plan": "entrega", "city": "" }`
- **THEN** a resposta é 200 com `{ "profile": { "name": "Pizzaria Bella", "plan": "entrega" } }`, e a próxima mensagem de qualquer conversa da conta usa esse perfil

#### Scenario: Sem plano
- **WHEN** o corpo do `PUT` não traz `plan`, ou traz `"plan": "premium"`
- **THEN** a resposta é 400 com "Escolha o plano: Próprio, Entrega ou Misto.", e o perfil salvo não muda

#### Scenario: Campo longo ou desconhecido
- **WHEN** o corpo traz `city` com 61 caracteres, ou o campo `cnpj`
- **THEN** a resposta é 400 com "O perfil do restaurante é inválido." no primeiro caso e "O pedido tem campos desconhecidos." no segundo

#### Scenario: Formato do pedido
- **WHEN** o `PUT` chega sem `Content-Type: application/json`, com mais de 4.096 bytes ou com JSON quebrado
- **THEN** a resposta é 415, 413 ou 400, com os mesmos textos de `POST /api/chat`

### Requirement: Excluir a conta pela API
`DELETE /api/account` SHALL apagar a conta logada, junto com o perfil e todas as conversas e mensagens, e responder `204` sem corpo. Os pedidos seguintes com o mesmo cookie MUST receber `401`.

#### Scenario: Excluir e tentar de novo
- **WHEN** a conta envia `DELETE /api/account` e depois `GET /api/sessions` com o mesmo cookie
- **THEN** a primeira resposta é `204` e a segunda é `401`

### Requirement: Limite diário de mensagens por conta
Depois do limite por IP, `POST /api/chat` SHALL limitar cada conta a 60 mensagens por dia UTC (conta Google) ou a 30 (conta demo), contando cada pedido válido que passou pelo limite por IP. Acima disso, MUST responder 429 com `Retry-After` até a meia-noite UTC seguinte e o texto fixo do tipo de conta.

#### Scenario: 61ª mensagem de uma conta Google
- **WHEN** uma conta Google envia a 61ª mensagem válida no mesmo dia UTC
- **THEN** a resposta é 429 com "Você chegou ao limite de mensagens de hoje nesta conta. Volte amanhã."

#### Scenario: 31ª mensagem de uma demo
- **WHEN** uma conta demo envia a 31ª mensagem válida no mesmo dia UTC
- **THEN** a resposta é 429 com "A conta de demonstração chegou ao limite de mensagens de hoje. Entre com Google para continuar."

#### Scenario: Recusa pelo IP não conta na conta
- **WHEN** um pedido é recusado pelo limite por IP
- **THEN** ele não entra na contagem diária da conta

## MODIFIED Requirements

### Requirement: Login obrigatório nas rotas de conversa
`POST /api/chat`, `GET /api/sessions`, `GET /api/sessions/[id]/messages`, `DELETE /api/sessions/[id]`, `GET` e `PUT /api/profile` e `DELETE /api/account` SHALL exigir uma sessão válida (ver `auth`) antes de qualquer outra verificação. Sem ela, MUST responder `401` com "Sua sessão terminou. Entre de novo para continuar.", sem ler o corpo e sem contar no rate limit. `GET /api/health` e `GET /api/cron/cleanup` não exigem login.

#### Scenario: Mensagem sem cookie
- **WHEN** alguém envia `POST /api/chat` sem cookie de sessão
- **THEN** a resposta é `401` com "Sua sessão terminou. Entre de novo para continuar.", e nada é gravado

#### Scenario: Histórico sem cookie
- **WHEN** alguém pede `GET /api/sessions/<uuid>/messages` sem cookie de sessão
- **THEN** a resposta é `401`

#### Scenario: Lista sem cookie
- **WHEN** alguém pede `GET /api/sessions` sem cookie de sessão
- **THEN** a resposta é `401`

#### Scenario: Perfil sem cookie
- **WHEN** alguém envia `PUT /api/profile` sem cookie de sessão
- **THEN** a resposta é `401`, e nenhum perfil muda

#### Scenario: Demo vencida
- **WHEN** uma conta demo vencida envia `POST /api/chat` com o cookie ainda dentro da validade
- **THEN** a resposta é `401`

#### Scenario: Saúde sem login
- **WHEN** alguém pede `GET /api/health` sem cookie
- **THEN** a resposta segue a regra de saúde, sem `401`

### Requirement: Enviar uma mensagem
`POST /api/chat` SHALL receber `{ sessionId?, message }`, passar a mensagem ao assistente pelo canal `web`, com o perfil da conta, na conversa indicada ou, sem `sessionId`, numa conversa nova da conta, e responder 200 com exatamente `{ status, answer, sources, sessionId }`. `sessionId` é o id da conversa, ou `null` quando nenhuma conversa foi criada. A pergunta reescrita, os trechos e o consumo MUST NOT sair do servidor.

#### Scenario: Pergunta respondida
- **WHEN** o navegador envia uma pergunta coberta pela base numa conversa da conta
- **THEN** a resposta é 200 com `status: "answered"`, o texto da resposta, a lista de fontes e o `sessionId` da conversa, e nenhum outro campo

#### Scenario: Primeira mensagem sem id
- **WHEN** o navegador envia uma pergunta sem `sessionId`
- **THEN** a resposta traz o `sessionId` da conversa nova, que passa a aparecer na lista da conta

#### Scenario: Perfil da conta no prompt
- **WHEN** a conta tem o plano Entrega salvo e envia uma pergunta sobre a comissão
- **THEN** a instrução de sistema traz "Plano: Plano Entrega", e a conversa não grava perfil nenhum

#### Scenario: Bloqueio não é erro HTTP
- **WHEN** a mensagem tem um CPF ou passa de 1.000 caracteres, num corpo de até 4.096 bytes
- **THEN** a resposta é 200 com `status: "blocked_input"` e a mensagem do guardrail, porque a validação do formato não olha o tamanho nem o conteúdo da mensagem

#### Scenario: Bloqueio numa conversa nova
- **WHEN** a primeira mensagem, sem `sessionId`, tem um CPF
- **THEN** a resposta é 200 com `status: "blocked_input"` e `sessionId: null`

### Requirement: Validação do formato do pedido
`POST /api/chat` SHALL responder 400 com um motivo em PT-BR quando o corpo não é um objeto, traz `profile` ("O perfil agora fica salvo na conta. Recarregue a página."), tem outros campos além de `sessionId` e `message`, tem `sessionId` presente que não é UUID, ou tem `message` que não é texto.

#### Scenario: Campo desconhecido
- **WHEN** o corpo traz `{ "message": "oi", "role": "admin" }`
- **THEN** a resposta é 400 com "O pedido tem campos desconhecidos."

#### Scenario: sessionId malformado
- **WHEN** o corpo traz `{ "sessionId": "abc", "message": "oi" }`
- **THEN** a resposta é 400 com "O identificador da conversa é inválido."

#### Scenario: Perfil no corpo
- **WHEN** o corpo traz `{ "message": "oi", "profile": { "plan": "misto" } }`
- **THEN** a resposta é 400 com "O perfil agora fica salvo na conta. Recarregue a página.", e nada é gravado

#### Scenario: Campo do perfil longo demais
- **WHEN** o corpo traz um perfil com `city` de 61 caracteres
- **THEN** a resposta é 400 com "O perfil agora fica salvo na conta. Recarregue a página.", porque nenhum perfil é aceito no corpo

### Requirement: Ler o histórico de uma sessão
`GET /api/sessions/[id]/messages` SHALL responder 200 com `{ sessionId, messages }` para uma conversa da conta logada, em que cada mensagem tem `id`, `role`, `content`, `status` (nulo nas do parceiro), `sources` e `createdAt` em ISO 8601, na ordem de gravação. A leitura MUST NOT alterar a última atividade da conversa.

#### Scenario: Sessão existente
- **WHEN** a conta pede o histórico de uma conversa dela com dois turnos
- **THEN** a resposta é 200 com as quatro mensagens em ordem e sem campo `profile`

#### Scenario: Sessão que não existe
- **WHEN** o id é um UUID que o banco não conhece, ou de uma conversa já apagada
- **THEN** a resposta é 404 com "Esta conversa não existe mais. Começamos uma nova."

#### Scenario: Sessão de outra conta
- **WHEN** a conta A pede o histórico de uma conversa da conta B
- **THEN** a resposta é 404 com "Esta conversa não existe mais. Começamos uma nova."

#### Scenario: Id malformado
- **WHEN** o id não é um UUID
- **THEN** a resposta é 400 com "O identificador da conversa é inválido."
