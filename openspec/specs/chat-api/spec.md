# chat-api Specification

## Purpose
Expõe o assistente ao navegador por rotas HTTP próprias, com validação do pedido, limite de tamanho e de frequência, erros em PT-BR sem detalhes internos, logs sem conteúdo e a limpeza diária das sessões expiradas.

## Requirements

### Requirement: Enviar uma mensagem
`POST /api/chat` SHALL receber `{ sessionId?, message }`, passar a mensagem ao assistente pelo canal `web`, com o perfil da conta, na conversa indicada ou, sem `sessionId`, numa conversa nova da conta, e responder 200 com exatamente `{ status, answer, sources, sessionId }`. `sessionId` é o id da conversa, ou `null` quando nenhuma conversa foi criada. A pergunta reescrita, os trechos e o consumo MUST NOT sair do servidor.

#### Scenario: Pergunta respondida
- **WHEN** o navegador envia uma pergunta coberta pela base numa conversa da conta
- **THEN** a resposta é 200 com `status: "answered"`, o texto da resposta, a lista de fontes e o `sessionId` da conversa, e nenhum outro campo

#### Scenario: Primeira mensagem sem id
- **WHEN** o navegador envia uma pergunta sem `sessionId`
- **THEN** a resposta traz o `sessionId` da conversa nova, que passa a aparecer na lista da conta

#### Scenario: Perfil da conta no prompt
- **WHEN** a conta tem o plano Entrega salvo e envia uma pergunta sobre a comissão
- **THEN** a instrução de sistema traz "Plano: Plano Entrega", e a conversa não grava perfil nenhum

#### Scenario: Bloqueio não é erro HTTP
- **WHEN** a mensagem tem um CPF ou passa de 1.000 caracteres, num corpo de até 4.096 bytes
- **THEN** a resposta é 200 com `status: "blocked_input"` e a mensagem do guardrail, porque a validação do formato não olha o tamanho nem o conteúdo da mensagem

#### Scenario: Bloqueio numa conversa nova
- **WHEN** a primeira mensagem, sem `sessionId`, tem um CPF
- **THEN** a resposta é 200 com `status: "blocked_input"` e `sessionId: null`

### Requirement: Só JSON
`POST /api/chat` SHALL recusar com 415 o pedido cujo `Content-Type` não começa com `application/json`, com a mensagem "Envie o pedido em JSON (Content-Type: application/json)."

#### Scenario: Formulário
- **WHEN** o pedido chega com `Content-Type: application/x-www-form-urlencoded`
- **THEN** a resposta é 415

### Requirement: Corpo de até 4 KB
`POST /api/chat` SHALL recusar com 413 o corpo maior que 4.096 bytes, pelo `Content-Length` declarado ou contando os bytes durante a leitura, sem ler o corpo inteiro. Corpo que não é JSON válido em UTF-8 MUST receber 400 com "O pedido não é um JSON válido."

#### Scenario: Content-Length acima do limite
- **WHEN** o pedido declara `Content-Length: 5000`
- **THEN** a resposta é 413 com "O pedido ficou grande demais. Encurte a mensagem ou o perfil e tente de novo." antes de ler o corpo

#### Scenario: JSON quebrado
- **WHEN** o corpo é `{"sessionId":`
- **THEN** a resposta é 400 com "O pedido não é um JSON válido."

### Requirement: Validação do formato do pedido
`POST /api/chat` SHALL responder 400 com um motivo em PT-BR quando o corpo não é um objeto, traz `profile` ("O perfil agora fica salvo na conta. Recarregue a página."), tem outros campos além de `sessionId` e `message`, tem `sessionId` presente que não é UUID, ou tem `message` que não é texto.

#### Scenario: Campo desconhecido
- **WHEN** o corpo traz `{ "message": "oi", "role": "admin" }`
- **THEN** a resposta é 400 com "O pedido tem campos desconhecidos."

#### Scenario: sessionId malformado
- **WHEN** o corpo traz `{ "sessionId": "abc", "message": "oi" }`
- **THEN** a resposta é 400 com "O identificador da conversa é inválido."

