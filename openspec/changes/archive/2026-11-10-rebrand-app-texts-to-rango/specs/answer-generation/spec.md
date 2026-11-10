# Spec Delta

## MODIFIED Requirements

### Requirement: Fallback sem chamar o LLM de resposta
Quando a busca não devolve nenhum trecho acima do `minScore`, o sistema SHALL responder com a mensagem de fallback, com o status `fallback` e sem fontes, sem chamar o modelo de resposta.

#### Scenario: Pergunta fora da base
- **WHEN** o parceiro pergunta "Me passa uma receita de lasanha?" e nenhum trecho passa do `minScore`
- **THEN** a resposta é "Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.", com o status `fallback`, sem fontes e sem chamada ao modelo de resposta

### Requirement: Texto único do fallback
A mensagem de fallback SHALL ser sempre "Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango.", definida num único lugar e usada tanto na resposta direta quanto nas instruções enviadas ao modelo.

#### Scenario: Instrução usa o mesmo texto
- **WHEN** o sistema monta as instruções do modelo
- **THEN** elas pedem para responder exatamente com o texto do fallback quando a resposta não estiver no contexto

### Requirement: Instrução de sistema
A instrução de sistema SHALL apresentar o assistente como o Chapa, o assistente de parceiros da Rango, para restaurantes que já são parceiros, listar os temas da base (planos e taxas, repasse, cancelamentos e contestações, cardápio e fotos, horários e pausas, avaliações, embalagem e entrega, promoções e cupons, suporte e chamados, conta e segurança, pagamentos e notas fiscais) e exigir: PT-BR simples e cordial em até 150 palavras, passo a passo numerado para procedimentos, resposta só com base no contexto sem inventar números, prazos, valores, planos ou telas, nada de dados sensíveis, nenhuma ação executada, nenhuma lista de fontes no texto e o fallback exato fora do escopo.

#### Scenario: Cadastro de novo restaurante
- **WHEN** a pergunta é sobre como se cadastrar como novo restaurante
- **THEN** a instrução de sistema manda responder com o fallback exato

#### Scenario: Assistente da Rango
- **WHEN** o sistema monta a instrução de sistema
- **THEN** ela diz que o Chapa é o assistente de parceiros da Rango e não cita "app de delivery" nem "Portal do Parceiro"
