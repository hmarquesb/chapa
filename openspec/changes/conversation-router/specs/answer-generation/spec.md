## MODIFIED Requirements

### Requirement: Ordem de um turno
O sistema SHALL processar cada mensagem nesta ordem: guardrail de entrada, sessão e perfil, regra de cumprimento, histórico e resumo, roteador de conversa, reescrita da pergunta, uma única busca, geração, guardrail de saída e gravação do turno. Quando a regra de cumprimento reconhece a mensagem, o turno pula do cumprimento direto para a gravação, e quando o roteador responde, pula do roteador direto para a gravação (ver `conversation-routing`). A API, a CLI e a avaliação MUST usar o mesmo fluxo.

#### Scenario: Mesmo fluxo nos três canais
- **WHEN** a mesma pergunta chega pelos canais `web`, `cli` e `eval`, com a mesma configuração
- **THEN** as três passam pelos mesmos passos e só o canal gravado na sessão muda

#### Scenario: Cumprimento pula a busca
- **WHEN** o parceiro escreve "bom dia"
- **THEN** o turno passa pelo guardrail de entrada, lê a sessão e o perfil, responde com o texto fixo e grava o turno, sem resumo, reescrita, busca nem geração

#### Scenario: Conversa pula a busca
- **WHEN** o parceiro escreve "valeu, era só isso" e o roteador responde
- **THEN** o turno passa pela memória e pelo roteador e grava o turno, sem reescrita, busca nem geração

### Requirement: Instrução de sistema
A instrução de sistema SHALL apresentar o assistente como o Chapa, o assistente de parceiros da Rango, para restaurantes que já são parceiros, listar os temas da base e exigir: PT-BR simples e cordial em até 150 palavras, passo a passo numerado para procedimentos, resposta só com base no contexto sem inventar números, prazos, valores, planos ou telas, nada de dados sensíveis, nenhuma ação executada, nenhuma lista de fontes no texto, o fallback exato fora do escopo e, quando a mensagem começa com um cumprimento, retribuí-lo em poucas palavras antes de responder.

#### Scenario: Cadastro de novo restaurante
- **WHEN** a pergunta é sobre como se cadastrar como novo restaurante
- **THEN** a instrução de sistema manda responder com o fallback exato

#### Scenario: Assistente da Rango
- **WHEN** o sistema monta a instrução de sistema
- **THEN** ela diz que o Chapa é o assistente de parceiros da Rango e não cita "app de delivery" nem "Portal do Parceiro"

#### Scenario: Temas da base
- **WHEN** o sistema monta a instrução de sistema
- **THEN** ela lista os temas da base: planos e taxas, repasse, cancelamentos e contestações, cardápio e fotos, horários e pausas, avaliações, embalagem e entrega, promoções e cupons, suporte e chamados, conta e segurança, pagamentos e notas fiscais

#### Scenario: Mensagem mista
- **WHEN** o parceiro escreve "bom dia, quanto é a comissão do Plano Próprio?" e a busca acha trechos
- **THEN** a instrução de sistema pede para retribuir o cumprimento antes de responder, e o resto da geração não muda

### Requirement: Consumo e latência por turno
O sistema SHALL somar, por turno, as chamadas e os tokens de entrada e de saída de todas as chamadas ao provedor (resumo, roteador, reescrita, embedding e geração) e medir a latência do turno e a da chamada do roteador, quando ela acontece, para os logs e a avaliação.

#### Scenario: Turno com reescrita
- **WHEN** um turno faz a reescrita, o embedding e a geração
- **THEN** o consumo informado é a soma das três chamadas

#### Scenario: Pergunta curta que segue para o RAG
- **WHEN** o roteador devolve `DUVIDA` e o turno segue com o embedding e a geração
- **THEN** o consumo informado é a soma das três chamadas, e a latência do roteador é informada à parte
