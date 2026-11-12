## RENAMED Requirements

- FROM: `### Requirement: Conjunto fixo de 50 perguntas`
- TO: `### Requirement: Conjunto fixo de 62 perguntas`

## MODIFIED Requirements

### Requirement: Conjunto fixo de 62 perguntas
O arquivo `eval/perguntas.json` SHALL ter exatamente 62 perguntas: 15 `factual`, 6 `parafrase`, 5 `perfil`, 5 `multi_doc`, 5 `multi_turno`, 7 `fora_de_escopo`, 4 `adversarial`, 3 `bloqueio`, 4 `cumprimento`, 4 `conversa` e 4 `misto`. As cinco primeiras categorias são do escopo (36 perguntas); as três seguintes são de recusa (14 perguntas); as três últimas são de conversa (12 perguntas).

#### Scenario: Distribuição errada
- **WHEN** o arquivo tem 16 perguntas `factual`
- **THEN** a avaliação não roda e informa `Tipo "factual": 16 perguntas; precisam ser 15.`

#### Scenario: Tipo novo reconhecido
- **WHEN** o arquivo tem 4 perguntas do tipo `adversarial` com `esperado` igual a `recusa`
- **THEN** essas perguntas passam na validação de tipo

#### Scenario: Tipos de conversa
- **WHEN** o arquivo tem 4 perguntas `cumprimento` e 4 `conversa` com `esperado` igual a `conversa`, e 4 `misto` com `esperado` igual a `resposta`
- **THEN** essas perguntas passam na validação de tipo

### Requirement: Validação de cada pergunta
Antes de rodar, a avaliação SHALL validar cada pergunta e listar todos os problemas de uma vez. Cada pergunta SHALL ter id inteiro positivo e único, tipo conhecido, `pergunta` (ou `turnos`, com 2 ou mais, só em `multi_turno`), `esperado` coerente com o tipo, `rota_esperada` coerente com o tipo (`cumprimento` no tipo `cumprimento`, `conversa` no tipo `conversa` e `rag` nos outros), `fonte_esperada` com arquivos da base, de 1 a 3 termos em `deve_conter` no escopo, no `cumprimento` e no `misto`, de 1 a 5 em `nao_deve_conter` quando houver, nome no perfil das perguntas `cumprimento`, e uma `nota`. O `perfil`, quando houver, SHALL seguir o cenário "Perfil da pergunta".

#### Scenario: Perfil da pergunta
- **WHEN** uma pergunta tem `perfil`
- **THEN** ele é aceito só no formato v2 e pelas mesmas regras do `PUT /api/profile`, com o plano opcional fora das perguntas `perfil`

#### Scenario: Fonte que não existe
- **WHEN** uma pergunta espera a fonte `12-inexistente.md`
- **THEN** a avaliação não roda e aponta que `fonte_esperada "12-inexistente.md" não existe em knowledge-base/`

#### Scenario: multi_doc com uma fonte só
- **WHEN** uma pergunta `multi_doc` lista um único arquivo em `fonte_esperada`
- **THEN** a avaliação não roda e aponta que `multi_doc` precisa de 2 ou mais arquivos

#### Scenario: Pergunta de perfil sem plano
- **WHEN** uma pergunta `perfil` tem o perfil `{ "version": 2, "name": "Pizzaria Bella" }`
- **THEN** a avaliação não roda e aponta que `perfil` precisa de `perfil.plan` preenchido

#### Scenario: Plano fora da lista
- **WHEN** uma pergunta tem o perfil `{ "version": 2, "plan": "Plano Próprio" }`
- **THEN** a avaliação não roda e aponta que `perfil.plan` precisa ser "proprio", "entrega" ou "misto"

#### Scenario: Perfil no formato antigo
- **WHEN** uma pergunta tem o perfil `{ "plan": "misto", "city": "Campinas" }`
- **THEN** a avaliação não roda e aponta o erro do perfil, com a mesma mensagem do `PUT /api/profile`

