# Spec Delta

## Purpose

Mede a qualidade do assistente com um conjunto fixo de perguntas, rodado pelo mesmo fluxo da API, para comparar presets e mudanças com números reproduzíveis e metas explícitas.

## ADDED Requirements

### Requirement: Conjunto fixo de 20 perguntas
O arquivo `eval/perguntas.json` SHALL ter exatamente 20 perguntas: 7 `factual`, 3 `parafrase`, 2 `multi_turno`, 2 `multi_doc`, 4 `fora_de_escopo` e 2 `bloqueio`. As quatro primeiras categorias são do escopo; as duas últimas, não.

#### Scenario: Distribuição errada
- **WHEN** o arquivo tem 8 perguntas `factual`
- **THEN** a avaliação não roda e informa `Tipo "factual": 8 perguntas; precisam ser 7.`

### Requirement: Validação de cada pergunta
Antes de rodar, a avaliação SHALL validar cada pergunta e listar todos os problemas de uma vez: id inteiro positivo e único, tipo conhecido, `pergunta` ou `turnos` (só `multi_turno`, com 2 ou mais), `esperado` coerente com o tipo, `fonte_esperada` com arquivos que existem na base, de 1 a 3 termos em `deve_conter` no escopo, perfil só com campos conhecidos e uma `nota`.

#### Scenario: Fonte que não existe
- **WHEN** uma pergunta espera a fonte `09-inexistente.md`
- **THEN** a avaliação não roda e aponta que `fonte_esperada "09-inexistente.md" não existe em knowledge-base/`

#### Scenario: multi_doc com uma fonte só
- **WHEN** uma pergunta `multi_doc` lista um único arquivo em `fonte_esperada`
- **THEN** a avaliação não roda e aponta que `multi_doc` precisa de 2 ou mais arquivos

### Requirement: Mesmo fluxo da API, uma sessão por pergunta
Cada pergunta SHALL rodar numa sessão nova do canal `eval`, pelo mesmo fluxo do assistente que a API usa, com o perfil da pergunta quando houver. Nas perguntas `multi_turno`, os turnos são enviados em sequência e só a resposta do último é avaliada.

#### Scenario: Pergunta de vários turnos
- **WHEN** a pergunta tem os turnos "Qual a comissão do Plano Básico?" e "E no outro plano?"
- **THEN** os dois turnos rodam na mesma sessão e só a resposta do segundo conta

### Requirement: Mesmo conjunto de trechos na ingestão e na rodada
A avaliação SHALL usar o conjunto de trechos do preset escolhido e MUST parar com uma explicação se esse conjunto estiver vazio no banco, pedindo para rodar a ingestão do mesmo preset.

#### Scenario: Preset sem ingestão
- **WHEN** a rodada usa o preset `baseline` e não há trechos desse conjunto
- **THEN** a avaliação para antes da primeira pergunta e sugere `npm run ingest -- --preset baseline`

### Requirement: Métricas da rodada
A avaliação SHALL calcular, sobre as perguntas do escopo: Hit@K (alguma fonte esperada entre os trechos recuperados), acerto (status `answered` e todos os termos de `deve_conter` na resposta, sem diferenciar maiúsculas nem acentos) e falsa recusa (terminou em fallback ou bloqueio); sobre as de fora do escopo, a recusa correta (terminou em fallback ou bloqueio). Também latência p50 e p95, erros e consumo.

#### Scenario: Resposta com o termo sem acento
- **WHEN** a pergunta espera o termo "quarta" e a resposta diz "Quarta-feira"
- **THEN** a pergunta conta como acerto

#### Scenario: Erro não é recusa
- **WHEN** uma pergunta do escopo termina em erro
- **THEN** ela conta como não acertada e não como falsa recusa

#### Scenario: Recusa do tipo esperado
- **WHEN** uma pergunta de `bloqueio` termina em `fallback`
- **THEN** ela conta como recusa correta, e o relatório registra que o tipo de recusa não foi o esperado (`blocked_input`)

### Requirement: Metas de qualidade
O relatório SHALL comparar cada métrica com a meta: Hit@K ≥ 85%, acerto ≥ 80%, recusa correta = 100% e falsa recusa ≤ 10%.

