# answer-generation Specification

## Purpose
Monta a resposta de cada turno só com base nos trechos recuperados: decide entre responder, cair no fallback ou barrar, escolhe as fontes que a interface mostra e trata as falhas do provedor de LLM.

## Requirements

### Requirement: Ordem de um turno
O sistema SHALL processar cada mensagem nesta ordem: guardrail de entrada, sessão e perfil, histórico e resumo, reescrita da pergunta, uma única busca, geração, guardrail de saída e gravação do turno. A API, a CLI e a avaliação MUST usar o mesmo fluxo.

#### Scenario: Mesmo fluxo nos três canais
- **WHEN** a mesma pergunta chega pelos canais `web`, `cli` e `eval`, com a mesma configuração
- **THEN** as três passam pelos mesmos passos e só o canal gravado na sessão muda

### Requirement: Fallback sem chamar o LLM de resposta
Quando a busca não devolve nenhum trecho acima do `minScore`, o sistema SHALL responder com a mensagem de fallback, com o status `fallback` e sem fontes, sem chamar o modelo de resposta.

#### Scenario: Pergunta fora da base
- **WHEN** o parceiro pergunta "Me passa uma receita de lasanha?" e nenhum trecho passa do `minScore`
- **THEN** a resposta é "Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.", com o status `fallback`, sem fontes e sem chamada ao modelo de resposta

### Requirement: Texto único do fallback
A mensagem de fallback SHALL ser sempre "Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.", definida num único lugar e usada tanto na resposta direta quanto nas instruções enviadas ao modelo.

#### Scenario: Instrução usa o mesmo texto
- **WHEN** o sistema monta as instruções do modelo
- **THEN** elas pedem para responder exatamente com o texto do fallback quando a resposta não estiver no contexto

### Requirement: Instrução de sistema
A instrução de sistema SHALL apresentar o assistente como o Chapa, o assistente de parceiros da Rango, para restaurantes que já são parceiros, listar os temas da base e exigir: PT-BR simples e cordial em até 150 palavras, passo a passo numerado para procedimentos, resposta só com base no contexto sem inventar números, prazos, valores, planos ou telas, nada de dados sensíveis, nenhuma ação executada, nenhuma lista de fontes no texto e o fallback exato fora do escopo.

#### Scenario: Cadastro de novo restaurante
- **WHEN** a pergunta é sobre como se cadastrar como novo restaurante
- **THEN** a instrução de sistema manda responder com o fallback exato

#### Scenario: Assistente da Rango
- **WHEN** o sistema monta a instrução de sistema
- **THEN** ela diz que o Chapa é o assistente de parceiros da Rango e não cita "app de delivery" nem "Portal do Parceiro"

#### Scenario: Temas da base
- **WHEN** o sistema monta a instrução de sistema
- **THEN** ela lista os temas da base: planos e taxas, repasse, cancelamentos e contestações, cardápio e fotos, horários e pausas, avaliações, embalagem e entrega, promoções e cupons, suporte e chamados, conta e segurança, pagamentos e notas fiscais

### Requirement: Perfil e resumo na instrução de sistema
O sistema SHALL acrescentar à instrução de sistema um bloco "Perfil do restaurante" com uma linha `Rótulo: valor` por campo preenchido (Nome, Plano, Cozinha, Cidade, Horário, nessa ordem, com os valores aparados) e, se houver, um bloco "Resumo da conversa até aqui". Sem perfil nem resumo, a instrução MUST ser só o texto base.

#### Scenario: Perfil parcial
- **WHEN** o perfil tem só o nome "X" e a cidade "SP"
- **THEN** o bloco de perfil tem exatamente as linhas "Nome: X" e "Cidade: SP"

### Requirement: Contexto rotulado por fonte
A mensagem enviada ao modelo SHALL trazer as instruções de resposta, dois exemplos fictícios (um respondido pelo contexto e um que cai no fallback), os trechos recuperados separados por `---`, cada um rotulado `[Fonte: <arquivo> › <seção>]` (ou `[Fonte: <arquivo>]`, sem seção), e por último a pergunta original do parceiro.

#### Scenario: Trecho sem seção
- **WHEN** um trecho recuperado não tem seção
- **THEN** o rótulo dele é `[Fonte: <arquivo>]`

