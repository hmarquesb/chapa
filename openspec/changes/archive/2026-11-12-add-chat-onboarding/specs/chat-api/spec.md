## MODIFIED Requirements

### Requirement: Login obrigatório nas rotas de conversa
`POST /api/chat`, `GET /api/sessions`, `GET /api/sessions/[id]/messages`, `DELETE /api/sessions/[id]`, `GET` e `PUT /api/profile`, `DELETE /api/account` e `POST /api/account/welcome` SHALL exigir uma sessão válida (ver `auth`) antes de qualquer outra verificação. Sem ela, MUST responder `401` com "Sua sessão terminou. Entre de novo para continuar.", sem ler o corpo e sem contar no rate limit. `GET /api/health` e `GET /api/cron/cleanup` não exigem login.

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

#### Scenario: Boas-vindas sem cookie
- **WHEN** alguém envia `POST /api/account/welcome` sem cookie de sessão
- **THEN** a resposta é `401`, e nenhuma conta muda

#### Scenario: Demo vencida
- **WHEN** uma conta demo vencida envia `POST /api/chat` com o cookie ainda dentro da validade
- **THEN** a resposta é `401`

#### Scenario: Saúde sem login
- **WHEN** alguém pede `GET /api/health` sem cookie
- **THEN** a resposta segue a regra de saúde, sem `401`

## ADDED Requirements

### Requirement: Registrar que a conta viu as boas-vindas
`POST /api/account/welcome` SHALL registrar, na conta logada, o momento em que ela fechou o card de boas-vindas e responder `204` sem corpo. O pedido não tem corpo, e um corpo enviado MUST ser ignorado. Repetir o pedido MUST manter o primeiro registro e responder `204` de novo. A rota MUST NOT alterar o perfil nem as conversas.

#### Scenario: Primeira vez
- **WHEN** uma conta Google que nunca fechou o card envia `POST /api/account/welcome`
- **THEN** a resposta é `204`, e a conta passa a constar como já tendo visto o card

#### Scenario: Pedido repetido
- **WHEN** a mesma conta envia `POST /api/account/welcome` de novo
- **THEN** a resposta é `204`, e o momento registrado continua o da primeira vez

#### Scenario: Falha no banco
- **WHEN** o banco está fora do ar durante o pedido
- **THEN** a resposta segue a regra de erros com texto fixo em PT-BR, como nas outras rotas
