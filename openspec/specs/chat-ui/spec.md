# chat-ui Specification

## Purpose
Dá ao restaurante parceiro uma página única de chat em PT-BR, sem login, com as fontes de cada resposta, o perfil opcional, a conversa que sobrevive ao recarregar e o link para continuar em outro navegador.

## Requirements

### Requirement: Página única em PT-BR
A interface do chat SHALL ser uma página só, em `/`, aberta só com sessão válida e perfil com plano (ver `auth`), em PT-BR (`lang="pt-BR"`), com o logo da Rango, o título "Chapa", a linha de subtítulo, o menu da conta, a lista de conversas, o botão "Nova conversa", o resumo do perfil, a conversa, a caixa de mensagem e o rodapé com o aviso de empresa fictícia e o link "Privacidade".

#### Scenario: Textos fixos
- **WHEN** alguém logado, com o perfil salvo, abre a página
- **THEN** o subtítulo é "Tire dúvidas sobre taxas, repasse, cancelamentos, cardápio e avaliações." e o rodapé é "Rango é uma empresa fictícia, criada para um projeto de estudo, sem afiliação com nenhuma empresa de delivery. As conversas são apagadas depois de 30 dias sem uso. Não envie dados pessoais.", seguido do link "Privacidade"

#### Scenario: Primeira visita
- **WHEN** alguém logado, com o perfil salvo, abre a página pela primeira vez
- **THEN** vê o logo, o título, o menu da conta, a lista de conversas vazia, o resumo do perfil, a dica "Faça uma pergunta sobre a operação do seu restaurante ou escolha um exemplo abaixo.", as perguntas de exemplo, a caixa de mensagem e o rodapé com o aviso de empresa fictícia

### Requirement: Sem marca de empresa real
A interface MUST NOT mostrar logo, nome ou cores de empresas reais de delivery. As cores, as fontes e as formas SHALL ser as da identidade da Rango (ver `brand`).

#### Scenario: Revisão visual
- **WHEN** alguém percorre a página inteira
- **THEN** não encontra marca, nome ou paleta de nenhuma empresa real, e as cores são as da paleta da Rango

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

### Requirement: Caixa de mensagem
A caixa de mensagem SHALL enviar com Enter e quebrar a linha com Shift+Enter, desabilitar o botão "Enviar" quando o texto está vazio, ignorar mensagens só com espaços e devolver o foco à caixa quando a resposta chega.

#### Scenario: Shift+Enter
- **WHEN** o parceiro aperta Shift+Enter
- **THEN** a caixa ganha uma linha nova e nada é enviado

### Requirement: Fontes embaixo da resposta
A resposta com o status `answered` SHALL aparecer como um cartão com o texto e, quando houver, a linha "Fontes:" com um selo por arquivo, sem repetir arquivos. O selo mostra o nome legível (sem número, extensão e hífens, como "repasse financeiro" para `02-repasse-financeiro.md`) e o nome completo do arquivo como dica.

#### Scenario: Resposta com duas fontes
- **WHEN** a resposta traz as fontes `02-repasse-financeiro.md` e `01-planos-e-taxas.md`
- **THEN** a linha "Fontes:" mostra os selos "repasse financeiro" e "planos e taxas"

### Requirement: Fallback e bloqueios com aparência própria
As respostas com o status `fallback`, `blocked_input` ou `blocked_output` SHALL aparecer como um aviso, sem fontes, com um ícone de informação no fallback e um ícone de escudo nos bloqueios.

#### Scenario: Pergunta fora da base
- **WHEN** a resposta tem o status `fallback`
- **THEN** ela aparece como aviso com o ícone de informação e sem a linha "Fontes:"

### Requirement: Horário das mensagens
Cada mensagem SHALL mostrar o horário em 24 horas no formato do Brasil (por exemplo "14:05"), formatado pelo próprio navegador.

