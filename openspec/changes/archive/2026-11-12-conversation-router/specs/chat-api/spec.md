## MODIFIED Requirements

### Requirement: Logs sem conteúdo
Cada pedido SHALL gerar uma linha de log em JSON com o modelo da rota (por exemplo `/api/sessions/[id]/messages`), o método, o status HTTP, a latência e, quando houver, o `accountId` da sessão, o status da resposta, a rota do turno (`replyRoute`), a latência do roteador (`routerMs`), as chamadas, os tokens e o nome do erro. O conteúdo das mensagens, o perfil, o `sessionId`, o IP e o e-mail da conta MUST NOT ser registrados.

#### Scenario: Pedido de histórico
- **WHEN** o navegador lê o histórico de uma sessão
- **THEN** o log registra `/api/sessions/[id]/messages`, sem o id real

#### Scenario: Pedido de uma conta Google
- **WHEN** uma conta Google envia uma mensagem
- **THEN** o log traz o `accountId` e não traz o e-mail

#### Scenario: Cumprimento no log
- **WHEN** a conta envia "bom dia"
- **THEN** o log traz `replyStatus: "small_talk"`, `replyRoute: "cumprimento"` e `llmCalls: 0`, e não traz o texto da mensagem nem o da resposta

#### Scenario: Conversa no log
- **WHEN** a conta envia "obrigada, ajudou muito" e o roteador responde
- **THEN** o log traz `replyStatus: "small_talk"`, `replyRoute: "conversa"` e o `routerMs`, e não traz o texto da mensagem nem o da resposta