#### Scenario: Perfil no corpo
- **WHEN** o corpo traz `{ "message": "oi", "profile": { "plan": "misto" } }`
- **THEN** a resposta é 400 com "O perfil agora fica salvo na conta. Recarregue a página.", e nada é gravado

#### Scenario: Campo do perfil longo demais
- **WHEN** o corpo traz um perfil com `city` de 61 caracteres
- **THEN** a resposta é 400 com "O perfil agora fica salvo na conta. Recarregue a página.", porque nenhum perfil é aceito no corpo

### Requirement: Rate limit por IP com hash
`POST /api/chat` SHALL limitar cada IP a 10 pedidos por minuto e 100 por dia, em janelas fixas de minuto e de dia em UTC guardadas no banco (a janela diária vira à meia-noite UTC, 21h em Brasília). O IP vem do primeiro valor de `x-forwarded-for`, depois de `x-real-ip`, ou vira `unknown`, e MUST ser guardado só como HMAC-SHA256 com um segredo do servidor, nunca em claro.

#### Scenario: 11º pedido no mesmo minuto
- **WHEN** o mesmo IP faz o 11º pedido válido dentro do mesmo minuto
- **THEN** a resposta é 429 com "Muitas mensagens em pouco tempo. Aguarde um pouco e tente de novo." e o cabeçalho `Retry-After` com os segundos até o fim da janela, no mínimo 1

#### Scenario: 101º pedido do dia
- **WHEN** o mesmo IP faz o 101º pedido válido no mesmo dia UTC
- **THEN** a resposta é 429 com `Retry-After` até a meia-noite UTC seguinte

#### Scenario: Pedido inválido não conta
- **WHEN** um pedido é recusado por formato, tamanho ou tipo de conteúdo
- **THEN** ele não entra na contagem do rate limit

#### Scenario: Pedido recusado conta
- **WHEN** um pedido válido é recusado pelo rate limit
- **THEN** ele também incrementa as contagens do minuto e do dia

### Requirement: Erros com texto fixo em PT-BR
As rotas SHALL responder os erros com o corpo `{ "error": "<texto>" }`, usando só textos fixos em PT-BR: cota do provedor esgotada vira 429, provedor ou banco indisponível vira 503 e qualquer outra falha vira 500. A mensagem do provedor, o stack trace e detalhes do banco MUST NOT aparecer na resposta.

#### Scenario: Cota do Gemini esgotada
- **WHEN** a geração falha por cota depois das tentativas
- **THEN** a resposta é 429 com "A demo atingiu o limite de uso do provedor de IA. Tente mais tarde."

#### Scenario: Banco fora do ar
- **WHEN** o banco recusa a conexão
- **THEN** a resposta é 503 com "O assistente está indisponível agora. Tente de novo em instantes."

#### Scenario: Erro inesperado
- **WHEN** acontece um erro não previsto
- **THEN** a resposta é 500 com "Algo deu errado do nosso lado. Tente de novo."

### Requirement: Respostas sem cache
Toda resposta JSON das rotas SHALL levar `Cache-Control: no-store`, porque respostas e históricos são privados da sessão.

#### Scenario: Histórico
- **WHEN** o navegador lê o histórico de uma sessão
- **THEN** a resposta traz `Cache-Control: no-store`

### Requirement: Ler o histórico de uma sessão
`GET /api/sessions/[id]/messages` SHALL responder 200 com `{ sessionId, messages }` para uma conversa da conta logada, em que cada mensagem tem `id`, `role`, `content`, `status` (nulo nas do parceiro), `sources` e `createdAt` em ISO 8601, na ordem de gravação. A leitura MUST NOT alterar a última atividade da conversa.

#### Scenario: Sessão existente
- **WHEN** a conta pede o histórico de uma conversa dela com dois turnos
- **THEN** a resposta é 200 com as quatro mensagens em ordem e sem campo `profile`

