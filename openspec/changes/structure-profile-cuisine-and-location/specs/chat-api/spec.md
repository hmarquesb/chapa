## MODIFIED Requirements

### Requirement: Ler e salvar o perfil da conta
`GET /api/profile` SHALL responder 200 com `{ profile, needsReview }`: o perfil da conta logada no formato v2 e se ele precisa de revisão (ver `answer-generation`, "Perfil salvo no formato antigo"). `PUT /api/profile` SHALL receber o perfil v2 `{ version: 2, plan, name?, cuisine?, location?, hours? }`, aparar os textos, descartar os campos vazios, salvar o perfil na conta e responder 200 com `{ profile, needsReview: false }`. O `plan` MUST ser `proprio`, `entrega` ou `misto`. `cuisine` MUST ser `{ id }`, com um id da lista de cozinhas, ou `{ id: "outro", text }`, com o texto de 1 a 30 caracteres. `location` MUST ser `{ uf }` ou `{ uf, cityCode }`, com uma das 27 UFs e o código IBGE de um município dessa UF. `name` e `hours` são texto de até 60 caracteres.

#### Scenario: Salvar o perfil
- **WHEN** a conta envia `PUT /api/profile` com `{ "version": 2, "name": "  Pizzaria Bella ", "plan": "entrega", "cuisine": { "id": "pizza" }, "location": { "uf": "RJ", "cityCode": 3303302 } }`
- **THEN** a resposta é 200 com o perfil salvo, o nome aparado e `needsReview: false`, e a próxima mensagem de qualquer conversa da conta usa esse perfil

#### Scenario: Sem plano
- **WHEN** o corpo do `PUT` não traz `plan`, ou traz `"plan": "premium"`
- **THEN** a resposta é 400 com "Escolha o plano: Próprio, Entrega ou Misto.", e o perfil salvo não muda

#### Scenario: Formato antigo
- **WHEN** o corpo do `PUT` não traz `version: 2`, como `{ "plan": "misto", "city": "Niterói" }`
- **THEN** a resposta é 400 com "O formulário do perfil mudou. Recarregue a página.", e o perfil salvo não muda

#### Scenario: Cozinha fora da lista
- **WHEN** o corpo traz `"cuisine": { "id": "tailandesa" }`, ou `{ "id": "outro" }` sem texto, ou `{ "id": "outro", "text": "<31 caracteres>" }`
- **THEN** a resposta é 400 com `field: "cuisine"` e a mensagem "Escolha o tipo de cozinha da lista ou descreva em até 30 caracteres."

#### Scenario: Cidade de outra UF
- **WHEN** o corpo traz `"location": { "uf": "SP", "cityCode": 3304557 }` (código do Rio de Janeiro), um código que não existe, uma UF desconhecida ou `{ "cityCode": 3304557 }` sem UF
- **THEN** a resposta é 400 com `field: "location"` e a mensagem "Escolha o estado e a cidade da lista."

#### Scenario: Só o estado
- **WHEN** o corpo traz `"location": { "uf": "MG" }`
- **THEN** o perfil é salvo com o estado e sem cidade

#### Scenario: Campo longo ou desconhecido
- **WHEN** o corpo traz `name` com 61 caracteres, ou o campo `cnpj`
- **THEN** a resposta é 400 com "O perfil do restaurante é inválido." no primeiro caso e "O pedido tem campos desconhecidos." no segundo

#### Scenario: Formato do pedido
- **WHEN** o `PUT` chega sem `Content-Type: application/json`, com mais de 4.096 bytes ou com JSON quebrado
- **THEN** a resposta é 415, 413 ou 400, com os mesmos textos de `POST /api/chat`
