## MODIFIED Requirements

### Requirement: Página única em PT-BR
A interface do chat SHALL ser uma página só, em `/`, aberta só com sessão válida e perfil com plano (ver `auth`), em PT-BR (`lang="pt-BR"`), com o logo da Rango, o título "Chapa", a linha de subtítulo, o menu da conta, a lista de conversas, o botão "Nova conversa", o resumo do perfil, a conversa, a caixa de mensagem e o rodapé com o aviso de empresa fictícia e o link "Privacidade".

#### Scenario: Textos fixos
- **WHEN** alguém logado, com o perfil salvo, abre a página
- **THEN** o subtítulo é "Tire dúvidas sobre taxas, repasse, cancelamentos, cardápio e avaliações." e o rodapé é "Rango é uma empresa fictícia, criada para um projeto de estudo, sem afiliação com nenhuma empresa de delivery. As conversas são apagadas depois de 30 dias sem uso. Não envie dados pessoais.", seguido do link "Privacidade"

#### Scenario: Primeira visita
- **WHEN** alguém logado, com o perfil salvo, abre a página pela primeira vez
- **THEN** vê o logo, o título, o menu da conta, a lista de conversas vazia, o resumo do perfil, a dica "Faça uma pergunta sobre a operação do seu restaurante ou escolha um exemplo abaixo.", as perguntas de exemplo, a caixa de mensagem e o rodapé com o aviso de empresa fictícia

### Requirement: Resposta inteira, sem streaming
A interface SHALL mostrar a resposta só quando ela chega inteira, depois do guardrail de saída. Enquanto espera, MUST mostrar a mensagem do parceiro como "enviando…" e o indicador "Chapa está pensando…" (o avatar do Chapa com três pontos pulsando), e bloquear o envio de outra mensagem e a troca de conversa.

#### Scenario: Esperando a resposta
- **WHEN** o parceiro envia uma pergunta
- **THEN** a pergunta aparece na conversa como "enviando…", o indicador "Chapa está pensando…" aparece, e a caixa de mensagem, os exemplos, "Nova conversa" e os itens da lista ficam desabilitados até a resposta

#### Scenario: Esperando com movimento reduzido
- **WHEN** o parceiro envia uma pergunta com `prefers-reduced-motion: reduce`
- **THEN** o indicador mostra o texto "Chapa está pensando…", sem pontos se mexendo

#### Scenario: Leitor de tela esperando
- **WHEN** um leitor de tela acompanha a conversa enquanto a resposta não chega
- **THEN** ele anuncia "Chapa está pensando…"

## ADDED Requirements

### Requirement: Avatar do Chapa nas respostas
Toda mensagem do Chapa SHALL aparecer com o avatar do Chapa ao lado, inclusive o fallback e os bloqueios. As mensagens do parceiro MUST NOT ter avatar e ficam alinhadas do outro lado.

#### Scenario: Conversa com três respostas
- **WHEN** a conversa tem uma resposta com fontes, um fallback e um bloqueio
- **THEN** as três aparecem com o avatar do Chapa à esquerda, e as perguntas do parceiro aparecem à direita, sem avatar