#### Scenario: nao_deve_conter vazio
- **WHEN** uma pergunta tem `nao_deve_conter: []`
- **THEN** a avaliação não roda e aponta que `nao_deve_conter` precisa ter de 1 a 5 termos não vazios

#### Scenario: Rota incoerente com o tipo
- **WHEN** uma pergunta `multi_turno` tem `rota_esperada: "conversa"`
- **THEN** a avaliação não roda e aponta que o tipo `multi_turno` precisa de `rota_esperada` "rag"

#### Scenario: Pergunta sem rota
- **WHEN** uma pergunta não tem `rota_esperada`
- **THEN** a avaliação não roda e aponta o campo que falta

#### Scenario: Cumprimento sem nome
- **WHEN** uma pergunta `cumprimento` não tem `perfil.name`
- **THEN** a avaliação não roda e aponta que `cumprimento` precisa de `perfil.name` preenchido

### Requirement: Opções da rodada
A avaliação SHALL exigir um `--label` com letras, números, ponto, hífen ou sublinhado, e aceitar `--preset` (`padrao` por padrão ou `baseline`), `--router` (`on` ou `off`; por padrão `on` no `padrao` e `off` no `baseline`), `--only` com ids existentes, `--delay-ms` entre chamadas (4.000 por padrão), e ajustes de `--top-k`, `--min-score`, `--alpha` e `--no-rewrite` sobre o preset, recusando valores inválidos com uma explicação.

#### Scenario: Só algumas perguntas
- **WHEN** a rodada usa `--only 3,9`
- **THEN** só as perguntas 3 e 9 rodam

#### Scenario: Id desconhecido
- **WHEN** a rodada usa `--only 3,99`
- **THEN** a avaliação não roda e aponta o id 99 como desconhecido

#### Scenario: Roteador desligado no padrão
- **WHEN** a rodada usa `--preset padrao --router off`
- **THEN** só a regra local de cumprimento roda, e o terminal e o arquivo da rodada mostram o roteador desligado

#### Scenario: Valor inválido
- **WHEN** a rodada usa `--router talvez`
- **THEN** a avaliação não roda e explica que `--router` aceita `on` ou `off`

### Requirement: Rodada em blocos
Com `--append`, a avaliação SHALL juntar as perguntas rodadas agora ao `eval/resultados/<label>.json` existente, substituindo as de mesmo id, recalcular as métricas sobre o conjunto e regravar o `.json` e o `.md`. Ela MUST recusar a junção se o preset, os modelos, os parâmetros do RAG ou a configuração do roteador forem diferentes dos da rodada gravada.

#### Scenario: Segundo bloco
- **WHEN** a rodada `v3` já tem as perguntas 101 a 125 e alguém roda `--label v3 --append --only 126,127`
- **THEN** o `v3.json` passa a ter as perguntas 101 a 127, e as métricas são as das 27

#### Scenario: Configuração diferente
- **WHEN** a rodada `v3` foi gravada com `minScore` 0.55 e o bloco novo usa `--min-score 0.5 --append`
- **THEN** a avaliação não roda e explica que a configuração difere da rodada gravada

#### Scenario: Roteador diferente
- **WHEN** a rodada `v4` foi gravada com o roteador ligado e o bloco novo usa `--router off --append`
- **THEN** a avaliação não roda e explica que a configuração difere da rodada gravada

#### Scenario: Pergunta alterada depois do bloco anterior
- **WHEN** o texto da pergunta 110 mudou no `perguntas.json` depois que ela rodou num bloco anterior
- **THEN** o resultado antigo da 110 é descartado na junção, e o terminal lista a 110 como pendente

#### Scenario: Sem rodada anterior
- **WHEN** alguém usa `--append` com um `--label` que ainda não tem arquivo
- **THEN** a avaliação roda normalmente e grava a rodada nova

### Requirement: Comparação entre rodadas
`npm run eval -- --compare <a.json> <b.json> [...]` SHALL imprimir, sem chamar API nem banco, uma tabela com as métricas lado a lado, incluindo as de rota, as médias do juiz quando alguma rodada as tiver e, entre `chunkStrategy`, `chunkSize`, `minScore`, `topK`, `alpha`, `rewriteQuery` e o roteador ligado, só os que mudaram entre as rodadas (`chunkOverlap` e `candidateLimit` não aparecem). Uma rodada gravada antes das métricas de rota MUST aparecer com "—" nelas.

