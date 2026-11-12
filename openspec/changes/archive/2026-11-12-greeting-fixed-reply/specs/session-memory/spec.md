## ADDED Requirements

### Requirement: Turno de conversa gravado como os outros
O turno com o status `small_talk` SHALL ser gravado como qualquer turno, com a mensagem do parceiro, a resposta, o status e a lista de fontes vazia, e MUST entrar no histórico recente e no resumo dos turnos seguintes. O turno de cumprimento MUST NOT fazer o resumo: as mensagens pendentes ficam para o próximo turno que passa pela memória.

#### Scenario: Cumprimento antes da dúvida
- **WHEN** o parceiro escreve "bom dia" e, em seguida, "quando cai o repasse?"
- **THEN** o histórico ganha quatro mensagens, e a segunda pergunta recebe o cumprimento e a resposta fixa no histórico recente

#### Scenario: Cumprimento com muitas mensagens pendentes
- **WHEN** o parceiro escreve "oi" numa conversa com 17 mensagens pendentes
- **THEN** o turno é gravado sem resumo novo, e o resumo é feito no turno seguinte que passa pela memória
