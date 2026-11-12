## MODIFIED Requirements

### Requirement: Rota informada em cada turno
Toda resposta do assistente SHALL informar a rota do turno: `cumprimento` quando a regra local respondeu, `conversa` quando o roteador respondeu e `rag` quando a mensagem seguiu para a busca. Uma mensagem bloqueada pelo guardrail de entrada MUST NOT ter rota, porque não chega à decisão. A rota é usada no log e na avaliação, e MUST NOT ser gravada no banco nem devolvida ao navegador.

#### Scenario: Pergunta normal
- **WHEN** o parceiro pergunta "Quando cai o repasse?"
- **THEN** a resposta tem a rota `rag`

#### Scenario: Entrada bloqueada
- **WHEN** a mensagem "bom dia, meu CPF é 123.456.789-09" é bloqueada pelo guardrail de entrada
- **THEN** a resposta tem o status `blocked_input` e nenhuma rota

#### Scenario: Agradecimento
- **WHEN** o roteador responde a "obrigada, ajudou muito"
- **THEN** a resposta tem a rota `conversa`

## ADDED Requirements

### Requirement: Roteador só para mensagens curtas
Quando o roteador está ligado, o sistema SHALL consultá-lo só para as mensagens que passaram pelo guardrail de entrada, não são cumprimento e têm até 12 palavras, contadas sem pontuação e emojis. As mensagens mais longas MUST seguir direto para o RAG, sem a chamada do roteador.

#### Scenario: Mensagem curta
- **WHEN** o parceiro escreve "valeu, era só isso"
- **THEN** o roteador é consultado

#### Scenario: Mensagem longa
- **WHEN** o parceiro escreve uma pergunta com 13 palavras
- **THEN** o roteador não é consultado e a mensagem segue para o RAG

#### Scenario: Dado sensível numa mensagem curta
- **WHEN** o parceiro escreve "obrigada, meu cartão é 4111 1111 1111 1111"
- **THEN** a mensagem é bloqueada pelo guardrail de entrada e nenhum modelo é chamado

### Requirement: Uma chamada classifica e responde
O roteador SHALL fazer uma única chamada ao modelo rápido, com temperatura 0 e até 120 tokens de saída, enviando a mensagem atual, a última resposta do Chapa na conversa (quando houver) e o nome do restaurante (quando houver). A instrução MUST pedir que o modelo responda a conversa (agradecimento, despedida, elogio ou pergunta sobre o próprio assistente) em até 2 frases, sem citar números, prazos, taxas ou regras da Rango, e que responda exatamente `DUVIDA` a qualquer outra coisa ou na dúvida.

#### Scenario: Continuação curta
- **WHEN** a última resposta do Chapa foi sobre a comissão do Plano Próprio e o parceiro escreve "e no Plano Entrega?"
- **THEN** a chamada do roteador recebe a última resposta do Chapa junto com a mensagem

#### Scenario: Apresentação
- **WHEN** o parceiro escreve "o que você sabe fazer?"
- **THEN** a instrução do roteador traz os temas que o Chapa cobre, os mesmos da instrução de sistema

### Requirement: Resposta de conversa
Quando o roteador devolve uma resposta aceita, o sistema SHALL responder com ela, aparada, com o status `small_talk`, a rota `conversa` e sem fontes, sem fazer a reescrita, o embedding, a busca nem a geração, e gravar o turno como os outros.

#### Scenario: Agradecimento respondido
- **WHEN** o parceiro escreve "obrigada, ajudou muito" e o roteador devolve "Que bom que ajudou! Posso ajudar em mais alguma coisa?"
- **THEN** a resposta é esse texto, com o status `small_talk`, sem fontes e sem chamada de embedding

### Requirement: RAG como padrão seguro
A mensagem SHALL seguir para o RAG, como se o roteador não existisse, quando a chamada do roteador falha ou quando a saída vem vazia, contém a palavra `DUVIDA` em maiúsculas (com ou sem acento), tem qualquer dígito, contém o texto do fallback ou é barrada pelo guardrail de saída. Uma falha do roteador MUST NOT derrubar o turno.

#### Scenario: Sentinela
- **WHEN** o roteador devolve "DUVIDA"
- **THEN** a mensagem segue para o RAG com a rota `rag`

#### Scenario: Palavra dúvida numa resposta de conversa
- **WHEN** o roteador devolve "De nada! Se tiver outra dúvida, é só chamar."
- **THEN** a resposta é aceita como conversa, porque a sentinela só conta em maiúsculas

#### Scenario: Número na resposta
- **WHEN** o roteador devolve "De nada! O repasse cai em 7 dias."
- **THEN** a resposta é descartada e a mensagem segue para o RAG

#### Scenario: Provedor falha
- **WHEN** a chamada do roteador falha depois das tentativas
- **THEN** a mensagem segue para o RAG e o turno termina normalmente

#### Scenario: Saída barrada
- **WHEN** o roteador devolve um texto que o guardrail de saída barra
- **THEN** a resposta é descartada e a mensagem segue para o RAG

### Requirement: Roteador desligável
O roteador SHALL ser ligado por configuração, ligado por padrão. Desligado, só a regra local de cumprimento roda, e toda mensagem que não é cumprimento MUST seguir direto para o RAG, sem chamada extra.

#### Scenario: Roteador desligado
- **WHEN** o roteador está desligado e o parceiro escreve "obrigada, ajudou muito"
- **THEN** a mensagem segue para o RAG, sem a chamada do roteador
