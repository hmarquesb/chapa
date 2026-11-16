# Spec Delta

## ADDED Requirements

### Requirement: Etapas do turno em NDJSON
Quando o pedido a `POST /api/chat` traz `Accept: application/x-ndjson` e passa pelas verificações de sessão, formato, limite e conversa, a rota SHALL responder 200 com `Content-Type: application/x-ndjson`, `Cache-Control: no-store` e uma linha JSON por evento: `{ type: "step", step }` no início de cada etapa e, por último, `{ type: "reply", status, answer, sources, sessionId }`, com os mesmos valores da resposta em JSON.

#### Scenario: Pergunta respondida com histórico
- **WHEN** a conta envia, com `Accept: application/x-ndjson`, uma pergunta coberta pela base numa conversa que já tem mensagens
- **THEN** as linhas são, nesta ordem, as etapas `history`, `understanding`, `searching` e `writing` (com `documents` igual ao número de documentos enviados ao modelo) e o `reply` com `status: "answered"`

#### Scenario: Pergunta fora da base
- **WHEN** nenhum trecho passa do `minScore`
- **THEN** a última etapa é `searching` e o `reply` tem `status: "fallback"`, sem a etapa `writing`

#### Scenario: Cumprimento
- **WHEN** a conta envia "bom dia"
- **THEN** a única linha é o `reply` com `status: "small_talk"`

#### Scenario: Bloqueio de entrada
- **WHEN** a mensagem tem um CPF
- **THEN** a única linha é o `reply` com `status: "blocked_input"`

#### Scenario: Sem o cabeçalho
- **WHEN** o pedido não traz `Accept: application/x-ndjson`
- **THEN** a resposta é o JSON de sempre, com exatamente `{ status, answer, sources, sessionId }`

### Requirement: Etapas sem conteúdo
Um evento de etapa SHALL ter só `type`, `step` (`history`, `understanding`, `searching` ou `writing`) e, na etapa `writing`, `documents`. A pergunta reescrita, os trechos, os nomes dos arquivos, o prompt e o consumo MUST NOT ir nas etapas. O texto da resposta MUST sair só no `reply`, inteiro, depois do guardrail de saída.

#### Scenario: Etapa de escrita
- **WHEN** o modelo recebe dois documentos
- **THEN** a linha da etapa é exatamente `{"type":"step","step":"writing","documents":2}`

#### Scenario: Resposta barrada na saída
- **WHEN** a resposta gerada é barrada pelo guardrail de saída
- **THEN** nenhuma linha traz o texto gerado, e o `reply` tem `status: "blocked_output"` e a mensagem fixa

### Requirement: Erros antes e depois do início das etapas
Os erros que acontecem antes do turno começar SHALL continuar em JSON, com o status HTTP e o texto de sempre, mesmo com `Accept: application/x-ndjson`. Um erro depois da primeira linha SHALL encerrar o corpo com `{ type: "error", error }`, com o mesmo texto fixo em PT-BR que a rota daria em JSON, e nenhuma linha depois dele.

#### Scenario: Sem sessão
- **WHEN** um pedido sem sessão traz `Accept: application/x-ndjson`
- **THEN** a resposta é 401 em JSON, como sem o cabeçalho

#### Scenario: Limite por minuto
- **WHEN** a conta passa do limite por minuto com `Accept: application/x-ndjson`
- **THEN** a resposta é 429 em JSON, com `Retry-After`

#### Scenario: Falha inesperada no meio
- **WHEN** o turno lança um erro inesperado depois da etapa `searching`
- **THEN** a última linha é `{"type":"error","error":"Algo deu errado do nosso lado. Tente de novo."}`, e o turno não é gravado

#### Scenario: Modelo indisponível no meio
- **WHEN** a chamada de geração falha por indisponibilidade depois da etapa `writing`
- **THEN** a última linha é o `error` com o mesmo texto que a rota dá no 503 em JSON

### Requirement: Log do pedido em NDJSON
Um pedido em NDJSON SHALL gerar uma única linha de log, escrita quando o corpo termina, com os mesmos campos do pedido em JSON: `status: 200` e os dados do turno quando termina com `reply`, ou o status do erro e o nome do erro quando termina com `error`. As etapas MUST NOT gerar linhas de log.

#### Scenario: Pergunta respondida
- **WHEN** um pedido em NDJSON termina com o `reply`
- **THEN** há uma linha de log, com `status: 200`, o `replyStatus`, a `replyRoute` e os tokens, sem o texto da mensagem

#### Scenario: Erro no meio
- **WHEN** um pedido em NDJSON termina com `error` porque o modelo ficou indisponível
- **THEN** há uma linha de log, com `status: 503` e o nome do erro, embora o HTTP enviado tenha sido 200
