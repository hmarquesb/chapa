## MODIFIED Requirements

### Requirement: Logs sem conteúdo
Cada pedido SHALL gerar uma linha de log em JSON com o modelo da rota (por exemplo `/api/sessions/[id]/messages`), o método, o status HTTP, a latência e, quando houver, o `accountId` da sessão, o status da resposta, a rota do turno (`replyRoute`), as chamadas, os tokens e o nome do erro. O conteúdo das mensagens, o perfil, o `sessionId`, o IP e o e-mail da conta MUST NOT ser registrados.

#### Scenario: Pedido de histórico
- **WHEN** o navegador lê o histórico de uma sessão
- **THEN** o log registra `/api/sessions/[id]/messages`, sem o id real

#### Scenario: Pedido de uma conta Google
- **WHEN** uma conta Google envia uma mensagem
- **THEN** o log traz o `accountId` e não traz o e-mail

#### Scenario: Cumprimento no log
- **WHEN** a conta envia "bom dia"
- **THEN** o log traz `replyStatus: "small_talk"`, `replyRoute: "cumprimento"` e `llmCalls: 0`, e não traz o texto da mensagem nem o da resposta

## ADDED Requirements

### Requirement: Status de conversa na API
`POST /api/chat` e o histórico (`GET /api/sessions/[id]/messages`) SHALL aceitar o status `small_talk`, com a lista de fontes vazia. A rota do turno MUST NOT sair do servidor: a resposta continua sendo exatamente `{ status, answer, sources, sessionId }`.

#### Scenario: Cumprimento pela API
- **WHEN** o navegador envia "boa noite" numa conta com o nome "Marmitaria Boa Panela" no perfil
- **THEN** a resposta é 200 com `status: "small_talk"`, `answer: "Boa noite, Marmitaria Boa Panela! Em que posso ajudar?"`, `sources: []` e o `sessionId`, e nenhum outro campo

#### Scenario: Cumprimento no histórico
- **WHEN** o navegador lê o histórico de uma conversa que começou com "bom dia"
- **THEN** a mensagem do assistente vem com `status: "small_talk"` e `sources: []`
