## MODIFIED Requirements

### Requirement: Ordem de um turno
O sistema SHALL processar cada mensagem nesta ordem: guardrail de entrada, sessão e perfil, regra de cumprimento, histórico e resumo, reescrita da pergunta, uma única busca, geração, guardrail de saída e gravação do turno. Quando a regra de cumprimento reconhece a mensagem, o turno pula do cumprimento direto para a gravação (ver `conversation-routing`). A API, a CLI e a avaliação MUST usar o mesmo fluxo.

#### Scenario: Mesmo fluxo nos três canais
- **WHEN** a mesma pergunta chega pelos canais `web`, `cli` e `eval`, com a mesma configuração
- **THEN** as três passam pelos mesmos passos e só o canal gravado na sessão muda

#### Scenario: Cumprimento pula a busca
- **WHEN** o parceiro escreve "bom dia"
- **THEN** o turno passa pelo guardrail de entrada, lê a sessão e o perfil, responde com o texto fixo e grava o turno, sem resumo, reescrita, busca nem geração

### Requirement: Status da resposta
Toda resposta SHALL ter exatamente um destes status: `answered` (respondeu com a base), `small_talk` (respondeu a uma conversa, sem a base), `fallback` (a base não cobre), `blocked_input` (a entrada foi bloqueada) ou `blocked_output` (a saída foi barrada).

#### Scenario: Resposta normal
- **WHEN** há trechos acima do `minScore` e o modelo gera um texto que passa no guardrail de saída
- **THEN** a resposta tem o status `answered` e o texto gerado, aparado

#### Scenario: Cumprimento
- **WHEN** o parceiro escreve "boa tarde"
- **THEN** a resposta tem o status `small_talk` e nenhuma fonte
