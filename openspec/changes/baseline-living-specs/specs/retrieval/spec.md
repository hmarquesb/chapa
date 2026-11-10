# Spec Delta

## Purpose

Transforma a base de conhecimento em trechos com embedding e recupera, para cada pergunta, os trechos mais relevantes por busca híbrida (semântica e textual), sem nunca misturar vetores de modelos ou fatiamentos diferentes.

## ADDED Requirements

### Requirement: Conjunto de trechos identificado por modelo e fatiamento
O sistema SHALL identificar cada conjunto de trechos pelo par (modelo de embedding, configuração de fatiamento), em que a configuração de fatiamento é `<estratégia>:<tamanho>:<sobreposição>` do preset, por exemplo `markdown:1200:150`. Conjuntos diferentes MUST conviver no banco sem interferir um no outro.

#### Scenario: Dois presets no mesmo banco
- **WHEN** a ingestão roda com o preset `padrao` e depois com o preset `baseline`
- **THEN** o banco guarda os dois conjuntos, cada um com a sua chave, e a ingestão de um não apaga nem altera o outro

### Requirement: Ingestão só dos documentos numerados
A ingestão SHALL usar só os arquivos de `knowledge-base/` cujo nome começa com dois dígitos e um hífen e termina em `.md` (por exemplo `02-repasse-financeiro.md`), em ordem alfabética. Arquivos como `FONTES.md` e `README.md` MUST ficar de fora.

#### Scenario: FONTES.md ignorado
- **WHEN** a pasta tem `01-planos-e-taxas.md`, `02-repasse-financeiro.md` e `FONTES.md`
- **THEN** só os dois arquivos numerados viram trechos

#### Scenario: Nenhum documento numerado
- **WHEN** a pasta não tem nenhum arquivo numerado
- **THEN** a ingestão falha com o erro "Nenhum documento encontrado em knowledge-base/" e não altera o banco

### Requirement: Fatiamento por seção de markdown
Na estratégia `markdown`, o sistema SHALL dividir cada documento pelas seções `## `, descartar a linha `> Fonte:` e as seções vazias, e prefixar cada trecho com o cabeçalho `<Título> — <Seção>` (ou só `<Título>`, para o texto antes da primeira seção). O título é o `# ` do documento ou, sem ele, o nome do arquivo sem extensão.

#### Scenario: Seção curta fica inteira
- **WHEN** uma seção `## Prazos` do documento `# Repasse financeiro` cabe no tamanho do trecho
- **THEN** ela vira um único trecho com a fonte `02-repasse-financeiro.md`, a seção `Prazos` e o conteúdo começando por `Repasse financeiro — Prazos`

#### Scenario: Subtítulos ficam dentro da seção
- **WHEN** uma seção `## ` contém subtítulos `### `
- **THEN** os subtítulos ficam no texto do trecho da seção, sem abrir uma seção nova

### Requirement: Seção longa é dividida em janelas com sobreposição
Quando uma seção passa do tamanho do trecho, o sistema SHALL dividi-la em janelas do tamanho configurado, com a sobreposição configurada, recuando o corte até a última linha em branco (ou, sem ela, o último fim de frase) que estiver nos 20% finais da janela. O conjunto das janelas MUST cobrir o texto inteiro.

#### Scenario: Corte numa linha em branco
- **WHEN** a janela tem uma linha em branco dentro dos seus 20% finais
- **THEN** o trecho termina logo depois dessa linha em branco

#### Scenario: Sobreposição inválida
- **WHEN** a sobreposição é negativa ou maior ou igual ao tamanho
- **THEN** o fatiamento falha com um erro que explica a regra

### Requirement: Fatiamento fixo do preset de comparação
Na estratégia `fixed`, o sistema SHALL cortar o arquivo inteiro em janelas fixas do tamanho e da sobreposição configurados, sem procurar fronteiras, sem cabeçalho e com a seção vazia.

#### Scenario: Arquivo de 1.200 caracteres
- **WHEN** um arquivo de 1.200 caracteres é fatiado com tamanho 500 e sobreposição 100
- **THEN** saem 3 trechos, todos com a seção vazia e sem cabeçalho

### Requirement: Substituição atômica do conjunto
A ingestão SHALL gerar os embeddings de todos os trechos com a tarefa de documento e então substituir, numa única transação, todos os trechos do conjunto (modelo, fatiamento) pelos novos. Se o número de vetores não bater com o de trechos, MUST falhar sem alterar o banco.

#### Scenario: Reingestão
- **WHEN** a ingestão roda de novo com o mesmo preset
- **THEN** os trechos antigos desse conjunto são apagados e os novos inseridos na mesma transação, e o total gravado é informado por arquivo e no geral

#### Scenario: Vetores a menos
- **WHEN** o provedor devolve menos vetores do que trechos
- **THEN** a ingestão falha e nada é substituído

### Requirement: Busca restrita ao conjunto ativo
A busca SHALL gerar o embedding da pergunta com a tarefa de consulta e comparar só com os trechos do conjunto do modelo de embedding e do fatiamento do preset ativo.

#### Scenario: Trechos de outro preset não aparecem
- **WHEN** o banco tem trechos dos presets `padrao` e `baseline` e o preset ativo é `padrao`
- **THEN** nenhum trecho do conjunto `baseline` é candidato

#### Scenario: Embedding vazio
- **WHEN** o provedor devolve o embedding da pergunta vazio
- **THEN** a busca falha com erro, em vez de devolver uma lista vazia

### Requirement: Dois sinais por trecho
Para cada trecho candidato, a busca SHALL calcular o sinal semântico (similaridade de cosseno com a pergunta) e o sinal textual (fração dos termos distintos da pergunta, normalizados em português e sem acentos, presentes no trecho, de 0 a 1), e pré-selecionar até `candidateLimit` candidatos pelo maior dos dois sinais.

#### Scenario: Termo que o embedding não captura
- **WHEN** a pergunta tem um termo que aparece literalmente num trecho com similaridade semântica baixa
- **THEN** o trecho ainda pode entrar entre os candidatos pelo sinal textual

### Requirement: Score híbrido, corte por minScore e topK
O sistema SHALL calcular o score de cada candidato como `alpha × semântico + (1 − alpha) × textual`, descartar os que ficam abaixo do `minScore` (um score igual ao `minScore` passa), ordenar pelo score decrescente, desempatar pelo semântico decrescente e depois pelo identificador crescente, e devolver no máximo `topK` trechos.

#### Scenario: Nada passa do minScore
- **WHEN** nenhum candidato atinge o `minScore`
- **THEN** a busca devolve uma lista vazia

#### Scenario: Empate de score
- **WHEN** dois candidatos têm o mesmo score
- **THEN** vem primeiro o de maior semântico e, se ainda empatar, o de menor identificador

### Requirement: Presets de RAG
O sistema SHALL oferecer dois presets: `padrao`, calibrado e usado em produção, e `baseline`, a configuração ingênua usada só para comparação. Os parâmetros de cada preset (topK, minScore, alpha, candidateLimit, estratégia, tamanho e sobreposição do trecho, reescrita) MUST ficar num único lugar de configuração, e um ajuste inválido MUST ser recusado com uma mensagem que explica o campo.

#### Scenario: Ajuste inválido
- **WHEN** alguém aplica um `alpha` fora do intervalo de 0 a 1 sobre um preset
- **THEN** o sistema recusa com "Configuração de RAG inválida: alpha precisa estar entre 0 e 1 (recebido: …)."