#### Scenario: Sessão que não existe
- **WHEN** o id é um UUID que o banco não conhece, ou de uma conversa já apagada
- **THEN** a resposta é 404 com "Esta conversa não existe mais. Começamos uma nova."

#### Scenario: Sessão de outra conta
- **WHEN** a conta A pede o histórico de uma conversa da conta B
- **THEN** a resposta é 404 com "Esta conversa não existe mais. Começamos uma nova."

#### Scenario: Id malformado
- **WHEN** o id não é um UUID
- **THEN** a resposta é 400 com "O identificador da conversa é inválido."

### Requirement: Verificar a saúde
`GET /api/health` SHALL responder 200 com `{ ok: true, chunks, embeddingModel }`, em que `chunks` é o número de trechos do conjunto ativo. Se o banco falhar, MUST responder 503 com `{ ok: false, chunks: 0, embeddingModel }`.

#### Scenario: Base ingerida
- **WHEN** o conjunto ativo tem trechos
- **THEN** a resposta é 200 com `ok: true` e `chunks` maior que zero

### Requirement: Limpeza diária protegida por segredo
`GET /api/cron/cleanup` SHALL exigir `Authorization: Bearer <CRON_SECRET>`, comparado em tempo constante, e responder 401 com "Acesso não autorizado." sem ele. Autorizado, apaga as conversas expiradas (ver `session-memory`), as conversas `web` sem conta, as janelas de rate limit com mais de 2 dias e as contas vencidas (ver `auth`), e responde `{ deletedSessions, deletedRateLimits, deletedAccounts }`. Roda uma vez por dia.

#### Scenario: Chamada do agendador
- **WHEN** o agendador chama a rota com o segredo certo
- **THEN** a resposta é 200 com o número de conversas, de janelas e de contas apagadas

#### Scenario: Conversa web antiga sem conta
- **WHEN** a limpeza roda e existe uma conversa `web` sem conta, de antes do login, com atividade há 1 dia
- **THEN** a conversa é apagada

#### Scenario: Sem segredo
- **WHEN** alguém chama a rota sem o cabeçalho ou com outro segredo
- **THEN** a resposta é 401 e nada é apagado

### Requirement: Logs sem conteúdo
Cada pedido SHALL gerar uma linha de log em JSON com o modelo da rota (por exemplo `/api/sessions/[id]/messages`), o método, o status HTTP, a latência e, quando houver, o `accountId` da sessão, o status da resposta, a rota do turno (`replyRoute`), a latência do roteador (`routerMs`), as chamadas, os tokens e o nome do erro. O conteúdo das mensagens, o perfil, o `sessionId`, o IP e o e-mail da conta MUST NOT ser registrados.

#### Scenario: Pedido de histórico
- **WHEN** o navegador lê o histórico de uma sessão
- **THEN** o log registra `/api/sessions/[id]/messages`, sem o id real

#### Scenario: Pedido de uma conta Google
- **WHEN** uma conta Google envia uma mensagem
- **THEN** o log traz o `accountId` e não traz o e-mail

#### Scenario: Cumprimento no log
- **WHEN** a conta envia "bom dia"
- **THEN** o log traz `replyStatus: "small_talk"`, `replyRoute: "cumprimento"` e `llmCalls: 0`, e não traz o texto da mensagem nem o da resposta

#### Scenario: Conversa no log
- **WHEN** a conta envia "obrigada, ajudou muito" e o roteador responde
- **THEN** o log traz `replyStatus: "small_talk"`, `replyRoute: "conversa"` e o `routerMs`, e não traz o texto da mensagem nem o da resposta

### Requirement: Configuração lida no primeiro pedido
As rotas SHALL ler as variáveis de ambiente e abrir conexões só no primeiro pedido, nunca na importação nem no build. Se faltar uma variável obrigatória, o pedido MUST receber 500 com o texto genérico, e o pedido seguinte tenta de novo.

#### Scenario: Build sem variáveis
- **WHEN** o projeto é construído sem nenhuma variável de ambiente
- **THEN** o build termina sem erro