#### Scenario: Mensagem do histórico
- **WHEN** o histórico traz uma mensagem criada às 14:05 no fuso do navegador
- **THEN** ela mostra "14:05"

### Requirement: Perguntas de exemplo
Com a conversa vazia e sem carregamento em curso, a interface SHALL mostrar três perguntas de exemplo, "Quando o repasse cai na minha conta?", "Quem paga o desconto quando eu crio um cupom?" e "Me passa uma receita de lasanha?", e enviar a escolhida como se o parceiro a tivesse digitado.

#### Scenario: Clique num exemplo
- **WHEN** o parceiro clica em "Quando o repasse cai na minha conta?"
- **THEN** essa pergunta é enviada e os exemplos somem quando a conversa deixa de estar vazia

### Requirement: Conversa que não existe mais
Quando o servidor responde 404 ao abrir ou continuar uma conversa, a interface SHALL tirar a conversa da lista, voltar ao estado de conversa nova e avisar "Esta conversa não existe mais. Começamos uma nova." Em outro erro, MUST mostrar o erro e manter a conversa aberta.

#### Scenario: Sessão expirada
- **WHEN** o parceiro tenta continuar uma conversa que a limpeza já apagou
- **THEN** a tela fica vazia com o aviso de conversa inexistente, a conversa some da lista e a próxima mensagem cria uma conversa nova

#### Scenario: Conversa apagada em outro navegador
- **WHEN** o parceiro escolhe na lista uma conversa que foi apagada em outro navegador
- **THEN** a tela fica vazia com o aviso de conversa inexistente, e a conversa some da lista

### Requirement: Link não vaza em referrer
A página SHALL usar a política `no-referrer`, para que nenhum endereço do chat saia no cabeçalho `Referer`.

#### Scenario: Clique num link externo
- **WHEN** o parceiro sai da página por um link externo
- **THEN** o destino não recebe o endereço da página

### Requirement: Nova conversa
O botão "Nova conversa" SHALL limpar a conversa, os avisos e o rascunho, desmarcar a conversa aberta na lista e manter o perfil. A próxima mensagem cria uma conversa nova no servidor.

#### Scenario: Começar de novo
- **WHEN** o parceiro clica em "Nova conversa"
- **THEN** a tela volta ao estado vazio com os exemplos, e a próxima mensagem cria uma conversa nova, que aparece na lista

### Requirement: Falha no envio
Quando o envio falha, a interface SHALL tirar a mensagem pendente da conversa, devolver o texto à caixa de mensagem e mostrar o erro, que MUST poder ser fechado, assim como os avisos.

#### Scenario: Rate limit
- **WHEN** a API responde 429 com "Muitas mensagens em pouco tempo. Aguarde um pouco e tente de novo."
- **THEN** a mensagem pendente some, o texto volta à caixa e o erro aparece com o botão "Fechar aviso"

### Requirement: Texto do erro mostrado
A interface SHALL mostrar, num erro da API, o texto do campo `error`; sem rede, "Não consegui falar com o servidor. Confira sua conexão."; numa resposta de erro sem texto, "Algo deu errado do nosso lado. Tente de novo em instantes."; e numa resposta de sucesso em formato inesperado, "O servidor mandou uma resposta inesperada. Tente de novo."

#### Scenario: Sem rede
- **WHEN** o pedido não chega ao servidor
- **THEN** o erro "Não consegui falar com o servidor. Confira sua conexão." aparece

#### Scenario: Resposta em formato inesperado
- **WHEN** a API responde 200 com um corpo sem `status`, `answer` ou `sources` válidos
- **THEN** o erro "O servidor mandou uma resposta inesperada. Tente de novo." aparece

### Requirement: Resposta de conversa antiga é descartada
Se a conversa mudou enquanto um pedido estava em curso, a interface SHALL descartar a resposta que chegar para a conversa anterior.

#### Scenario: Histórico atrasado
- **WHEN** o histórico de uma sessão chega depois de a sessão ter sido trocada
- **THEN** a tela não mostra esse histórico

