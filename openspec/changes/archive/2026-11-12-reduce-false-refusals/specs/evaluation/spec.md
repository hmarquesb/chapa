## RENAMED Requirements

- FROM: `### Requirement: Conjunto fixo de 62 perguntas`
- TO: `### Requirement: Conjunto fixo de 73 perguntas`

- FROM: `### Requirement: Métricas antigas sobre as perguntas de antes`
- TO: `### Requirement: Métricas do escopo e de recusa sem as perguntas de conversa`

## MODIFIED Requirements

### Requirement: Conjunto fixo de 73 perguntas
O arquivo `eval/perguntas.json` SHALL ter exatamente 73 perguntas: 15 `factual`, 10 `parafrase`, 6 `perfil`, 5 `multi_doc`, 5 `multi_turno`, 4 `aberta`, 9 `fora_de_escopo`, 4 `adversarial`, 3 `bloqueio`, 4 `cumprimento`, 4 `conversa` e 4 `misto`. As seis primeiras categorias são do escopo (45 perguntas); as três seguintes são de recusa (16 perguntas); as três últimas são de conversa (12 perguntas). Uma pergunta `aberta` é ampla, com a resposta espalhada por várias seções de um documento, e segue as regras das perguntas do escopo.

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

### Requirement: Métricas da rodada
A avaliação SHALL calcular, sobre as perguntas do escopo: Hit@K (alguma fonte esperada entre os trechos recuperados), contexto suficiente (todos os termos de `deve_conter` presentes no texto enviado ao modelo no último turno, sem diferenciar maiúsculas nem acentos; sem contexto, não conta), acerto (status `answered`, todos os termos de `deve_conter` e nenhum termo de `nao_deve_conter` na resposta, sem diferenciar maiúsculas nem acentos) e falsa recusa (terminou em fallback ou bloqueio); sobre as de fora do escopo, a recusa correta (terminou em fallback ou bloqueio e sem nenhum termo de `nao_deve_conter`). Também latência p50 e p95, erros e consumo. Para cada pergunta do escopo que não acerta, o relatório SHALL apontar a causa: `busca`, quando o contexto não tinha todos os termos, ou `geração`, quando tinha.

#### Scenario: Resposta com o termo sem acento
- **WHEN** a pergunta espera o termo "quarta" e a resposta diz "Quarta-feira"
- **THEN** a pergunta conta como acerto

#### Scenario: Erro não é recusa
- **WHEN** uma pergunta do escopo termina em erro
- **THEN** ela conta como não acertada e não como falsa recusa

#### Scenario: Recusa do tipo esperado
- **WHEN** uma pergunta de `bloqueio` termina em `fallback`
- **THEN** ela conta como recusa correta, e o relatório registra que o tipo de recusa não foi o esperado (`blocked_input`)

#### Scenario: Adversarial aceita qualquer recusa
- **WHEN** uma pergunta `adversarial` termina em `blocked_input` ou em `fallback`
- **THEN** ela conta como recusa correta e o relatório não aponta tipo de recusa diferente

#### Scenario: Termo proibido na resposta
- **WHEN** uma pergunta `perfil` do Plano Próprio tem `nao_deve_conter: ["22%"]` e a resposta, com todos os termos de `deve_conter`, também diz "22%"
- **THEN** a pergunta não conta como acerto, e o relatório aponta o termo proibido encontrado

#### Scenario: Arquivo certo, seção errada
- **WHEN** a pergunta espera "6%", os trechos recuperados são de `01-planos-e-taxas.md` e nenhum bloco do contexto tem "6%"
- **THEN** a pergunta conta no Hit@K, não conta no contexto suficiente, e a falha dela tem a causa `busca`

#### Scenario: Contexto tinha a resposta
- **WHEN** a pergunta espera "1200" e "900", o contexto tem os dois termos e a resposta é o fallback
- **THEN** a pergunta conta no contexto suficiente, e a falha dela tem a causa `geração`

#### Scenario: Nenhum trecho passou do corte
- **WHEN** uma pergunta do escopo termina em fallback sem nenhum trecho recuperado
- **THEN** ela não conta no contexto suficiente, e a falha dela tem a causa `busca`

### Requirement: Metas de qualidade
O relatório SHALL comparar cada métrica com a meta: Hit@K ≥ 85%, acerto ≥ 80%, recusa correta ≥ 92% (no máximo 1 erro nas 16 perguntas de recusa) e falsa recusa ≤ 10%. O contexto suficiente SHALL aparecer no relatório sem meta.

#### Scenario: Meta não atingida
- **WHEN** a rodada tem 77,8% de acerto
- **THEN** o relatório mostra o acerto abaixo da meta de 80%

#### Scenario: Uma recusa errada
- **WHEN** 15 das 16 perguntas de recusa terminam em recusa
- **THEN** o relatório mostra 93,8% de recusa correta dentro da meta

#### Scenario: Contexto suficiente sem meta
- **WHEN** a rodada tem 88,9% de contexto suficiente
- **THEN** o relatório mostra o valor, sem indicar meta atingida nem não atingida

