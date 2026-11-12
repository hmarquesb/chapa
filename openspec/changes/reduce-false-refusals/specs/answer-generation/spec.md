## MODIFIED Requirements

### Requirement: Ordem de um turno
O sistema SHALL processar cada mensagem nesta ordem: guardrail de entrada, sessão e perfil, regra de cumprimento, histórico e resumo, roteador de conversa, reescrita da pergunta, uma única busca, montagem do contexto (ver `retrieval`), geração, guardrail de saída e gravação do turno. Quando a regra de cumprimento reconhece a mensagem, o turno pula do cumprimento direto para a gravação, e quando o roteador responde, pula do roteador direto para a gravação (ver `conversation-routing`). A API, a CLI e a avaliação MUST usar o mesmo fluxo.

#### Scenario: Mesmo fluxo nos três canais
- **WHEN** a mesma pergunta chega pelos canais `web`, `cli` e `eval`, com a mesma configuração
- **THEN** as três passam pelos mesmos passos e só o canal gravado na sessão muda

#### Scenario: Cumprimento pula a busca
- **WHEN** o parceiro escreve "bom dia"
- **THEN** o turno passa pelo guardrail de entrada, lê a sessão e o perfil, responde com o texto fixo e grava o turno, sem resumo, reescrita, busca nem geração

#### Scenario: Conversa pula a busca
- **WHEN** o parceiro escreve "valeu, era só isso" e o roteador responde
- **THEN** o turno passa pela memória e pelo roteador e grava o turno, sem reescrita, busca nem geração

#### Scenario: Contexto montado depois da busca
- **WHEN** a busca devolve trechos e o modo de contexto é `documents`
- **THEN** o contexto é montado antes da geração, e a busca continua sendo uma só por turno

### Requirement: Contexto rotulado por fonte
A mensagem enviada ao modelo SHALL trazer as instruções de resposta, três exemplos fictícios (um respondido pelo contexto, um que cai no fallback e um de pergunta informal respondida pelo contexto), os blocos do contexto separados por `---`, cada um rotulado `[Fonte: <arquivo> › <seção>]` (ou `[Fonte: <arquivo>]`, quando o bloco é um documento inteiro ou um trecho sem seção), e por último a pergunta original do parceiro. As instruções SHALL manter a regra do fallback exato e SHALL dizer que a pergunta pode usar palavras diferentes das do contexto e que, se o contexto trata do assunto perguntado, a resposta vem do que ele diz.

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

### Requirement: Fontes só nas respostas respondidas
Quando a resposta tem o status `answered`, o sistema SHALL devolver como fontes os nomes de arquivo únicos do contexto enviado ao modelo, na ordem do contexto. Em qualquer outro status, a lista de fontes MUST ser vazia.

#### Scenario: Dois trechos do mesmo arquivo
- **WHEN** o modo é `chunks` e os trechos do contexto vêm de `02-repasse-financeiro.md`, `02-repasse-financeiro.md` e `01-planos-e-taxas.md`, nessa ordem de score
- **THEN** as fontes são `["02-repasse-financeiro.md", "01-planos-e-taxas.md"]`

#### Scenario: Arquivo que ficou fora do contexto
- **WHEN** o modo é `documents`, a busca devolve trechos de 4 arquivos e o contexto leva 3 documentos
- **THEN** as fontes são esses 3 arquivos, e o quarto não aparece