### Requirement: Acessibilidade da conversa
A conversa SHALL ser uma região de log anunciada aos leitores de tela, focável pelo teclado e com rolagem até a última mensagem, e cada mensagem MUST identificar o autor ("Você" ou "Chapa") para leitores de tela.

#### Scenario: Leitor de tela
- **WHEN** chega uma resposta
- **THEN** o leitor de tela anuncia a nova mensagem, identificada como do Chapa

### Requirement: Sessão encerrada leva à tela de entrada
Quando qualquer rota da API responde `401`, a interface SHALL levar a `/entrar`, sem mostrar o erro no chat.

#### Scenario: Demo vence com a página aberta
- **WHEN** a conta demo vence e o parceiro envia uma mensagem
- **THEN** a API responde `401` e a página vai para `/entrar`

### Requirement: Menu da conta
O chat SHALL ter um menu da conta que mostra o e-mail da conta Google, ou "Conta de demonstração" numa demo, as opções "Editar perfil", "Sair" e "Excluir minha conta" e o grupo "Tema", com "Claro", "Escuro" e "Sistema" e a escolha atual marcada.

#### Scenario: Conta Google
- **WHEN** uma conta Google abre o menu da conta
- **THEN** vê o e-mail dela, as opções "Editar perfil", "Sair" e "Excluir minha conta" e o grupo "Tema"

#### Scenario: Conta demo
- **WHEN** uma conta demo abre o menu da conta
- **THEN** vê "Conta de demonstração", as opções "Editar perfil", "Sair" e "Excluir minha conta" e o grupo "Tema"

#### Scenario: Trocar o tema pelo menu
- **WHEN** a pessoa escolhe "Escuro" no grupo "Tema"
- **THEN** a página fica escura na hora, o menu marca "Escuro", e a conversa aberta continua como estava

### Requirement: Faixa da conta de demonstração
Numa conta demo, o chat SHALL mostrar uma faixa fixa com o texto "Conta de demonstração. Ela e as conversas são apagadas em 7 dias." e, quando o Google está configurado, o botão "Entrar com Google". Numa conta Google, a faixa MUST NOT aparecer.

#### Scenario: Demo quer salvar o trabalho
- **WHEN** o visitante da demo clica em "Entrar com Google" na faixa
- **THEN** ele passa pelo login do Google e chega ao chat numa conta Google, sem as conversas da demo

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

### Requirement: Resumo do perfil no chat
O chat SHALL mostrar o perfil da conta como um resumo de uma linha, com o nome e o plano pelo nome oficial separados por " · " (por exemplo "Marmitaria Boa Panela · Plano Misto"), ou só o plano quando não há nome, e o link "Editar perfil", que leva a `/perfil`.

#### Scenario: Demo
- **WHEN** uma conta demo abre o chat
- **THEN** vê "Marmitaria Boa Panela · Plano Misto" e o link "Editar perfil"

#### Scenario: Sem nome
- **WHEN** o perfil da conta tem só o plano Próprio
- **THEN** o resumo é "Plano Próprio"

### Requirement: Tela de perfil
A página `/perfil` SHALL ter os campos "Nome do restaurante", "Plano na Rango" (escolha obrigatória entre "Plano Próprio", "Plano Entrega" e "Plano Misto"), "Tipo de cozinha", "Cidade" e "Horário de funcionamento", cada campo de texto com até 60 caracteres, o aviso de privacidade e o botão "Salvar". Salvo o perfil, volta ao chat, e o perfil vale a partir da próxima mensagem.

#### Scenario: Editar o plano
- **WHEN** a conta troca o plano para Entrega, salva e faz uma pergunta sobre a mensalidade
- **THEN** a resposta considera o Plano Entrega

#### Scenario: Erro ao salvar
- **WHEN** a API recusa o perfil com 400
- **THEN** a página mostra o texto do campo `error` e mantém o que foi digitado

