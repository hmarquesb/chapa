# Spec Delta

## ADDED Requirements

### Requirement: Lista de conversas
O chat SHALL mostrar as conversas da conta, numa barra lateral em telas largas e num painel aberto pelo botão "Conversas" no celular. Cada item mostra o título e a última atividade ("14:05" no mesmo dia, "10/11" em outro dia), e a conversa aberta fica marcada. Ao abrir o chat, a conversa começa vazia, e escolher um item carrega o histórico dele.

#### Scenario: Voltar a uma conversa
- **WHEN** a conta abre o chat e escolhe uma conversa antiga na lista
- **THEN** o histórico dela aparece e a próxima mensagem continua essa conversa

#### Scenario: Primeira resposta de uma conversa nova
- **WHEN** a primeira mensagem de uma conversa nova recebe resposta
- **THEN** a conversa aparece no topo da lista, marcada como aberta

#### Scenario: Celular
- **WHEN** a tela tem menos de 768 px de largura e o parceiro toca em "Conversas"
- **THEN** a lista abre num painel lateral, que fecha ao escolher uma conversa

### Requirement: Apagar uma conversa
Cada item da lista SHALL ter a ação "Apagar conversa", que pede confirmação num diálogo com o texto "Apagar esta conversa? Ela some da lista e não pode ser recuperada." e os botões "Apagar" e "Cancelar". Se a conversa apagada era a aberta, a tela volta ao estado de conversa nova.

#### Scenario: Apagar a conversa aberta
- **WHEN** o parceiro apaga a conversa que está aberta e confirma
- **THEN** a conversa some da lista, e a tela volta ao estado vazio com os exemplos

#### Scenario: Desistir de apagar
- **WHEN** o parceiro abre o diálogo e clica em "Cancelar"
- **THEN** nada é apagado

### Requirement: Link antigo de conversa
Um endereço com `?sessao=` SHALL ser aceito sem erro e sem abrir a conversa daquele id: sem login, leva a `/entrar`; com login, abre o chat numa conversa nova, sem o parâmetro na barra de endereço.

#### Scenario: Link antigo com login
- **WHEN** uma conta logada abre `/?sessao=<uuid>`
- **THEN** o endereço passa a ser `/` e o chat abre numa conversa nova, sem aviso de erro

#### Scenario: Link antigo sem login
- **WHEN** alguém sem sessão abre `/?sessao=<uuid>`
- **THEN** é levado a `/entrar`

## MODIFIED Requirements

### Requirement: Página única em PT-BR
A interface do chat SHALL ser uma página só, em `/`, aberta só com sessão válida (ver `auth`), em PT-BR (`lang="pt-BR"`), com o título "Chapa", a linha "Tire dúvidas sobre taxas, repasse, cancelamentos, cardápio e avaliações.", o menu da conta, a lista de conversas, o botão "Nova conversa", o perfil, a conversa, a caixa de mensagem e o rodapé "Projeto de estudo, não oficial e sem afiliação com nenhuma empresa de delivery. As conversas são apagadas depois de 30 dias sem uso. Não envie dados pessoais."

#### Scenario: Primeira visita
- **WHEN** alguém logado abre a página pela primeira vez
- **THEN** vê o título, o menu da conta, a lista de conversas vazia, o perfil recolhido, a dica "Faça uma pergunta sobre a operação do seu restaurante ou escolha um exemplo abaixo.", as perguntas de exemplo, a caixa de mensagem e o rodapé com o aviso de não afiliação

### Requirement: Resposta inteira, sem streaming
A interface SHALL mostrar a resposta só quando ela chega inteira, depois do guardrail de saída. Enquanto espera, MUST mostrar a mensagem do parceiro como "enviando…" e a linha "Digitando…", e bloquear o envio de outra mensagem e a troca de conversa.

#### Scenario: Esperando a resposta
- **WHEN** o parceiro envia uma pergunta
- **THEN** a pergunta aparece na conversa como "enviando…", a linha "Digitando…" aparece, e a caixa de mensagem, os exemplos, "Nova conversa" e os itens da lista ficam desabilitados até a resposta

### Requirement: Conversa que não existe mais
Quando o servidor responde 404 ao abrir ou continuar uma conversa, a interface SHALL tirar a conversa da lista, voltar ao estado de conversa nova e avisar "Esta conversa não existe mais. Começamos uma nova." Em outro erro, MUST mostrar o erro e manter a conversa aberta.

#### Scenario: Sessão expirada
- **WHEN** o parceiro tenta continuar uma conversa que a limpeza já apagou
- **THEN** a tela fica vazia com o aviso de conversa inexistente, a conversa some da lista e a próxima mensagem cria uma conversa nova

#### Scenario: Conversa apagada em outro navegador
- **WHEN** o parceiro escolhe na lista uma conversa que foi apagada em outro navegador
- **THEN** a tela fica vazia com o aviso de conversa inexistente, e a conversa some da lista

### Requirement: Nova conversa
O botão "Nova conversa" SHALL limpar a conversa, os avisos e o rascunho, desmarcar a conversa aberta na lista e manter o perfil. A próxima mensagem cria uma conversa nova no servidor.

#### Scenario: Começar de novo
- **WHEN** o parceiro clica em "Nova conversa"
- **THEN** a tela volta ao estado vazio com os exemplos, e a próxima mensagem cria uma conversa nova, que aparece na lista

### Requirement: Link não vaza em referrer
A página SHALL usar a política `no-referrer`, para que nenhum endereço do chat saia no cabeçalho `Referer`.

#### Scenario: Clique num link externo
- **WHEN** o parceiro sai da página por um link externo
- **THEN** o destino não recebe o endereço da página

### Requirement: Funciona sem localStorage
Se o navegador bloquear o `localStorage`, a interface SHALL continuar funcionando, só sem guardar o perfil entre recargas.

#### Scenario: Navegação privada com armazenamento bloqueado
- **WHEN** o `localStorage` lança erro em toda leitura e escrita
- **THEN** o chat envia e recebe mensagens e a lista de conversas funciona normalmente

## REMOVED Requirements

### Requirement: Sessão salva no navegador
**Reason**: A conversa pertence à conta, e o servidor gera o id. O navegador não guarda mais o id da conversa.
**Migration**: Ver "Lista de conversas". A conta reabre uma conversa pela lista.

### Requirement: Link de continuação
**Reason**: O id da conversa deixa de ser credencial. Só o dono abre a conversa, de qualquer navegador em que entrar.
**Migration**: Entrar na mesma conta no outro dispositivo e abrir a conversa pela lista.

### Requirement: Cópia manual do link
**Reason**: Sai junto com o link de continuação.
**Migration**: Nenhuma.

### Requirement: Abrir pelo link de continuação
**Reason**: O link de continuação deixa de existir.
**Migration**: Ver "Link antigo de conversa".
