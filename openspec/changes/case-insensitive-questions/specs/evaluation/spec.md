## RENAMED Requirements

- FROM: `### Requirement: Conjunto fixo de 73 perguntas`
- TO: `### Requirement: Conjunto fixo de 74 perguntas`

## MODIFIED Requirements

### Requirement: Conjunto fixo de 74 perguntas
O arquivo `eval/perguntas.json` SHALL ter exatamente 74 perguntas: 15 `factual`, 11 `parafrase`, 6 `perfil`, 5 `multi_doc`, 5 `multi_turno`, 4 `aberta`, 9 `fora_de_escopo`, 4 `adversarial`, 3 `bloqueio`, 4 `cumprimento`, 4 `conversa` e 4 `misto`. As seis primeiras categorias são do escopo (46 perguntas), as três seguintes de recusa (16) e as três últimas de conversa (12).

#### Scenario: Distribuição errada
- **WHEN** o arquivo tem 16 perguntas `factual`
- **THEN** a avaliação não roda e informa `Tipo "factual": 16 perguntas; precisam ser 15.`

#### Scenario: Tipo novo reconhecido
- **WHEN** o arquivo tem 4 perguntas do tipo `adversarial` com `esperado` igual a `recusa`
- **THEN** essas perguntas passam na validação de tipo

#### Scenario: Tipos de conversa
- **WHEN** o arquivo tem 4 perguntas `cumprimento` e 4 `conversa` com `esperado` igual a `conversa`, e 4 `misto` com `esperado` igual a `resposta`
- **THEN** essas perguntas passam na validação de tipo

#### Scenario: Tipo aberta
- **WHEN** o arquivo tem 4 perguntas `aberta` com `esperado` igual a `resposta`, `rota_esperada` igual a `rag`, `fonte_esperada` e `deve_conter`
- **THEN** essas perguntas passam na validação de tipo e contam como perguntas do escopo

#### Scenario: Aberta sem termos
- **WHEN** uma pergunta `aberta` não tem `deve_conter`
- **THEN** a avaliação não roda e aponta que `deve_conter` precisa ter de 1 a 3 termos não vazios

#### Scenario: Paráfrase com a grafia em minúsculas
- **WHEN** o conjunto é carregado
- **THEN** ele tem a pergunta 164 ("Como falo com o Financeiro?") e a 174, uma `parafrase` com a mesma dúvida em minúsculas ("como falo com o financeiro?"), as duas com `09-suporte-e-chamados.md` na `fonte_esperada`

### Requirement: Métricas do escopo e de recusa sem as perguntas de conversa
Hit@K, contexto suficiente, acerto e falsa recusa SHALL ser calculados sobre as 46 perguntas do escopo, e a recusa correta sobre as 16 de recusa. As 12 perguntas de conversa MUST NOT entrar nessas métricas. Como o conjunto mudou, as rodadas de 62 perguntas (`v4` e anteriores) não se comparam com as de 73: a rodada `v5-baseline`, com o contexto por trechos, é a ponte. As rodadas de 73 e de 74 perguntas se comparam, sabendo que as de 74 têm uma pergunta a mais no escopo (174).

#### Scenario: Pergunta mista não entra no acerto antigo
- **WHEN** uma pergunta `misto` termina em `answered` com os termos esperados
- **THEN** ela conta no acerto das mistas e não muda o acerto das 46 perguntas do escopo

#### Scenario: Pergunta aberta entra no escopo
- **WHEN** uma pergunta `aberta` termina em fallback
- **THEN** ela conta como não acertada e como falsa recusa nas métricas do escopo
