# Spec Delta

## ADDED Requirements

### Requirement: Login obrigatório nas rotas de conversa
`POST /api/chat` e `GET /api/sessions/[id]/messages` SHALL exigir uma sessão válida (ver `auth`) antes de qualquer outra verificação. Sem ela, MUST responder `401` com "Sua sessão terminou. Entre de novo para continuar.", sem ler o corpo e sem contar no rate limit. `GET /api/health` e `GET /api/cron/cleanup` não exigem login.

#### Scenario: Mensagem sem cookie
- **WHEN** alguém envia `POST /api/chat` sem cookie de sessão
- **THEN** a resposta é `401` com "Sua sessão terminou. Entre de novo para continuar.", e nada é gravado

#### Scenario: Histórico sem cookie
- **WHEN** alguém pede `GET /api/sessions/<uuid>/messages` sem cookie de sessão
- **THEN** a resposta é `401`

#### Scenario: Demo vencida
- **WHEN** uma conta demo vencida envia `POST /api/chat` com o cookie ainda dentro da validade
- **THEN** a resposta é `401`

#### Scenario: Saúde sem login
- **WHEN** alguém pede `GET /api/health` sem cookie
- **THEN** a resposta segue a regra de saúde, sem `401`

## MODIFIED Requirements

### Requirement: Logs sem conteúdo
Cada pedido SHALL gerar uma linha de log em JSON com o modelo da rota (por exemplo `/api/sessions/[id]/messages`), o método, o status HTTP, a latência e, quando houver, o `accountId` da sessão, o status da resposta, as chamadas, os tokens e o nome do erro. O conteúdo das mensagens, o perfil, o `sessionId`, o IP e o e-mail da conta MUST NOT ser registrados.

#### Scenario: Pedido de histórico
- **WHEN** o navegador lê o histórico de uma sessão
- **THEN** o log registra `/api/sessions/[id]/messages`, sem o id real

#### Scenario: Pedido de uma conta Google
- **WHEN** uma conta Google envia uma mensagem
- **THEN** o log traz o `accountId` e não traz o e-mail

### Requirement: Limpeza diária protegida por segredo
`GET /api/cron/cleanup` SHALL exigir `Authorization: Bearer <CRON_SECRET>`, comparado em tempo constante, e responder 401 com "Acesso não autorizado." sem ele. Autorizado, apaga as sessões sem atividade há mais de 7 dias, as janelas de rate limit com mais de 2 dias e as contas vencidas (ver `auth`, "Expiração das contas"), e responde `{ deletedSessions, deletedRateLimits, deletedAccounts }`. Roda uma vez por dia.

#### Scenario: Chamada do agendador
- **WHEN** o agendador chama a rota com o segredo certo
- **THEN** a resposta é 200 com o número de sessões, de janelas e de contas apagadas

#### Scenario: Sem segredo
- **WHEN** alguém chama a rota sem o cabeçalho ou com outro segredo
- **THEN** a resposta é 401 e nada é apagado
