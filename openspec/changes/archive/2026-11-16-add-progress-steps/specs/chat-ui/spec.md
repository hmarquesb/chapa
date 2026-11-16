# Spec Delta

## MODIFIED Requirements

### Requirement: Resposta inteira, sem streaming
A interface SHALL mostrar a resposta só quando ela chega inteira, depois do guardrail de saída. Enquanto espera, MUST mostrar a mensagem do parceiro como "enviando…" e o indicador "Chapa está pensando…" (o avatar do Chapa com três pontos pulsando), e bloquear o envio de outra mensagem e a troca de conversa. Quando a API manda as etapas do turno, o indicador SHALL mostrar a lista das etapas recebidas, as anteriores marcadas como feitas e a última com os três pontos, e sumir quando a resposta chega.

#### Scenario: Esperando a resposta
- **WHEN** o parceiro envia uma pergunta
- **THEN** a pergunta aparece na conversa como "enviando…", o indicador "Chapa está pensando…" aparece, e a caixa de mensagem, os exemplos, "Nova conversa" e os itens da lista ficam desabilitados até a resposta

#### Scenario: Etapas de uma pergunta respondida
- **WHEN** a API manda as etapas `history`, `understanding`, `searching` e `writing` com `documents: 2`
- **THEN** o indicador mostra, uma depois da outra, "Lendo a conversa", "Entendendo a pergunta", "Buscando na base de conhecimento" e "Escrevendo a resposta com base em 2 documentos", com as anteriores marcadas como feitas, e some quando a resposta aparece

#### Scenario: Um documento só
- **WHEN** a etapa `writing` chega com `documents: 1`
- **THEN** o indicador mostra "Escrevendo a resposta com base em 1 documento"

#### Scenario: Resposta sem etapas
- **WHEN** a API responde só com o `reply`, como num cumprimento, ou em JSON
- **THEN** o indicador mostra "Chapa está pensando…" até a resposta, sem lista de etapas

#### Scenario: Erro depois das etapas
- **WHEN** a API manda etapas e termina com `{ type: "error", error }`
- **THEN** a interface age como na falha no envio: a mensagem pendente some, o texto volta à caixa e o texto do `error` aparece

#### Scenario: Esperando com movimento reduzido
- **WHEN** o parceiro envia uma pergunta com `prefers-reduced-motion: reduce`
- **THEN** o indicador mostra o texto "Chapa está pensando…" ou a etapa atual, sem pontos se mexendo

#### Scenario: Leitor de tela esperando
- **WHEN** um leitor de tela acompanha a conversa enquanto a resposta não chega
- **THEN** ele anuncia "Chapa está pensando…" e, depois, cada etapa nova, uma vez