#### Scenario: Pergunta original, não a reescrita
- **WHEN** a pergunta foi reescrita para a busca
- **THEN** a mensagem enviada ao modelo termina com a pergunta original do parceiro

### Requirement: Histórico recente na geração
O sistema SHALL enviar ao modelo de resposta as mensagens recentes da sessão como conversa, começando sempre por uma mensagem do parceiro, seguidas da mensagem com o contexto e a pergunta.

#### Scenario: Histórico começa pelo assistente
- **WHEN** a primeira mensagem recente é do assistente
- **THEN** ela é descartada para que a conversa enviada comece pelo parceiro

### Requirement: Resposta que equivale ao fallback
O sistema SHALL tratar como `fallback`, com a mensagem de fallback e sem fontes, a resposta gerada vazia ou que contém o texto do fallback, comparando sem diferenciar maiúsculas, acentos e espaços repetidos.

#### Scenario: Modelo devolve o fallback com texto extra
- **WHEN** o modelo responde com o texto do fallback precedido de outra frase
- **THEN** a resposta final é só a mensagem de fallback, com o status `fallback`

#### Scenario: Resposta vazia
- **WHEN** o modelo devolve texto vazio
- **THEN** a resposta tem o status `fallback`

### Requirement: Fontes só nas respostas respondidas
Quando a resposta tem o status `answered`, o sistema SHALL devolver como fontes os nomes de arquivo únicos dos trechos usados, na ordem do score. Em qualquer outro status, a lista de fontes MUST ser vazia.

#### Scenario: Dois trechos do mesmo arquivo
- **WHEN** os trechos recuperados vêm de `02-repasse-financeiro.md`, `02-repasse-financeiro.md` e `01-planos-e-taxas.md`, nessa ordem de score
- **THEN** as fontes são `["02-repasse-financeiro.md", "01-planos-e-taxas.md"]`

### Requirement: Status da resposta
Toda resposta SHALL ter exatamente um destes status: `answered` (respondeu com a base), `fallback` (a base não cobre), `blocked_input` (a entrada foi bloqueada) ou `blocked_output` (a saída foi barrada).

#### Scenario: Resposta normal
- **WHEN** há trechos acima do `minScore` e o modelo gera um texto que passa no guardrail de saída
- **THEN** a resposta tem o status `answered` e o texto gerado, aparado

### Requirement: Consumo e latência por turno
O sistema SHALL somar, por turno, as chamadas e os tokens de entrada e de saída de todas as chamadas ao provedor (resumo, reescrita, embedding e geração) e medir a latência do turno, para os logs e a avaliação.

#### Scenario: Turno com reescrita
- **WHEN** um turno faz a reescrita, o embedding e a geração
- **THEN** o consumo informado é a soma das três chamadas

### Requirement: Retry nas falhas transitórias do provedor
Toda chamada de geração ou de embedding SHALL passar por um único cliente de LLM, que tenta de novo só em erro de cota (429) ou de indisponibilidade (5xx, timeout, falha de rede), com até 3 tentativas no total e espera exponencial entre elas. Os outros erros MUST falhar na hora.

#### Scenario: 503 passageiro
- **WHEN** a primeira tentativa recebe 503 e a segunda dá certo
- **THEN** a chamada devolve o resultado da segunda tentativa

#### Scenario: Chave inválida
- **WHEN** o provedor recusa a requisição com 400
- **THEN** a chamada falha sem nova tentativa

### Requirement: Erros do provedor sem conteúdo do prompt
Depois das tentativas, o sistema SHALL converter a falha num de três erros, cota esgotada, provedor indisponível ou requisição recusada, com mensagens genéricas que MUST NOT incluir o texto do prompt, das mensagens ou a mensagem original do provedor.

#### Scenario: Cota esgotada
- **WHEN** as três tentativas recebem 429
- **THEN** o erro é o de cota esgotada, com a mensagem "Cota do provedor de LLM esgotada. Tente de novo mais tarde."

### Requirement: Falha na geração não grava o turno
Se a busca ou a geração falham, o sistema SHALL propagar o erro sem gravar a pergunta nem a resposta.

#### Scenario: Provedor fora do ar na geração
- **WHEN** a geração falha depois das tentativas
- **THEN** nenhuma mensagem do turno é gravada e o erro chega a quem chamou
