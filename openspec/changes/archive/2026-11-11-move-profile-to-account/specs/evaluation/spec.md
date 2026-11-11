# Spec Delta

## MODIFIED Requirements

### Requirement: Validação de cada pergunta
Antes de rodar, a avaliação SHALL validar cada pergunta e listar todos os problemas de uma vez. Cada pergunta SHALL ter id inteiro positivo e único, tipo conhecido, `pergunta` (ou `turnos`, com 2 ou mais, só em `multi_turno`), `esperado` coerente com o tipo, `fonte_esperada` com arquivos da base, de 1 a 3 termos em `deve_conter` no escopo, de 1 a 5 em `nao_deve_conter` quando houver, perfil só com campos conhecidos (com o plano no tipo `perfil`, sempre `proprio`, `entrega` ou `misto`) e uma `nota`.

#### Scenario: Fonte que não existe
- **WHEN** uma pergunta espera a fonte `12-inexistente.md`
- **THEN** a avaliação não roda e aponta que `fonte_esperada "12-inexistente.md" não existe em knowledge-base/`

#### Scenario: multi_doc com uma fonte só
- **WHEN** uma pergunta `multi_doc` lista um único arquivo em `fonte_esperada`
- **THEN** a avaliação não roda e aponta que `multi_doc` precisa de 2 ou mais arquivos

#### Scenario: Pergunta de perfil sem plano
- **WHEN** uma pergunta `perfil` tem o perfil `{ "name": "Pizzaria Bella" }`
- **THEN** a avaliação não roda e aponta que `perfil` precisa de `perfil.plan` preenchido

#### Scenario: Plano fora da lista
- **WHEN** uma pergunta tem o perfil `{ "plan": "Plano Próprio" }`
- **THEN** a avaliação não roda e aponta que `perfil.plan` precisa ser "proprio", "entrega" ou "misto"

#### Scenario: nao_deve_conter vazio
- **WHEN** uma pergunta tem `nao_deve_conter: []`
- **THEN** a avaliação não roda e aponta que `nao_deve_conter` precisa ter de 1 a 5 termos não vazios