#### Scenario: Meta não atingida
- **WHEN** a rodada tem 78,6% de acerto
- **THEN** o relatório mostra o acerto abaixo da meta de 80%

### Requirement: Arquivos de resultado
Cada rodada SHALL gravar `eval/resultados/<label>.json`, com o preset, a data, o commit, a configuração, os resultados, as notas por pergunta e as métricas (cada trecho reduzido aos primeiros 150 caracteres e sem id), e `eval/resultados/<label>.md`, com a configuração, as métricas contra as metas, a tabela por pergunta e o detalhe de cada falha.

#### Scenario: Rodada completa
- **WHEN** a rodada `--label v2` termina
- **THEN** existem `eval/resultados/v2.json` e `eval/resultados/v2.md`, e o terminal mostra o resumo das métricas

### Requirement: Opções da rodada
A avaliação SHALL exigir um `--label` com letras, números, ponto, hífen ou sublinhado, e aceitar `--preset` (`padrao` por padrão ou `baseline`), `--only` com ids existentes, `--delay-ms` entre chamadas (4.000 por padrão), e ajustes de `--top-k`, `--min-score`, `--alpha` e `--no-rewrite` sobre o preset, recusando valores inválidos com uma explicação.

#### Scenario: Só algumas perguntas
- **WHEN** a rodada usa `--only 3,9`
- **THEN** só as perguntas 3 e 9 rodam

#### Scenario: Id desconhecido
- **WHEN** a rodada usa `--only 3,99`
- **THEN** a avaliação não roda e aponta o id 99 como desconhecido

### Requirement: Intervalo entre chamadas
A avaliação SHALL esperar o intervalo configurado antes de cada chamada ao assistente ou ao juiz, menos a primeira da rodada, para respeitar o limite por minuto do plano gratuito.

#### Scenario: Turnos de uma pergunta
- **WHEN** uma pergunta tem dois turnos e o intervalo é de 4.000 ms
- **THEN** há uma espera de 4.000 ms entre os dois turnos

### Requirement: Parada por cota com resultado parcial
Uma pergunta que falha SHALL ficar registrada com o nome do erro, e a rodada segue. Depois de 3 erros de cota seguidos, a rodada MUST parar, gravar o parcial e sair com código 2, sugerindo esperar e continuar com `--only`.

#### Scenario: Cota acaba no meio
- **WHEN** as perguntas 9, 10 e 11 falham por cota
- **THEN** a rodada para depois da 11, grava os arquivos com as 11 perguntas e sai com código 2

### Requirement: Juiz opcional
Com `--judge`, a avaliação SHALL pedir ao modelo rápido notas inteiras de 1 a 5 de corretude e fidelidade, só para as respostas com o status `answered`, e mostrar as médias. Uma nota que não vem em JSON válido ou uma falha do juiz MUST deixar a pergunta sem nota, sem parar a rodada.

#### Scenario: Juiz devolve texto livre
- **WHEN** o juiz responde sem JSON válido
- **THEN** a pergunta fica sem nota e a rodada continua

#### Scenario: Rodada sem juiz
- **WHEN** a rodada não usa `--judge`
- **THEN** o resultado não tem o campo de médias do juiz

### Requirement: Comparação entre rodadas
`npm run eval -- --compare <a.json> <b.json> [...]` SHALL imprimir, sem chamar API nem banco, uma tabela com as métricas lado a lado, as médias do juiz quando alguma rodada as tiver e só os parâmetros do RAG que mudaram entre as rodadas.

#### Scenario: v1 contra v2
- **WHEN** alguém compara `eval/resultados/v1.json` e `eval/resultados/v2.json`
- **THEN** a tabela mostra as métricas das duas e as linhas `chunkStrategy`, `chunkSize`, `minScore` e `rewriteQuery`, que mudaram

### Requirement: Sem segredos na saída
A avaliação SHALL mostrar só o host do banco, nunca a URL de conexão, e, em erro, só o nome e a mensagem do erro, nunca variáveis de ambiente.

#### Scenario: Início da rodada
- **WHEN** a rodada começa
- **THEN** o terminal mostra o host do banco, o preset, o conjunto de trechos, os parâmetros do RAG e os modelos, sem usuário nem senha
