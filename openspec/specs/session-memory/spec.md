# session-memory Specification

## Purpose
Mantém cada conversa anônima no banco, com o perfil do restaurante, o histórico e um resumo das mensagens antigas, para que o assistente entenda perguntas que dependem das anteriores sem guardar nada em memória entre requisições.

## Requirements

### Requirement: Perfil do restaurante por sessão
No CLI e no eval, quando a mensagem traz um perfil, o sistema SHALL substituir o perfil da sessão por ele, depois de validá-lo pelas mesmas regras do `PUT /api/profile` (ver `chat-api`), exceto o plano, que no CLI e no eval é opcional. Um perfil inválido MUST interromper o CLI com a mensagem do erro, antes de qualquer chamada ao LLM. Sem perfil, MUST usar o salvo na sessão. Na web, o perfil vem sempre da conta, lido a cada mensagem, e MUST NOT ser gravado na conversa.

#### Scenario: Perfil enviado com espaços
- **WHEN** uma mensagem do CLI traz o perfil `{ "version": 2, "name": "  Pizzaria Bella " }`
- **THEN** a sessão passa a ter o perfil `{ "version": 2, "name": "Pizzaria Bella" }`, que também vai para a instrução de sistema

#### Scenario: Perfil vazio apaga o salvo
- **WHEN** uma mensagem do CLI ou do eval traz `profile: { "version": 2 }` (ou só campos vazios) e a sessão tem um perfil salvo
- **THEN** o perfil da sessão passa a ser vazio

#### Scenario: Perfil omitido
- **WHEN** uma mensagem do CLI não traz perfil e a sessão tem um perfil salvo
- **THEN** a resposta usa o perfil salvo e o perfil da sessão não muda

#### Scenario: Perfil da conta na web
- **WHEN** uma conta com o plano Misto envia uma mensagem e depois troca o plano para Próprio
- **THEN** a mensagem seguinte, em qualquer conversa da conta, usa o Plano Próprio, e o perfil gravado na conversa continua vazio

#### Scenario: Arquivo de perfil inválido no CLI
- **WHEN** alguém roda `npm run chat -- --perfil perfil.json` com `"location": { "uf": "SP", "cityCode": 3304557 }` no arquivo
- **THEN** o comando termina com "Escolha o estado e a cidade da lista." e nenhuma chamada ao LLM é feita

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

### Requirement: Conversa criada na primeira mensagem
O sistema SHALL criar a conversa na primeira mensagem que passa pelo guardrail de entrada, com o canal de origem (`web`, `cli` ou `eval`), que não muda depois. Uma conversa `web` MUST pertencer à conta logada e ter o id gerado pelo servidor. Conversas `cli` e `eval` não têm conta e usam o id que o script informa.

#### Scenario: Primeira mensagem pela web
- **WHEN** uma conta logada envia a primeira mensagem válida sem id de conversa
- **THEN** o servidor cria uma conversa `web` dessa conta, com um id novo

#### Scenario: Primeira mensagem bloqueada
- **WHEN** a primeira mensagem de uma conversa nova traz um CPF
- **THEN** nenhuma conversa é criada

#### Scenario: CLI sem conta
- **WHEN** o `npm run chat` envia a primeira mensagem com um id novo
- **THEN** a conversa é criada com o canal `cli` e sem conta

### Requirement: Continuar uma conversa do mesmo dono
Uma mensagem com o id de uma conversa existente SHALL continuar a conversa, com o histórico e o resumo dela, só quando o dono é o mesmo: a mesma conta, na web, ou nenhuma conta, no CLI e no eval. No CLI e no eval, o perfil da conversa também vale. Com outro dono, a conversa MUST ser tratada como inexistente, sem ler nem gravar nada nela.

#### Scenario: Conta continua a própria conversa
- **WHEN** a conta A envia uma mensagem com o id de uma conversa dela que já tem mensagens
- **THEN** o assistente usa o histórico e o resumo dessa conversa para responder

#### Scenario: Conta tenta continuar a conversa de outra
- **WHEN** a conta A envia uma mensagem com o id de uma conversa da conta B
- **THEN** a conversa de B não muda, e a mensagem é recusada como se a conversa não existisse

#### Scenario: CLI tenta abrir uma conversa da web
- **WHEN** o `npm run chat -- --sessao <id>` recebe o id de uma conversa `web`
- **THEN** o CLI trata o id como uma conversa que não existe

### Requirement: Expiração das conversas
O sistema SHALL apagar, junto com todas as mensagens, as conversas `web` sem mensagem nova há mais de 30 dias e as conversas `cli` e `eval` sem mensagem nova há mais de 7 dias. Apagar uma conta MUST apagar as conversas dela. Ler o histórico ou a lista MUST NOT contar como atividade.

#### Scenario: Conversa web parada há 31 dias
- **WHEN** a limpeza diária roda e uma conversa `web` está sem mensagem nova há 31 dias
- **THEN** a conversa e as mensagens dela são apagadas

#### Scenario: Conversa web parada há 8 dias
- **WHEN** a limpeza diária roda e uma conversa `web` está sem mensagem nova há 8 dias
- **THEN** a conversa continua

#### Scenario: Conversa do eval parada há 8 dias
- **WHEN** a limpeza diária roda e uma conversa `eval` está sem atividade há 8 dias
- **THEN** a conversa e as mensagens dela são apagadas

#### Scenario: Só leitura não renova
- **WHEN** alguém abre uma conversa parada há 29 dias, lê o histórico e não envia mensagem
- **THEN** a última atividade da conversa não muda
