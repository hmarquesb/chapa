# evaluation Specification

## Purpose
Mede a qualidade do assistente com um conjunto fixo de perguntas, rodado pelo mesmo fluxo da API, para comparar presets e mudanças com números reproduzíveis e metas explícitas.

## Requirements

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

### Requirement: Validação de cada pergunta
Antes de rodar, a avaliação SHALL validar cada pergunta e listar todos os problemas de uma vez: id único, tipo conhecido, `pergunta` (ou `turnos`, só em `multi_turno`), `esperado`, `rota_esperada` e `fonte_esperada` coerentes com o tipo e a base, `deve_conter` (1 a 3 termos, obrigatório no escopo, no `cumprimento` e no `misto`), `nao_deve_conter` (1 a 5, quando houver), nome no perfil do `cumprimento` e uma `nota`. O `perfil`, quando houver, SHALL seguir o cenário "Perfil da pergunta".

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

### Requirement: Pergunta factual para cada documento
O conjunto SHALL ter pelo menos uma pergunta `factual` para cada documento da base, e a validação SHALL apontar o documento que ficar sem nenhuma.

#### Scenario: Documento sem pergunta factual
- **WHEN** nenhuma pergunta `factual` tem `11-pagamentos-e-fiscal.md` na `fonte_esperada`
- **THEN** a avaliação não roda e aponta `Documento "11-pagamentos-e-fiscal.md" sem pergunta factual.`

### Requirement: Mesmo fluxo da API, uma sessão por pergunta
Cada pergunta SHALL rodar numa sessão nova do canal `eval`, pelo mesmo fluxo do assistente que a API usa, com o perfil da pergunta quando houver. Nas perguntas `multi_turno`, os turnos são enviados em sequência e só a resposta do último é avaliada.

#### Scenario: Pergunta de vários turnos
- **WHEN** a pergunta tem os turnos "Meu restaurante faz a própria entrega." e "Como funciona a comissão nesse caso?"
- **THEN** os dois turnos rodam na mesma sessão e só a resposta do segundo conta

### Requirement: Mesmo conjunto de trechos na ingestão e na rodada
A avaliação SHALL usar o conjunto de trechos do preset escolhido e MUST parar com uma explicação se esse conjunto estiver vazio no banco, pedindo para rodar a ingestão do mesmo preset.

#### Scenario: Preset sem ingestão
- **WHEN** a rodada usa o preset `baseline` e não há trechos desse conjunto
- **THEN** a avaliação para antes da primeira pergunta e sugere `npm run ingest -- --preset baseline`

### Requirement: Métricas da rodada
A avaliação SHALL calcular, sobre as perguntas do escopo: Hit@K, contexto suficiente (todos os termos de `deve_conter` no texto enviado ao modelo no último turno), acerto e falsa recusa; sobre as de fora do escopo, a recusa correta. Também latência p50 e p95, erros e consumo. Para cada pergunta do escopo que não acerta, o relatório SHALL apontar a causa: `busca` ou `geração`.

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

#### Scenario: Definição das métricas
- **WHEN** a avaliação pontua uma pergunta, sem diferenciar maiúsculas nem acentos
- **THEN** Hit@K pede alguma fonte esperada entre os trechos recuperados, o acerto pede status `answered`, todos os termos de `deve_conter` e nenhum de `nao_deve_conter` na resposta, a falsa recusa é fallback ou bloqueio, e a recusa correta é fallback ou bloqueio sem nenhum termo de `nao_deve_conter`

#### Scenario: Causa da falha
- **WHEN** uma pergunta do escopo não acerta
- **THEN** a causa é `busca` se o contexto não tinha todos os termos de `deve_conter`, e `geração` se tinha

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
Cada rodada SHALL gravar `eval/resultados/<label>.json`, com o rótulo, o preset, a data, o commit, a configuração, os resultados, a pontuação de cada pergunta e as métricas, e `eval/resultados/<label>.md`, com a configuração, as métricas contra as metas, a tabela por pergunta e o detalhe de cada falha, com a causa. No `.json`, cada trecho SHALL ser reduzido aos primeiros 150 caracteres e sem id, e cada bloco do contexto ao arquivo, à seção e ao número de caracteres.

#### Scenario: Rodada completa
- **WHEN** a rodada `--label v2` termina
- **THEN** existem `eval/resultados/v2.json` e `eval/resultados/v2.md`, e o terminal mostra o resumo das métricas

