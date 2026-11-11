## ADDED Requirements

### Requirement: Recusa do texto do perfil por campo
Quando o filtro de `guardrails` recusa o `name` ou o `cuisine` do `PUT /api/profile`, a API SHALL responder `400` com `{ error, field }`, em que `field` é o campo recusado e `error` é a mensagem neutra do filtro, e MUST NOT alterar o perfil salvo. A linha de log do pedido SHALL trazer o motivo em `profileRejected`.

#### Scenario: Nome inadequado enviado direto à API
- **WHEN** a conta envia `PUT /api/profile` com `{ "plan": "misto", "name": "M3rd@ Burguer" }`
- **THEN** a resposta é `400` com `{ "error": "Esse nome tem um termo que não é permitido. Escolha outro.", "field": "name" }`, e o perfil salvo não muda

#### Scenario: Cozinha com caractere proibido
- **WHEN** a conta envia `PUT /api/profile` com `{ "plan": "proprio", "cuisine": "<b>pizza</b>" }`
- **THEN** a resposta é `400` com `field: "cuisine"` e a mensagem dos caracteres permitidos

#### Scenario: Plano continua sendo checado antes
- **WHEN** o corpo não traz `plan` e traz um nome inadequado
- **THEN** a resposta é `400` com "Escolha o plano: Próprio, Entrega ou Misto." e sem `field`
