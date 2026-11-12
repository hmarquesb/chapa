## MODIFIED Requirements

### Requirement: Contexto rotulado por fonte
A mensagem enviada ao modelo SHALL trazer as instruções de resposta, quatro exemplos fictícios (respondido pelo contexto, fallback, pergunta informal respondida pelo contexto e pergunta com nome de área em minúsculas respondida pelo contexto), os blocos do contexto separados por `---`, cada um rotulado `[Fonte: <arquivo> › <seção>]` (ou `[Fonte: <arquivo>]`, sem seção ou documento inteiro), e por último a pergunta original do parceiro. As instruções SHALL manter a regra do fallback exato, dizer que a pergunta pode usar palavras diferentes das do contexto e dizer que maiúsculas e minúsculas não mudam o sentido da pergunta, inclusive nos nomes de área, de tela e de tipo de chamado.

#### Scenario: Trecho sem seção
- **WHEN** um trecho recuperado não tem seção
- **THEN** o rótulo dele é `[Fonte: <arquivo>]`

#### Scenario: Pergunta original, não a reescrita
- **WHEN** a pergunta foi reescrita para a busca
- **THEN** a mensagem enviada ao modelo termina com a pergunta original do parceiro

#### Scenario: Documento inteiro
- **WHEN** o contexto tem o documento `04-cardapio-e-fotos.md` inteiro
- **THEN** o bloco dele começa com `[Fonte: 04-cardapio-e-fotos.md]` e traz todas as seções do documento

#### Scenario: Exemplo de pergunta informal
- **WHEN** o sistema monta a mensagem enviada ao modelo
- **THEN** ela traz um terceiro exemplo fictício, sem números, em que a pergunta usa palavras diferentes das do contexto e a resposta vem do contexto, e continua trazendo o exemplo que cai no fallback

#### Scenario: Regra do fallback mantida
- **WHEN** o sistema monta a mensagem enviada ao modelo
- **THEN** ela continua pedindo o texto exato do fallback quando a resposta não estiver no contexto

#### Scenario: Caixa das letras
- **WHEN** o sistema monta a mensagem enviada ao modelo
- **THEN** as instruções dizem que maiúsculas e minúsculas não mudam o sentido da pergunta e dão "financeiro" e "Financeiro" como exemplo da mesma coisa

#### Scenario: Exemplo de área em minúsculas
- **WHEN** o sistema monta a mensagem enviada ao modelo
- **THEN** ela traz um quarto exemplo fictício, sem números, em que o contexto cita um tipo de chamado com maiúscula, a pergunta cita a mesma área em minúsculas e a resposta vem do contexto

#### Scenario: Mesma pergunta em grafias diferentes
- **WHEN** o parceiro pergunta "Como falo com o financeiro?" e, em outra conversa, "Como falo com o Financeiro?", com os mesmos trechos recuperados
- **THEN** a mensagem enviada ao modelo difere só na pergunta, e as duas trazem a instrução sobre a caixa das letras
