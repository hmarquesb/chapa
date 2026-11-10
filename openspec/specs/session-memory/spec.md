# session-memory Specification

## Purpose
Mantém cada conversa anônima no banco, com o perfil do restaurante, o histórico e um resumo das mensagens antigas, para que o assistente entenda perguntas que dependem das anteriores sem guardar nada em memória entre requisições.

## Requirements

### Requirement: Sessão anônima identificada por UUID
O sistema SHALL identificar cada conversa por um UUID gerado pelo cliente, sem login. A sessão MUST ser criada na primeira mensagem que passa pelo guardrail de entrada, com o canal de origem (`web`, `cli` ou `eval`), que não muda depois.

#### Scenario: Primeira mensagem cria a sessão
- **WHEN** chega a primeira mensagem válida de um UUID que o banco não conhece, pelo canal `web`
- **THEN** a sessão é criada com o canal `web`

#### Scenario: Canal não muda
- **WHEN** uma sessão criada pelo canal `cli` recebe uma mensagem pelo canal `web`
- **THEN** o canal gravado continua `cli`

### Requirement: Retomar a conversa pelo identificador
Quem envia uma mensagem com o UUID de uma sessão existente SHALL continuar a mesma conversa, com o histórico, o resumo e o perfil dela, em qualquer canal. O identificador funciona como credencial: quem o tem lê e continua a conversa.

#### Scenario: Continuação em outro navegador
- **WHEN** uma mensagem chega com o UUID de uma sessão que já tem mensagens
- **THEN** o assistente usa o histórico e o resumo dessa sessão para responder

### Requirement: Perfil do restaurante por sessão
Quando a mensagem traz um perfil, o sistema SHALL substituir o perfil da sessão por ele, com os valores aparados e os campos vazios descartados. Quando a mensagem não traz perfil, MUST usar o perfil já salvo na sessão. Os campos são nome, plano, cozinha, cidade e horário.

#### Scenario: Perfil enviado com espaços
- **WHEN** a mensagem traz o perfil `{ "name": "  Pizzaria Bella ", "city": "" }`
- **THEN** a sessão passa a ter o perfil `{ "name": "Pizzaria Bella" }`, que também vai para a instrução de sistema

#### Scenario: Perfil vazio apaga o salvo
- **WHEN** a mensagem traz `profile: {}` (ou só campos vazios) e a sessão tem um perfil salvo
- **THEN** o perfil da sessão passa a ser vazio. A interface nunca manda o perfil vazio (omite o campo), então isso só acontece em chamadas diretas à API

#### Scenario: Perfil omitido
- **WHEN** a mensagem não traz perfil e a sessão tem um perfil salvo
- **THEN** a resposta usa o perfil salvo e o perfil da sessão não muda

### Requirement: Só a pergunta e a resposta finais são gravadas
A cada turno que passa pelo guardrail de entrada e termina sem erro, o sistema SHALL gravar, numa única transação, a pergunta original do parceiro e a resposta final com o status e as fontes, e atualizar a última atividade da sessão. Os trechos recuperados, a pergunta reescrita e o prompt MUST NOT ser gravados.

#### Scenario: Turno respondido
- **WHEN** um turno termina com o status `answered`
- **THEN** o histórico ganha duas mensagens, a do parceiro e a do assistente com o status e as fontes, e nenhum trecho ou prompt é gravado

### Requirement: Ordem das mensagens
O sistema SHALL devolver as mensagens de uma sessão na ordem em que foram gravadas, pelo identificador crescente da mensagem, e não pela data.

#### Scenario: Duas mensagens no mesmo instante
- **WHEN** a pergunta e a resposta de um turno têm o mesmo horário de criação
- **THEN** a pergunta vem antes da resposta

### Requirement: Estado lido do banco a cada mensagem
O sistema SHALL ler o perfil, o resumo e o histórico pendente da sessão no banco a cada mensagem, sem guardar estado em memória entre requisições.

#### Scenario: Duas instâncias do servidor
- **WHEN** duas mensagens seguidas da mesma sessão são atendidas por instâncias diferentes do servidor
- **THEN** a segunda usa o histórico gravado pela primeira