### Requirement: Dados acessíveis só pelo servidor
O navegador SHALL falar só com estas rotas, nunca com o provedor de LLM nem com o banco. As tabelas MUST ter o RLS ligado e nenhuma policy, e nenhuma chave secreta pode ser exposta ao cliente.

#### Scenario: Tentativa de acesso direto ao banco
- **WHEN** alguém tenta ler as tabelas com a chave pública do Supabase
- **THEN** o acesso é negado pelo RLS

### Requirement: Login obrigatório nas rotas de conversa
`POST /api/chat`, `GET /api/sessions`, `GET /api/sessions/[id]/messages`, `DELETE /api/sessions/[id]`, `GET` e `PUT /api/profile`, `DELETE /api/account` e `POST /api/account/welcome` SHALL exigir uma sessão válida (ver `auth`) antes de qualquer outra verificação. Sem ela, MUST responder `401` com "Sua sessão terminou. Entre de novo para continuar.", sem ler o corpo e sem contar no rate limit. `GET /api/health` e `GET /api/cron/cleanup` não exigem login.

#### Scenario: Mensagem sem cookie
- **WHEN** alguém envia `POST /api/chat` sem cookie de sessão
- **THEN** a resposta é `401` com "Sua sessão terminou. Entre de novo para continuar.", e nada é gravado

#### Scenario: Histórico sem cookie
- **WHEN** alguém pede `GET /api/sessions/<uuid>/messages` sem cookie de sessão
- **THEN** a resposta é `401`

#### Scenario: Lista sem cookie
- **WHEN** alguém pede `GET /api/sessions` sem cookie de sessão
- **THEN** a resposta é `401`

#### Scenario: Perfil sem cookie
- **WHEN** alguém envia `PUT /api/profile` sem cookie de sessão
- **THEN** a resposta é `401`, e nenhum perfil muda

#### Scenario: Boas-vindas sem cookie
- **WHEN** alguém envia `POST /api/account/welcome` sem cookie de sessão
- **THEN** a resposta é `401`, e nenhuma conta muda

#### Scenario: Demo vencida
- **WHEN** uma conta demo vencida envia `POST /api/chat` com o cookie ainda dentro da validade
- **THEN** a resposta é `401`

#### Scenario: Saúde sem login
- **WHEN** alguém pede `GET /api/health` sem cookie
- **THEN** a resposta segue a regra de saúde, sem `401`

### Requirement: Conversa de outra conta é tratada como inexistente
Toda rota que recebe o id de uma conversa SHALL responder `404` com "Esta conversa não existe mais. Começamos uma nova." tanto para um id que o banco não conhece quanto para a conversa de outra conta, sem ler nem alterar a conversa alheia. O filtro pela conta MUST valer no acesso ao banco, e não só na rota.

#### Scenario: Continuar a conversa de outra conta
- **WHEN** a conta A envia `POST /api/chat` com o `sessionId` de uma conversa da conta B
- **THEN** a resposta é `404` com o texto fixo, e a conversa de B continua com as mesmas mensagens e a mesma última atividade

#### Scenario: Mesma resposta para inexistente e alheia
- **WHEN** a conta A pede o histórico de um UUID que não existe e depois o de uma conversa da conta B
- **THEN** as duas respostas têm o mesmo status e o mesmo corpo

### Requirement: Listar as conversas da conta
`GET /api/sessions` SHALL responder 200 com `{ sessions }`, a lista das conversas da conta logada que têm pelo menos uma mensagem, da última atividade mais recente para a mais antiga, no máximo 50. Cada item tem `id`, `title` e `lastActivityAt` em ISO 8601. O título é a primeira pergunta, com os espaços aparados e juntados, cortada em 60 caracteres com "…" quando passa disso.

#### Scenario: Duas contas
- **WHEN** a conta A tem duas conversas, a conta B tem uma, e A pede a lista
- **THEN** a resposta traz só as duas conversas de A, a mais recente primeiro

#### Scenario: Título longo
- **WHEN** a primeira pergunta de uma conversa tem 80 caracteres
- **THEN** o título tem os 60 primeiros caracteres, sem espaço no fim, seguidos de "…"

