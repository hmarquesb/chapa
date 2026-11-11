# Spec Delta

## ADDED Requirements

### Requirement: Conversa de outra conta é tratada como inexistente
Toda rota que recebe o id de uma conversa SHALL responder `404` com "Esta conversa não existe mais. Começamos uma nova." tanto para um id que o banco não conhece quanto para a conversa de outra conta, sem ler nem alterar a conversa alheia. O filtro pela conta MUST valer no acesso ao banco, e não só na rota.

#### Scenario: Continuar a conversa de outra conta
- **WHEN** a conta A envia `POST /api/chat` com o `sessionId` de uma conversa da conta B
- **THEN** a resposta é `404` com o texto fixo, e a conversa de B continua com as mesmas mensagens e a mesma última atividade

#### Scenario: Mesma resposta para inexistente e alheia
- **WHEN** a conta A pede o histórico de um UUID que não existe e depois o de uma conversa da conta B
- **THEN** as duas respostas têm o mesmo status e o mesmo corpo

### Requirement: Listar as conversas da conta
`GET /api/sessions` SHALL responder 200 com `{ sessions }`, a lista das conversas da conta logada que têm pelo menos uma mensagem, da última atividade mais recente para a mais antiga, no máximo 50. Cada item tem `id`, `title` e `lastActivityAt` em ISO 8601. O título é a primeira pergunta, com os espaços aparados e juntados, cortada em 60 caracteres com "…" quando passa disso.

#### Scenario: Duas contas
- **WHEN** a conta A tem duas conversas, a conta B tem uma, e A pede a lista
- **THEN** a resposta traz só as duas conversas de A, a mais recente primeiro

#### Scenario: Título longo
- **WHEN** a primeira pergunta de uma conversa tem 80 caracteres
- **THEN** o título tem os 60 primeiros caracteres, sem espaço no fim, seguidos de "…"

#### Scenario: Conta sem conversas
- **WHEN** uma conta nova pede a lista
- **THEN** a resposta é 200 com `{ "sessions": [] }`

### Requirement: Apagar uma conversa
`DELETE /api/sessions/[id]` SHALL apagar a conversa da conta logada, junto com todas as mensagens, e responder `204` sem corpo. Um id malformado MUST receber `400` com "O identificador da conversa é inválido.", e a conversa inexistente ou de outra conta recebe o `404` da regra de conversa alheia.

#### Scenario: Apagar a própria conversa
- **WHEN** a conta apaga uma conversa dela
- **THEN** a resposta é `204`, e a conversa some da lista e do banco

#### Scenario: Apagar a conversa de outra conta
- **WHEN** a conta A tenta apagar uma conversa da conta B
- **THEN** a resposta é `404`, e a conversa de B continua

## MODIFIED Requirements

### Requirement: Login obrigatório nas rotas de conversa
`POST /api/chat`, `GET /api/sessions`, `GET /api/sessions/[id]/messages` e `DELETE /api/sessions/[id]` SHALL exigir uma sessão válida (ver `auth`) antes de qualquer outra verificação. Sem ela, MUST responder `401` com "Sua sessão terminou. Entre de novo para continuar.", sem ler o corpo e sem contar no rate limit. `GET /api/health` e `GET /api/cron/cleanup` não exigem login.

#### Scenario: Mensagem sem cookie
- **WHEN** alguém envia `POST /api/chat` sem cookie de sessão
- **THEN** a resposta é `401` com "Sua sessão terminou. Entre de novo para continuar.", e nada é gravado

#### Scenario: Histórico sem cookie
- **WHEN** alguém pede `GET /api/sessions/<uuid>/messages` sem cookie de sessão
- **THEN** a resposta é `401`

#### Scenario: Lista sem cookie
- **WHEN** alguém pede `GET /api/sessions` sem cookie de sessão
- **THEN** a resposta é `401`

#### Scenario: Demo vencida
- **WHEN** uma conta demo vencida envia `POST /api/chat` com o cookie ainda dentro da validade
- **THEN** a resposta é `401`

#### Scenario: Saúde sem login
- **WHEN** alguém pede `GET /api/health` sem cookie
- **THEN** a resposta segue a regra de saúde, sem `401`

### Requirement: Enviar uma mensagem
`POST /api/chat` SHALL receber `{ sessionId?, message, profile? }`, passar a mensagem ao assistente pelo canal `web`, na conversa indicada ou, sem `sessionId`, numa conversa nova da conta, e responder 200 com exatamente `{ status, answer, sources, sessionId }`. `sessionId` é o id da conversa, ou `null` quando nenhuma conversa foi criada. A pergunta reescrita, os trechos e o consumo MUST NOT sair do servidor.

