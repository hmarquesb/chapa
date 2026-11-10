# Spec Delta

## Purpose

Expõe o assistente ao navegador por rotas HTTP próprias, com validação do pedido, limite de tamanho e de frequência, erros em PT-BR sem detalhes internos, logs sem conteúdo e a limpeza diária das sessões expiradas.

## ADDED Requirements

### Requirement: Enviar uma mensagem
`POST /api/chat` SHALL receber `{ sessionId, message, profile? }`, passar a mensagem ao assistente pelo canal `web` e responder 200 com exatamente `{ status, answer, sources }`. A pergunta reescrita, os trechos recuperados e o consumo MUST NOT sair do servidor.

#### Scenario: Pergunta respondida
- **WHEN** o navegador envia uma pergunta coberta pela base
- **THEN** a resposta é 200 com `status: "answered"`, o texto da resposta e a lista de fontes, e nenhum outro campo

#### Scenario: Bloqueio não é erro HTTP
- **WHEN** a mensagem tem um CPF ou passa de 1.000 caracteres, num corpo de até 4.096 bytes
- **THEN** a resposta é 200 com `status: "blocked_input"` e a mensagem do guardrail, porque a validação do formato não olha o tamanho nem o conteúdo da mensagem

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
`POST /api/chat` SHALL responder 400 com um motivo em PT-BR quando o corpo não é um objeto, tem campos além de `sessionId`, `message` e `profile`, tem `sessionId` que não é UUID, tem `message` que não é texto, ou tem `profile` que não é um objeto só com `name`, `plan`, `cuisine`, `city` e `hours` em texto de até 60 caracteres.

#### Scenario: Campo desconhecido
- **WHEN** o corpo traz `{ "sessionId": "<uuid>", "message": "oi", "role": "admin" }`
- **THEN** a resposta é 400 com "O pedido tem campos desconhecidos."

#### Scenario: Campo do perfil longo demais
- **WHEN** o perfil traz `city` com 61 caracteres
- **THEN** a resposta é 400 com "O perfil do restaurante é inválido."

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
`GET /api/sessions/[id]/messages` SHALL responder 200 com `{ sessionId, profile, messages }`, em que cada mensagem tem `id`, `role`, `content`, `status` (nulo nas do parceiro), `sources` e `createdAt` em ISO 8601, na ordem de gravação. A leitura MUST NOT alterar a última atividade da sessão.

#### Scenario: Sessão existente
- **WHEN** o navegador pede o histórico de uma sessão com dois turnos
- **THEN** a resposta é 200 com o perfil salvo e as quatro mensagens em ordem

#### Scenario: Sessão que não existe
- **WHEN** o id é um UUID que o banco não conhece, ou de uma sessão já apagada
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
`GET /api/cron/cleanup` SHALL exigir `Authorization: Bearer <CRON_SECRET>`, comparado em tempo constante, e responder 401 com "Acesso não autorizado." sem ele. Autorizado, apaga as sessões sem atividade há mais de 7 dias e as janelas de rate limit com mais de 2 dias, e responde `{ deletedSessions, deletedRateLimits }`. Roda uma vez por dia.

#### Scenario: Chamada do agendador
- **WHEN** o agendador chama a rota com o segredo certo
- **THEN** a resposta é 200 com o número de sessões e de janelas apagadas

#### Scenario: Sem segredo
- **WHEN** alguém chama a rota sem o cabeçalho ou com outro segredo
- **THEN** a resposta é 401 e nada é apagado

### Requirement: Logs sem conteúdo
Cada pedido SHALL gerar uma linha de log em JSON com o modelo da rota (por exemplo `/api/sessions/[id]/messages`), o método, o status HTTP, a latência e, quando houver, o status da resposta, as chamadas, os tokens e o nome do erro. O conteúdo das mensagens, o perfil, o `sessionId` e o IP MUST NOT ser registrados.

#### Scenario: Pedido de histórico
- **WHEN** o navegador lê o histórico de uma sessão
- **THEN** o log registra `/api/sessions/[id]/messages`, sem o id real

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