#### Scenario: Conta sem conversas
- **WHEN** uma conta nova pede a lista
- **THEN** a resposta é 200 com `{ "sessions": [] }`

### Requirement: Apagar uma conversa
`DELETE /api/sessions/[id]` SHALL apagar a conversa da conta logada, junto com todas as mensagens, e responder `204` sem corpo. Um id malformado MUST receber `400` com "O identificador da conversa é inválido.", e a conversa inexistente ou de outra conta recebe o `404` da regra de conversa alheia.

#### Scenario: Apagar a própria conversa
- **WHEN** a conta apaga uma conversa dela
- **THEN** a resposta é `204`, e a conversa some da lista e do banco

#### Scenario: Apagar a conversa de outra conta
- **WHEN** a conta A tenta apagar uma conversa da conta B
- **THEN** a resposta é `404`, e a conversa de B continua

### Requirement: Ler e salvar o perfil da conta
`GET /api/profile` SHALL responder 200 com `{ profile, needsReview }`: o perfil da conta logada no formato v2 e se ele precisa de revisão (ver `answer-generation`, "Perfil salvo no formato antigo"). `PUT /api/profile` SHALL receber o perfil v2 `{ version: 2, plan, name?, cuisine?, location?, hours? }`, aparar os textos, descartar os campos vazios, salvar o perfil na conta e responder 200 com `{ profile, needsReview: false }`. Cada campo MUST seguir o formato do cenário "Formato de cada campo".

#### Scenario: Formato de cada campo
- **WHEN** a conta envia `PUT /api/profile`
- **THEN** o `plan` é `proprio`, `entrega` ou `misto`; `cuisine` é `{ id }`, com um id da lista de cozinhas, ou `{ id: "outro", text }`, com o texto de 1 a 30 caracteres; `location` é `{ uf }` ou `{ uf, cityCode }`, com uma das 27 UFs e o código IBGE de um município dessa UF; `name` é texto de até 60 caracteres; `hours` segue "Horário do perfil na API"; fora disso, a resposta é 400

#### Scenario: Salvar o perfil
- **WHEN** a conta envia `PUT /api/profile` com `{ "version": 2, "name": "  Pizzaria Bella ", "plan": "entrega", "cuisine": { "id": "pizza" }, "location": { "uf": "RJ", "cityCode": 3303302 } }`
- **THEN** a resposta é 200 com o perfil salvo, o nome aparado e `needsReview: false`, e a próxima mensagem de qualquer conversa da conta usa esse perfil

#### Scenario: Sem plano
- **WHEN** o corpo do `PUT` não traz `plan`, ou traz `"plan": "premium"`
- **THEN** a resposta é 400 com "Escolha o plano: Próprio, Entrega ou Misto.", e o perfil salvo não muda

#### Scenario: Formato antigo
- **WHEN** o corpo do `PUT` não traz `version: 2`, como `{ "plan": "misto", "city": "Niterói" }`
- **THEN** a resposta é 400 com "O formulário do perfil mudou. Recarregue a página.", e o perfil salvo não muda

#### Scenario: Cozinha fora da lista
- **WHEN** o corpo traz `"cuisine": { "id": "tailandesa" }`, ou `{ "id": "outro" }` sem texto, ou `{ "id": "outro", "text": "<31 caracteres>" }`
- **THEN** a resposta é 400 com `field: "cuisine"` e a mensagem "Escolha o tipo de cozinha da lista ou descreva em até 30 caracteres."

#### Scenario: Cidade de outra UF
- **WHEN** o corpo traz `"location": { "uf": "SP", "cityCode": 3304557 }` (código do Rio de Janeiro), um código que não existe, uma UF desconhecida ou `{ "cityCode": 3304557 }` sem UF
- **THEN** a resposta é 400 com `field: "location"` e a mensagem "Escolha o estado e a cidade da lista."

#### Scenario: Só o estado
- **WHEN** o corpo traz `"location": { "uf": "MG" }`
- **THEN** o perfil é salvo com o estado e sem cidade

