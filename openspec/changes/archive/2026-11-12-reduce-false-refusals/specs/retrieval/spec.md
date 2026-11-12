## ADDED Requirements

### Requirement: Contexto por documento
No modo de contexto `documents`, o sistema SHALL escolher os arquivos dos trechos devolvidos pela busca, na ordem do melhor score de cada arquivo, até `maxContextDocs` arquivos, e montar o contexto com cada um desses documentos inteiro. Cada documento SHALL ser remontado com todos os trechos dele no conjunto ativo, na ordem em que foram gravados, separados por uma linha em branco.

#### Scenario: Três trechos de dois arquivos
- **WHEN** a busca devolve, nessa ordem de score, trechos de `01-planos-e-taxas.md`, `02-repasse-financeiro.md` e `01-planos-e-taxas.md`, e o modo é `documents`
- **THEN** o contexto tem dois blocos, `01-planos-e-taxas.md` e depois `02-repasse-financeiro.md`, cada um com todas as seções do documento

#### Scenario: Mais arquivos que o limite
- **WHEN** a busca devolve trechos de 4 arquivos diferentes e `maxContextDocs` é 3
- **THEN** o contexto tem os 3 arquivos de melhor score, e o quarto fica de fora

#### Scenario: Seção que a busca não achou
- **WHEN** a busca devolve só a seção "Os três planos" de `01-planos-e-taxas.md`
- **THEN** o contexto traz também a seção "Retirada no balcão" do mesmo documento

#### Scenario: Trechos de outro preset não entram
- **WHEN** o banco tem `01-planos-e-taxas.md` nos conjuntos `padrao` e `baseline` e o preset ativo é `padrao`
- **THEN** o documento é remontado só com os trechos do conjunto `padrao`

#### Scenario: Documento sem trechos na releitura
- **WHEN** a releitura de um arquivo escolhido não devolve nenhum trecho
- **THEN** o bloco desse arquivo é montado com os trechos dele que a busca devolveu

### Requirement: Contexto por trechos
No modo de contexto `chunks`, ou quando a busca não devolve nenhum trecho, o contexto SHALL ser a lista de trechos devolvida pela busca, e o sistema MUST NOT fazer a consulta de releitura dos documentos.

#### Scenario: Modo chunks
- **WHEN** o modo de contexto é `chunks`
- **THEN** o contexto são os trechos da busca, na ordem do score, e nenhuma consulta de releitura é feita

#### Scenario: Busca vazia
- **WHEN** nenhum trecho passa do `minScore`
- **THEN** o contexto é vazio nos dois modos, e nenhuma consulta de releitura é feita

## MODIFIED Requirements

### Requirement: Presets de RAG
O sistema SHALL oferecer dois presets: `padrao`, calibrado e usado em produção, e `baseline`, a configuração ingênua usada só para comparação. Os parâmetros de cada preset (topK, minScore, alpha, candidateLimit, estratégia, tamanho e sobreposição do trecho, reescrita, modo de contexto e máximo de documentos no contexto) MUST ficar num único lugar de configuração, e um ajuste inválido MUST ser recusado com uma mensagem que explica o campo. O modo de contexto e o máximo de documentos MUST NOT entrar na chave do conjunto de trechos.

#### Scenario: Ajuste inválido
- **WHEN** alguém aplica um `alpha` fora do intervalo de 0 a 1 sobre um preset
- **THEN** o sistema recusa com "Configuração de RAG inválida: alpha precisa estar entre 0 e 1 (recebido: …)."

#### Scenario: Máximo de documentos inválido
- **WHEN** alguém aplica `maxContextDocs` igual a 0 sobre um preset
- **THEN** o sistema recusa com "Configuração de RAG inválida: maxContextDocs precisa ser um inteiro de 1 a 5 (recebido: 0)."

#### Scenario: Modo de contexto não muda o conjunto
- **WHEN** o preset `padrao` é usado com o modo `chunks` e depois com o modo `documents`
- **THEN** as duas buscas usam o mesmo conjunto de trechos, sem reingestão