#### Scenario: v1 contra v2
- **WHEN** alguém compara `eval/resultados/v1.json` e `eval/resultados/v2.json`
- **THEN** a tabela mostra as métricas das duas e as linhas `chunkStrategy`, `chunkSize`, `minScore` e `rewriteQuery`, que mudaram, e não mostra `topK` nem `alpha`, que são iguais

#### Scenario: v3 contra v4
- **WHEN** alguém compara `eval/resultados/v3.json` e `eval/resultados/v4.json`
- **THEN** as métricas de rota aparecem com "—" na `v3` e com o valor na `v4`, e a linha do roteador aparece porque mudou

#### Scenario: v4 contra v4-regras
- **WHEN** alguém compara `eval/resultados/v4.json` e `eval/resultados/v4-regras.json`
- **THEN** a tabela mostra lado a lado a latência média das perguntas curtas que foram para o RAG, e a linha do roteador

## ADDED Requirements

### Requirement: Métricas antigas sobre as perguntas de antes
Hit@K, acerto e falsa recusa SHALL continuar calculados só sobre as 36 perguntas do escopo, e a recusa correta só sobre as 14 de recusa. As 12 perguntas de conversa MUST NOT entrar nessas métricas, para a rodada continuar comparável com a `v3`.

#### Scenario: Pergunta mista não entra no acerto antigo
- **WHEN** uma pergunta `misto` termina em `answered` com os termos esperados
- **THEN** ela conta no acerto das mistas e não muda o acerto das 36 perguntas do escopo

### Requirement: Métricas de rota
A avaliação SHALL calcular, sobre o último turno de cada pergunta sem erro e sem bloqueio de entrada: o acerto de rota (rota escolhida igual à `rota_esperada`), o falso small talk (perguntas com `rota_esperada: "rag"` que terminaram em `small_talk`, em número absoluto), as chamadas evitadas (perguntas que terminaram sem busca) e a latência média das perguntas curtas (até o `maxWords` do roteador) que terminaram na rota `rag`.

#### Scenario: Continuação tomada por conversa
- **WHEN** a pergunta `multi_turno` "E se for Pix?" termina em `small_talk`
- **THEN** o falso small talk soma 1, o acerto de rota cai, e o relatório aponta a pergunta

#### Scenario: Bloqueio fora do acerto de rota
- **WHEN** uma pergunta de `bloqueio` termina em `blocked_input`, sem rota
- **THEN** ela não entra no acerto de rota

### Requirement: Acerto das perguntas de conversa
Uma pergunta `cumprimento` SHALL contar como acerto quando termina em `small_talk` com todos os termos de `deve_conter`; uma `conversa`, quando termina em `small_talk`, sem dígito e sem termo de `nao_deve_conter`; uma `misto`, quando termina em `answered` com todos os termos de `deve_conter` e nenhum de `nao_deve_conter`.

#### Scenario: Agradecimento com número
- **WHEN** a pergunta `conversa` "obrigada, ajudou muito" termina em `small_talk` com o texto "De nada! O repasse cai em 7 dias."
- **THEN** ela não conta como acerto, e o relatório aponta o motivo

#### Scenario: Mista com cumprimento retribuído
- **WHEN** a pergunta `misto` "bom dia! quanto é a comissão no Plano Próprio?" tem `deve_conter: ["bom dia", "11%"]` e a resposta é "Bom dia! A comissão do Plano Próprio é de 11%…"
- **THEN** ela conta como acerto

### Requirement: Metas de rota
O relatório SHALL comparar as métricas de rota com as metas: falso small talk igual a 0 e acerto de rota ≥ 95%.

#### Scenario: Um falso small talk
- **WHEN** a rodada tem 1 falso small talk
- **THEN** o relatório mostra a meta de falso small talk não atingida e lista a pergunta
