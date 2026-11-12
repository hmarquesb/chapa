## MODIFIED Requirements

### Requirement: Ler e salvar o perfil da conta
`GET /api/profile` SHALL responder 200 com `{ profile, needsReview }`: o perfil da conta logada no formato v2 e se ele precisa de revisão (ver `answer-generation`, "Perfil salvo no formato antigo"). `PUT /api/profile` SHALL receber o perfil v2 `{ version: 2, plan, name?, cuisine?, location?, hours? }`, aparar os textos, descartar os campos vazios, salvar o perfil na conta e responder 200 com `{ profile, needsReview: false }`. Cada campo MUST seguir o formato do cenário "Formato de cada campo".

#### Scenario: Formato de cada campo
- **WHEN** a conta envia `PUT /api/profile`
- **THEN** o `plan` é `proprio`, `entrega` ou `misto`; `cuisine` é `{ id }`, com um id da lista de cozinhas, ou `{ id: "outro", text }`, com o texto de 1 a 30 caracteres; `location` é `{ uf }` ou `{ uf, cityCode }`, com uma das 27 UFs e o código IBGE de um município dessa UF; `name` é texto de até 60 caracteres; `hours` segue "Horário do perfil na API"; fora disso, a resposta é 400

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

## ADDED Requirements

### Requirement: Horário do perfil na API
O `hours` do `PUT /api/profile` SHALL ser um objeto com exatamente as chaves `seg`, `ter`, `qua`, `qui`, `sex`, `sab` e `dom`, cada uma com uma lista de 0 a 2 turnos `{ open, close }` em `HH:MM`, de 30 em 30 minutos. Uma lista vazia é dia fechado, e uma grade sem nenhum turno é salva como perfil sem horário. Fora desse formato, a resposta MUST ser `400` com `field: "hours"` e "Preencha o horário pela grade da tela de perfil.".

#### Scenario: Horário em texto
- **WHEN** o corpo traz `"hours": "11h às 15h"`
- **THEN** a resposta é `400` com `field: "hours"`, e o perfil salvo não muda

#### Scenario: Minuto fora do passo
- **WHEN** um turno traz `"open": "11:15"`
- **THEN** a resposta é `400` com `field: "hours"`

#### Scenario: Grade toda fechada
- **WHEN** o corpo traz os 7 dias com listas vazias
- **THEN** o perfil é salvo sem `hours`

### Requirement: Regras dos turnos de um dia
Cada turno SHALL ter `open` diferente de `close`; quando `close` é menor que `open`, o turno termina no dia seguinte. Só o último turno do dia MAY passar da meia-noite, o segundo turno MUST começar depois do fim do primeiro, e um turno que passa da meia-noite MUST NOT terminar depois do início do primeiro turno do dia seguinte (o domingo segue para a segunda). Quebrada uma regra, a resposta MUST ser `400` com `field: "hours.<dia>"` e a mensagem do dia.

#### Scenario: Abrir e fechar iguais
- **WHEN** a segunda traz `{ "open": "18:00", "close": "18:00" }`
- **THEN** a resposta é `400` com `field: "hours.seg"` e "Na segunda, o horário de abrir e o de fechar precisam ser diferentes."

#### Scenario: Turnos sobrepostos
- **WHEN** a terça traz `11:00–15:00` e `14:30–23:00`
- **THEN** a resposta é `400` com `field: "hours.ter"` e "Na terça, o segundo turno precisa começar depois do fim do primeiro."

#### Scenario: Madrugada invade o dia seguinte
- **WHEN** a sexta traz `18:00–02:00` e o sábado traz `01:00–05:00`
- **THEN** a resposta é `400` com `field: "hours.sex"` e "O turno de sexta que passa da meia-noite invade o primeiro turno de sábado."

#### Scenario: Turno que vira o dia
- **WHEN** a sexta traz `18:00–02:00` e o sábado traz `11:00–15:00`
- **THEN** o perfil é salvo
