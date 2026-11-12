## MODIFIED Requirements

### Requirement: Conta demo com perfil de exemplo
Toda conta demo SHALL nascer com o mesmo perfil fictício, no formato v2: nome "Marmitaria Boa Panela", plano Misto, cozinha "Marmita e comida caseira" (`marmita`), local Rio de Janeiro (RJ, código 3304557) e horário de segunda a sábado das 11:00 às 15:00 e das 18:00 às 23:00, com o domingo fechado. O visitante MAY editar o perfil da própria demo, e a edição não muda o perfil das outras demos.

#### Scenario: Demo nova
- **WHEN** o visitante clica em "Testar como demo"
- **THEN** o chat mostra o resumo "Marmitaria Boa Panela · Plano Misto" sem passar pela tela de perfil e sem a faixa de revisão

#### Scenario: Demo troca o plano
- **WHEN** o visitante troca o plano da demo para Próprio
- **THEN** a próxima demo criada continua com o plano Misto

#### Scenario: Smoke confere a demo
- **WHEN** o smoke lê `GET /api/profile` de uma demo nova
- **THEN** o passo só passa com o plano `misto` e o local `{ "uf": "RJ", "cityCode": 3304557 }`

#### Scenario: Horário da demo no prompt
- **WHEN** a demo nova faz uma pergunta
- **THEN** a instrução de sistema traz "Horário: seg a sáb, 11h às 15h e 18h às 23h; dom, fechado"
