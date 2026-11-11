# Spec Delta

## MODIFIED Requirements

### Requirement: Perfil e resumo na instrução de sistema
O sistema SHALL acrescentar à instrução de sistema um bloco "Perfil do restaurante" com uma linha `Rótulo: valor` por campo preenchido (Nome, Plano, Cozinha, Cidade, Horário, nessa ordem, com os valores aparados, e o plano pelo nome oficial: "Plano Próprio", "Plano Entrega" ou "Plano Misto") e, se houver, um bloco "Resumo da conversa até aqui". Sem perfil nem resumo, a instrução MUST ser só o texto base.

#### Scenario: Perfil parcial
- **WHEN** o perfil tem só o nome "X" e a cidade "SP"
- **THEN** o bloco de perfil tem exatamente as linhas "Nome: X" e "Cidade: SP"

#### Scenario: Plano pelo nome oficial
- **WHEN** o perfil tem o plano `misto`
- **THEN** o bloco de perfil tem a linha "Plano: Plano Misto", e não "Plano: misto"
