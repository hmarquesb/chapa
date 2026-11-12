## ADDED Requirements

### Requirement: Conversa com aparência de resposta
A resposta com o status `small_talk` SHALL aparecer no mesmo balão da resposta com o status `answered`, sem a linha de fontes e sem o ícone de aviso. Só `fallback`, `blocked_input` e `blocked_output` continuam como aviso.

#### Scenario: Bom dia no chat
- **WHEN** o parceiro manda "bom dia" e a resposta tem o status `small_talk`
- **THEN** ela aparece no balão de resposta do Chapa, sem "Fontes:" e sem ícone

#### Scenario: Cumprimento numa conversa reaberta
- **WHEN** o parceiro abre uma conversa antiga cujo histórico tem uma resposta `small_talk`
- **THEN** ela aparece com a mesma aparência de quando foi recebida