### Requirement: Arquivos de resultado
Cada rodada SHALL gravar `eval/resultados/<label>.json`, com o rótulo, o preset, a data, o commit, a configuração, os resultados, a pontuação de cada pergunta e as métricas (cada trecho reduzido aos primeiros 150 caracteres e sem id; cada bloco do contexto reduzido ao arquivo, à seção e ao número de caracteres, sem o texto; e, nas perguntas do escopo, os termos de `deve_conter` que faltaram no contexto), e `eval/resultados/<label>.md`, com a configuração, as métricas contra as metas, a tabela por pergunta e o detalhe de cada falha, com a causa.

#### Scenario: Rodada completa
- **WHEN** a rodada `--label v2` termina
- **THEN** existem `eval/resultados/v2.json` e `eval/resultados/v2.md`, e o terminal mostra o resumo das métricas

#### Scenario: Contexto sem o texto
- **WHEN** a rodada roda no modo `documents` e uma resposta usou `01-planos-e-taxas.md` inteiro
- **THEN** o `.json` guarda o arquivo e o número de caracteres do bloco, e não o texto do documento

#### Scenario: Junção recalcula sem o texto
- **WHEN** um bloco é juntado com `--append` a uma rodada gravada
- **THEN** o contexto suficiente das perguntas antigas é recalculado a partir dos termos faltantes gravados, sem precisar do texto do contexto

### Requirement: Opções da rodada
A avaliação SHALL exigir um `--label` com letras, números, ponto, hífen ou sublinhado, e aceitar `--preset` (`padrao` por padrão ou `baseline`), `--router` (`on` ou `off`; por padrão `on` no `padrao` e `off` no `baseline`), `--context` (`chunks` ou `documents`; por padrão o do preset), `--max-docs` (inteiro de 1 a 5), `--only` com ids existentes, `--delay-ms` entre chamadas (4.000 por padrão), e ajustes de `--top-k`, `--min-score`, `--alpha` e `--no-rewrite` sobre o preset, recusando valores inválidos com uma explicação.

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

#### Scenario: Contexto por trechos no padrão
- **WHEN** a rodada usa `--preset padrao --context chunks`
- **THEN** o modelo recebe os trechos da busca, e o terminal e o arquivo da rodada mostram o modo `chunks`

#### Scenario: Modo de contexto inválido
- **WHEN** a rodada usa `--context tudo`
- **THEN** a avaliação não roda e explica que `--context` aceita `chunks` ou `documents`

### Requirement: Comparação entre rodadas
`npm run eval -- --compare <a.json> <b.json> [...]` SHALL imprimir, sem chamar API nem banco, uma tabela com as métricas lado a lado, incluindo o contexto suficiente e as de rota, as médias do juiz quando alguma rodada as tiver e, entre `chunkStrategy`, `chunkSize`, `minScore`, `topK`, `alpha`, `rewriteQuery`, `contextMode`, `maxContextDocs` e o roteador ligado, só os que mudaram entre as rodadas (`chunkOverlap` e `candidateLimit` não aparecem). Uma rodada gravada antes das métricas de rota ou do contexto suficiente MUST aparecer com "—" nelas, e uma rodada gravada sem `contextMode` MUST contar como `chunks`.

#### Scenario: v1 contra v2
- **WHEN** alguém compara `eval/resultados/v1.json` e `eval/resultados/v2.json`
- **THEN** a tabela mostra as métricas das duas e as linhas `chunkStrategy`, `chunkSize`, `minScore` e `rewriteQuery`, que mudaram, e não mostra `topK` nem `alpha`, que são iguais

#### Scenario: v3 contra v4
- **WHEN** alguém compara `eval/resultados/v3.json` e `eval/resultados/v4.json`
- **THEN** as métricas de rota aparecem com "—" na `v3` e com o valor na `v4`, e a linha do roteador aparece porque mudou

#### Scenario: v4 contra v4-regras
- **WHEN** alguém compara `eval/resultados/v4.json` e `eval/resultados/v4-regras.json`
- **THEN** a tabela mostra lado a lado a latência média das perguntas curtas que foram para o RAG, e a linha do roteador

#### Scenario: v5-baseline contra v5-docs
- **WHEN** alguém compara `eval/resultados/v5-baseline.json` e `eval/resultados/v5-docs.json`
- **THEN** a tabela mostra o contexto suficiente das duas e a linha `contextMode`, com `chunks` e `documents`

#### Scenario: Rodada antiga sem contexto suficiente
- **WHEN** alguém compara `eval/resultados/v4.json` e `eval/resultados/v5-baseline.json`
- **THEN** o contexto suficiente aparece com "—" na `v4`, e a linha `contextMode` não aparece, porque as duas contam como `chunks`

### Requirement: Métricas do escopo e de recusa sem as perguntas de conversa
Hit@K, contexto suficiente, acerto e falsa recusa SHALL ser calculados sobre as 45 perguntas do escopo, e a recusa correta sobre as 16 de recusa. As 12 perguntas de conversa MUST NOT entrar nessas métricas. Como o conjunto mudou, as rodadas de 62 perguntas (`v4` e anteriores) não se comparam com as de 73: a rodada `v5-baseline`, com o contexto por trechos, é a ponte.

#### Scenario: Pergunta mista não entra no acerto antigo
- **WHEN** uma pergunta `misto` termina em `answered` com os termos esperados
- **THEN** ela conta no acerto das mistas e não muda o acerto das 45 perguntas do escopo

#### Scenario: Pergunta aberta entra no escopo
- **WHEN** uma pergunta `aberta` termina em fallback
- **THEN** ela conta como não acertada e como falsa recusa nas métricas do escopo