### Requirement: Histórico recente e resumo das mensagens antigas
O sistema SHALL considerar pendentes as mensagens gravadas depois do último resumo. Com até 16 pendentes, todas vão inteiras ao modelo. Acima disso, as 10 mais recentes vão inteiras e as anteriores são resumidas junto com o resumo anterior, e o novo resumo é gravado com a marca da última mensagem incorporada. Na geração, a conversa enviada ao modelo começa sempre por uma mensagem do parceiro (ver `answer-generation`), então uma primeira mensagem recente do assistente fica de fora.

#### Scenario: 17 mensagens pendentes
- **WHEN** a sessão tem 17 mensagens pendentes
- **THEN** as 7 mais antigas são resumidas, o resumo é gravado até a 7ª, e as 10 mais recentes (da 8ª à 17ª) ficam como histórico recente, das quais a geração recebe a partir da primeira mensagem do parceiro

#### Scenario: Até 16 mensagens
- **WHEN** a sessão tem 16 mensagens pendentes
- **THEN** nenhum resumo é feito e as 16 vão inteiras

#### Scenario: Só as posteriores ao resumo
- **WHEN** a sessão já tem um resumo até a mensagem 40
- **THEN** só as mensagens depois da 40 contam como pendentes

### Requirement: Conteúdo do resumo
O resumo SHALL ser um único parágrafo em PT-BR, de até 120 palavras, que junta o resumo anterior às mensagens novas, mantém os fatos do restaurante, as dúvidas respondidas e o que ficou em aberto, e MUST NOT copiar CPF, número de cartão, senha, telefone ou e-mail.

#### Scenario: Resumo vai para a geração
- **WHEN** existe um resumo da sessão
- **THEN** ele entra na instrução de sistema da geração como "Resumo da conversa até aqui"

### Requirement: Falha no resumo não derruba o turno
Se a chamada de resumo falhar ou devolver texto vazio, o sistema SHALL seguir o turno com o resumo anterior e as mensagens recentes, sem gravar resumo novo. Nesse turno, as mensagens pendentes anteriores às recentes ficam fora do contexto, e voltam a ser consideradas no próximo turno, que tenta o resumo de novo.

#### Scenario: Provedor falha no resumo
- **WHEN** a chamada de resumo falha
- **THEN** o turno responde normalmente e o resumo gravado continua o mesmo

### Requirement: Reescrita da pergunta para a busca
Quando a reescrita está ligada no preset e a sessão tem histórico recente ou resumo, o sistema SHALL reescrever a pergunta como autossuficiente, em PT-BR e numa linha, a partir do resumo, das últimas 6 mensagens e da pergunta, e usar a versão reescrita só na busca. Sem histórico nem resumo, MUST buscar com a pergunta original.

#### Scenario: Pergunta que depende da anterior
- **WHEN** o parceiro pergunta "e no outro plano?" depois de perguntar a comissão do Plano Básico
- **THEN** a busca usa a pergunta reescrita, e a geração recebe a pergunta original

#### Scenario: Primeira mensagem
- **WHEN** a sessão não tem histórico nem resumo
- **THEN** não há chamada de reescrita e a busca usa a pergunta original

#### Scenario: Reescrita desligada
- **WHEN** o preset ativo tem a reescrita desligada
- **THEN** a busca usa sempre a pergunta original

### Requirement: Falha na reescrita usa a pergunta original
Se a reescrita falhar, devolver texto vazio ou passar de 300 caracteres, o sistema SHALL buscar com a pergunta original, sem derrubar o turno.

#### Scenario: Reescrita longa demais
- **WHEN** a reescrita devolve um texto de 301 caracteres
- **THEN** a busca usa a pergunta original

### Requirement: Expiração depois de 7 dias sem atividade
O sistema SHALL apagar, junto com todas as mensagens, as sessões sem mensagem nova há mais de 7 dias, de qualquer canal. Ler o histórico MUST NOT contar como atividade.

#### Scenario: Sessão parada há 8 dias
- **WHEN** a limpeza diária roda e uma sessão está sem atividade há 8 dias
- **THEN** a sessão e as mensagens dela são apagadas

#### Scenario: Só leitura não renova
- **WHEN** alguém abre o link de uma sessão parada há 6 dias, lê o histórico e não envia mensagem
- **THEN** a última atividade da sessão não muda