### Requirement: Primeiro acesso pede o perfil
Uma conta sem plano salvo SHALL ser levada de `/` a `/perfil` antes do chat, com o título "Conte sobre o seu restaurante" e o botão "Salvar e começar", sem o link para voltar ao chat. Só o plano é obrigatório.

#### Scenario: Primeiro login com Google
- **WHEN** uma conta Google nova abre `/`
- **THEN** é levada a `/perfil`, e só chega ao chat depois de escolher o plano e salvar

### Requirement: Confirmar a exclusão da conta
"Excluir minha conta", no menu da conta, SHALL abrir um diálogo com o texto "Excluir sua conta? A conta, o perfil e todas as conversas são apagados na hora e não podem ser recuperados." e os botões "Excluir conta" e "Cancelar". Confirmada a exclusão, a interface MUST encerrar a sessão e ir para `/entrar`.

#### Scenario: Confirmar
- **WHEN** a pessoa clica em "Excluir conta" no diálogo
- **THEN** a conta é apagada e a página vai para `/entrar`

#### Scenario: Erro ao excluir
- **WHEN** a API responde 503 ao pedido de exclusão
- **THEN** o diálogo mostra o texto do erro, e a sessão continua

### Requirement: Página de privacidade
A página pública `/privacidade` SHALL mostrar, em linguagem simples, o aviso de privacidade, o que a conta guarda (o identificador e o e-mail do Google, o perfil do restaurante e as conversas), o que não guarda (nome e foto do Google, CNPJ, CPF, endereço, telefone, dados bancários, faturamento e o IP em claro), a tabela de retenção e como excluir a conta. O link "Privacidade" MUST aparecer na tela de entrada, no rodapé do chat e na tela de perfil.

#### Scenario: Tabela de retenção
- **WHEN** alguém abre `/privacidade`
- **THEN** vê que a conta demo e as conversas dela somem em 7 dias, a conversa de uma conta Google em 30 dias sem mensagem nova, a conta Google em 180 dias sem acesso, e qualquer conta na hora, por "Excluir minha conta"

### Requirement: Avatar do Chapa nas respostas
Toda mensagem do Chapa SHALL aparecer com o avatar do Chapa ao lado, inclusive o fallback e os bloqueios. As mensagens do parceiro MUST NOT ter avatar e ficam alinhadas do outro lado.

#### Scenario: Conversa com três respostas
- **WHEN** a conversa tem uma resposta com fontes, um fallback e um bloqueio
- **THEN** as três aparecem com o avatar do Chapa à esquerda, e as perguntas do parceiro aparecem à direita, sem avatar

### Requirement: Erro no campo do perfil
A tela de perfil SHALL checar o nome e o tipo de cozinha com o mesmo filtro do servidor ao sair do campo e ao salvar, e mostrar a mensagem embaixo do campo recusado, ligada a ele (`aria-describedby`, `aria-invalid`), com `role="alert"`. Com um campo recusado, "Salvar" MUST NOT enviar o perfil e MUST levar o foco ao primeiro campo inválido. Um `400` da API com `field` SHALL aparecer no campo indicado.

#### Scenario: Palavrão disfarçado no nome
- **WHEN** a pessoa digita "M3rd@ Burguer" no nome e sai do campo
- **THEN** aparece "Esse nome tem um termo que não é permitido. Escolha outro." embaixo do nome, e "Salvar" não envia o perfil

#### Scenario: Corrigir o campo limpa o erro
- **WHEN** a pessoa troca o nome recusado por "Burguer do Centro"
- **THEN** a mensagem some ao sair do campo, e o perfil pode ser salvo

#### Scenario: Recusa vinda da API
- **WHEN** a API responde `400` com `field: "cuisine"`
- **THEN** a mensagem aparece embaixo do tipo de cozinha, e o que foi digitado continua nos campos