#### Scenario: Termos faltantes gravados
- **WHEN** a rodada tem uma pergunta do escopo
- **THEN** o `.json` guarda os termos de `deve_conter` que faltaram no contexto

#### Scenario: Contexto sem o texto
- **WHEN** a rodada roda no modo `documents` e uma resposta usou `01-planos-e-taxas.md` inteiro
- **THEN** o `.json` guarda o arquivo e o número de caracteres do bloco, e não o texto do documento

#### Scenario: Junção recalcula sem o texto
- **WHEN** um bloco é juntado com `--append` a uma rodada gravada
- **THEN** o contexto suficiente das perguntas antigas é recalculado a partir dos termos faltantes gravados, sem precisar do texto do contexto

### Requirement: Opções da rodada
A avaliação SHALL exigir um `--label` com letras, números, ponto, hífen ou sublinhado, e aceitar `--preset` (`padrao` por padrão ou `baseline`), `--router` (`on` ou `off`), `--context` (`chunks` ou `documents`), `--max-docs` (inteiro de 1 a 5), `--only` com ids existentes, `--delay-ms` (4.000 por padrão) e ajustes de `--top-k`, `--min-score`, `--alpha` e `--no-rewrite`, recusando valores inválidos com uma explicação.

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

#### Scenario: Padrões das opções
- **WHEN** `--router` e `--context` não são passados
- **THEN** o roteador fica `on` no `padrao` e `off` no `baseline`, e o contexto é o do preset

#### Scenario: Contexto por trechos no padrão
- **WHEN** a rodada usa `--preset padrao --context chunks`
- **THEN** o modelo recebe os trechos da busca, e o terminal e o arquivo da rodada mostram o modo `chunks`

#### Scenario: Modo de contexto inválido
- **WHEN** a rodada usa `--context tudo`
- **THEN** a avaliação não roda e explica que `--context` aceita `chunks` ou `documents`

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
`npm run eval -- --compare <a.json> <b.json> [...]` SHALL imprimir, sem chamar API nem banco, uma tabela com as métricas lado a lado (incluindo contexto suficiente, rota e as médias do juiz, quando houver) e só os parâmetros que mudaram entre as rodadas, entre eles `contextMode` e `maxContextDocs`. Métricas ausentes numa rodada antiga MUST aparecer com "—", e uma rodada sem `contextMode` MUST contar como `chunks`.

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

### Requirement: Sem segredos na saída
A avaliação SHALL mostrar só o host do banco, nunca a URL de conexão, e, em erro, só o nome e a mensagem do erro, nunca variáveis de ambiente.

#### Scenario: Início da rodada
- **WHEN** a rodada começa
- **THEN** o terminal mostra o host do banco, o preset, o conjunto de trechos, os parâmetros do RAG e os modelos, sem usuário nem senha

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

### Requirement: Termos esperados vêm do regras.yaml
Todo termo de `deve_conter` que contém um número com unidade reconhecida (`%`, `R$`, minutos, horas, dias, dias úteis, km, MB, px) SHALL existir com o mesmo valor e a mesma unidade no `knowledge-base/regras.yaml`, conferido por teste automatizado sem rede.

#### Scenario: Termo com número inventado
- **WHEN** uma pergunta tem `deve_conter: ["12%"]` e nenhuma chave `_pct` do `regras.yaml` vale 12
- **THEN** o teste falha apontando a pergunta e o termo "12%"

### Requirement: Métricas do escopo e de recusa sem as perguntas de conversa
Hit@K, contexto suficiente, acerto e falsa recusa SHALL ser calculados sobre as 46 perguntas do escopo, e a recusa correta sobre as 16 de recusa. As 12 perguntas de conversa MUST NOT entrar nessas métricas. Como o conjunto mudou, as rodadas de 62 perguntas (`v4` e anteriores) não se comparam com as de 73: a rodada `v5-baseline`, com o contexto por trechos, é a ponte. As rodadas de 73 e de 74 perguntas se comparam, sabendo que as de 74 têm uma pergunta a mais no escopo (174).

#### Scenario: Pergunta mista não entra no acerto antigo
- **WHEN** uma pergunta `misto` termina em `answered` com os termos esperados
- **THEN** ela conta no acerto das mistas e não muda o acerto das 46 perguntas do escopo

#### Scenario: Pergunta aberta entra no escopo
- **WHEN** uma pergunta `aberta` termina em fallback
- **THEN** ela conta como não acertada e como falsa recusa nas métricas do escopo

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