#### Scenario: Pergunta respondida
- **WHEN** o navegador envia uma pergunta coberta pela base numa conversa da conta
- **THEN** a resposta é 200 com `status: "answered"`, o texto da resposta, a lista de fontes e o `sessionId` da conversa, e nenhum outro campo

#### Scenario: Primeira mensagem sem id
- **WHEN** o navegador envia uma pergunta sem `sessionId`
- **THEN** a resposta traz o `sessionId` da conversa nova, que passa a aparecer na lista da conta

#### Scenario: Bloqueio não é erro HTTP
- **WHEN** a mensagem tem um CPF ou passa de 1.000 caracteres, num corpo de até 4.096 bytes
- **THEN** a resposta é 200 com `status: "blocked_input"` e a mensagem do guardrail, porque a validação do formato não olha o tamanho nem o conteúdo da mensagem

#### Scenario: Bloqueio numa conversa nova
- **WHEN** a primeira mensagem, sem `sessionId`, tem um CPF
- **THEN** a resposta é 200 com `status: "blocked_input"` e `sessionId: null`

### Requirement: Validação do formato do pedido
`POST /api/chat` SHALL responder 400 com um motivo em PT-BR quando o corpo não é um objeto, tem campos além de `sessionId`, `message` e `profile`, tem `sessionId` presente que não é UUID, tem `message` que não é texto, ou tem `profile` que não é um objeto só com `name`, `plan`, `cuisine`, `city` e `hours` em texto de até 60 caracteres.

#### Scenario: Campo desconhecido
- **WHEN** o corpo traz `{ "message": "oi", "role": "admin" }`
- **THEN** a resposta é 400 com "O pedido tem campos desconhecidos."

#### Scenario: sessionId malformado
- **WHEN** o corpo traz `{ "sessionId": "abc", "message": "oi" }`
- **THEN** a resposta é 400 com "O identificador da conversa é inválido."

#### Scenario: Campo do perfil longo demais
- **WHEN** o perfil traz `city` com 61 caracteres
- **THEN** a resposta é 400 com "O perfil do restaurante é inválido."

### Requirement: Ler o histórico de uma sessão
`GET /api/sessions/[id]/messages` SHALL responder 200 com `{ sessionId, profile, messages }` para uma conversa da conta logada, em que cada mensagem tem `id`, `role`, `content`, `status` (nulo nas do parceiro), `sources` e `createdAt` em ISO 8601, na ordem de gravação. A leitura MUST NOT alterar a última atividade da conversa.

#### Scenario: Sessão existente
- **WHEN** a conta pede o histórico de uma conversa dela com dois turnos
- **THEN** a resposta é 200 com o perfil salvo e as quatro mensagens em ordem

#### Scenario: Sessão que não existe
- **WHEN** o id é um UUID que o banco não conhece, ou de uma conversa já apagada
- **THEN** a resposta é 404 com "Esta conversa não existe mais. Começamos uma nova."

#### Scenario: Sessão de outra conta
- **WHEN** a conta A pede o histórico de uma conversa da conta B
- **THEN** a resposta é 404 com "Esta conversa não existe mais. Começamos uma nova."

#### Scenario: Id malformado
- **WHEN** o id não é um UUID
- **THEN** a resposta é 400 com "O identificador da conversa é inválido."

### Requirement: Limpeza diária protegida por segredo
`GET /api/cron/cleanup` SHALL exigir `Authorization: Bearer <CRON_SECRET>`, comparado em tempo constante, e responder 401 com "Acesso não autorizado." sem ele. Autorizado, apaga as conversas expiradas (ver `session-memory`), as conversas `web` sem conta, as janelas de rate limit com mais de 2 dias e as contas vencidas (ver `auth`), e responde `{ deletedSessions, deletedRateLimits, deletedAccounts }`. Roda uma vez por dia.

#### Scenario: Chamada do agendador
- **WHEN** o agendador chama a rota com o segredo certo
- **THEN** a resposta é 200 com o número de conversas, de janelas e de contas apagadas

#### Scenario: Conversa web antiga sem conta
- **WHEN** a limpeza roda e existe uma conversa `web` sem conta, de antes do login, com atividade há 1 dia
- **THEN** a conversa é apagada

#### Scenario: Sem segredo
- **WHEN** alguém chama a rota sem o cabeçalho ou com outro segredo
- **THEN** a resposta é 401 e nada é apagado