#### Scenario: Campo longo ou desconhecido
- **WHEN** o corpo traz `name` com 61 caracteres, ou o campo `cnpj`
- **THEN** a resposta é 400 com "O perfil do restaurante é inválido." no primeiro caso e "O pedido tem campos desconhecidos." no segundo

#### Scenario: Formato do pedido
- **WHEN** o `PUT` chega sem `Content-Type: application/json`, com mais de 4.096 bytes ou com JSON quebrado
- **THEN** a resposta é 415, 413 ou 400, com os mesmos textos de `POST /api/chat`

### Requirement: Excluir a conta pela API
`DELETE /api/account` SHALL apagar a conta logada, junto com o perfil e todas as conversas e mensagens, e responder `204` sem corpo. Os pedidos seguintes com o mesmo cookie MUST receber `401`.

#### Scenario: Excluir e tentar de novo
- **WHEN** a conta envia `DELETE /api/account` e depois `GET /api/sessions` com o mesmo cookie
- **THEN** a primeira resposta é `204` e a segunda é `401`

### Requirement: Limite diário de mensagens por conta
Depois do limite por IP, `POST /api/chat` SHALL limitar cada conta a 60 mensagens por dia UTC (conta Google) ou a 30 (conta demo), contando cada pedido válido que passou pelo limite por IP. Acima disso, MUST responder 429 com `Retry-After` até a meia-noite UTC seguinte e o texto fixo do tipo de conta.

#### Scenario: 61ª mensagem de uma conta Google
- **WHEN** uma conta Google envia a 61ª mensagem válida no mesmo dia UTC
- **THEN** a resposta é 429 com "Você chegou ao limite de mensagens de hoje nesta conta. Volte amanhã."

#### Scenario: 31ª mensagem de uma demo
- **WHEN** uma conta demo envia a 31ª mensagem válida no mesmo dia UTC
- **THEN** a resposta é 429 com "A conta de demonstração chegou ao limite de mensagens de hoje. Entre com Google para continuar."

#### Scenario: Recusa pelo IP não conta na conta
- **WHEN** um pedido é recusado pelo limite por IP
- **THEN** ele não entra na contagem diária da conta

### Requirement: Recusa do texto do perfil por campo
Quando o filtro de `guardrails` recusa o `name` ou o `cuisine` do `PUT /api/profile`, a API SHALL responder `400` com `{ error, field }`, em que `field` é o campo recusado e `error` é a mensagem neutra do filtro, e MUST NOT alterar o perfil salvo. A linha de log do pedido SHALL trazer o motivo em `profileRejected`.

#### Scenario: Nome inadequado enviado direto à API
- **WHEN** a conta envia `PUT /api/profile` com `{ "plan": "misto", "name": "M3rd@ Burguer" }`
- **THEN** a resposta é `400` com `{ "error": "Esse nome tem um termo que não é permitido. Escolha outro.", "field": "name" }`, e o perfil salvo não muda

#### Scenario: Cozinha com caractere proibido
- **WHEN** a conta envia `PUT /api/profile` com `{ "plan": "proprio", "cuisine": "<b>pizza</b>" }`
- **THEN** a resposta é `400` com `field: "cuisine"` e a mensagem dos caracteres permitidos

#### Scenario: Plano continua sendo checado antes
- **WHEN** o corpo não traz `plan` e traz um nome inadequado
- **THEN** a resposta é `400` com "Escolha o plano: Próprio, Entrega ou Misto." e sem `field`

### Requirement: Horário do perfil na API
O `hours` do `PUT /api/profile` SHALL ser um objeto com exatamente as chaves `seg`, `ter`, `qua`, `qui`, `sex`, `sab` e `dom`, cada uma com uma lista de 0 a 2 turnos `{ open, close }` em `HH:MM`, de 30 em 30 minutos. Uma lista vazia é dia fechado, e uma grade sem nenhum turno é salva como perfil sem horário. Fora desse formato, a resposta MUST ser `400` com `field: "hours"` e "Preencha o horário pela grade da tela de perfil.".

#### Scenario: Horário em texto
- **WHEN** o corpo traz `"hours": "11h às 15h"`
- **THEN** a resposta é `400` com `field: "hours"`, e o perfil salvo não muda

#### Scenario: Minuto fora do passo
- **WHEN** um turno traz `"open": "11:15"`
- **THEN** a resposta é `400` com `field: "hours"`

#### Scenario: Grade toda fechada
- **WHEN** o corpo traz os 7 dias com listas vazias
- **THEN** o perfil é salvo sem `hours`

### Requirement: Regras dos turnos de um dia
Cada turno SHALL ter `open` diferente de `close`; quando `close` é menor que `open`, o turno termina no dia seguinte. Só o último turno do dia MAY passar da meia-noite, o segundo turno MUST começar depois do fim do primeiro, e um turno que passa da meia-noite MUST NOT terminar depois do início do primeiro turno do dia seguinte (o domingo segue para a segunda). Quebrada uma regra, a resposta MUST ser `400` com `field: "hours.<dia>"` e a mensagem do dia.

#### Scenario: Abrir e fechar iguais
- **WHEN** a segunda traz `{ "open": "18:00", "close": "18:00" }`
- **THEN** a resposta é `400` com `field: "hours.seg"` e "Na segunda, o horário de abrir e o de fechar precisam ser diferentes."

#### Scenario: Turnos sobrepostos
- **WHEN** a terça traz `11:00–15:00` e `14:30–23:00`
- **THEN** a resposta é `400` com `field: "hours.ter"` e "Na terça, o segundo turno precisa começar depois do fim do primeiro."

#### Scenario: Madrugada invade o dia seguinte
- **WHEN** a sexta traz `18:00–02:00` e o sábado traz `01:00–05:00`
- **THEN** a resposta é `400` com `field: "hours.sex"` e "O turno de sexta que passa da meia-noite invade o primeiro turno de sábado."

#### Scenario: Turno que vira o dia
- **WHEN** a sexta traz `18:00–02:00` e o sábado traz `11:00–15:00`
- **THEN** o perfil é salvo

### Requirement: Status de conversa na API
`POST /api/chat` e o histórico (`GET /api/sessions/[id]/messages`) SHALL aceitar o status `small_talk`, com a lista de fontes vazia. A rota do turno MUST NOT sair do servidor: a resposta continua sendo exatamente `{ status, answer, sources, sessionId }`.

#### Scenario: Cumprimento pela API
- **WHEN** o navegador envia "boa noite" numa conta com o nome "Marmitaria Boa Panela" no perfil
- **THEN** a resposta é 200 com `status: "small_talk"`, `answer: "Boa noite, Marmitaria Boa Panela! Em que posso ajudar?"`, `sources: []` e o `sessionId`, e nenhum outro campo

#### Scenario: Cumprimento no histórico
- **WHEN** o navegador lê o histórico de uma conversa que começou com "bom dia"
- **THEN** a mensagem do assistente vem com `status: "small_talk"` e `sources: []`

### Requirement: Registrar que a conta viu as boas-vindas
`POST /api/account/welcome` SHALL registrar, na conta logada, o momento em que ela fechou o card de boas-vindas e responder `204` sem corpo. O pedido não tem corpo, e um corpo enviado MUST ser ignorado. Repetir o pedido MUST manter o primeiro registro e responder `204` de novo. A rota MUST NOT alterar o perfil nem as conversas.

#### Scenario: Primeira vez
- **WHEN** uma conta Google que nunca fechou o card envia `POST /api/account/welcome`
- **THEN** a resposta é `204`, e a conta passa a constar como já tendo visto o card

#### Scenario: Pedido repetido
- **WHEN** a mesma conta envia `POST /api/account/welcome` de novo
- **THEN** a resposta é `204`, e o momento registrado continua o da primeira vez

#### Scenario: Falha no banco
- **WHEN** o banco está fora do ar durante o pedido
- **THEN** a resposta segue a regra de erros com texto fixo em PT-BR, como nas outras rotas
