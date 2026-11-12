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
A página `/perfil` SHALL ter, nesta ordem, os campos "Nome do restaurante" (até 60 caracteres), "Plano na Rango" (escolha obrigatória entre "Plano Próprio", "Plano Entrega" e "Plano Misto"), "Tipo de cozinha", "Estado", "Cidade" e a seção "Horário de funcionamento · opcional", o aviso de privacidade e o botão "Salvar". Salvo o perfil, volta ao chat, e o perfil vale a partir da próxima mensagem.

#### Scenario: Editar o plano
- **WHEN** a conta troca o plano para Entrega, salva e faz uma pergunta sobre a mensalidade
- **THEN** a resposta considera o Plano Entrega

#### Scenario: Erro ao salvar
- **WHEN** a API recusa o perfil com 400
- **THEN** a página mostra o texto do campo `error` e mantém o que foi escolhido e digitado

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

### Requirement: Metadados de compartilhamento
Todas as páginas SHALL ter metadados `og:` e `twitter:` em PT-BR, com o título "Chapa, o assistente de parceiros da Rango", uma descrição que diz que a Rango é fictícia e que é um projeto de estudo, e a imagem de compartilhamento de 1200 × 630 com o logo, essa frase, o avatar do Chapa e o aviso "Projeto de estudo · empresa fictícia".

#### Scenario: Link colado no LinkedIn
- **WHEN** alguém cola o endereço da demo num post do LinkedIn
- **THEN** o cartão mostra a imagem de compartilhamento, o título e a descrição em PT-BR

#### Scenario: Página de entrada
- **WHEN** um robô de pré-visualização pede `/entrar`
- **THEN** o HTML traz `og:image` com um endereço absoluto e `twitter:card` com `summary_large_image`, sem precisar de login

### Requirement: Tipo de cozinha no perfil
O "Tipo de cozinha" SHALL ser um combobox com busca, com as opções da lista de cozinhas e "Outro". A busca ignora acentos e maiúsculas. Quando o texto da busca não casa com nenhuma opção, a lista SHALL oferecer `Usar "<texto>" como Outro`. Com "Outro" escolhido, aparece um campo de texto obrigatório de até 30 caracteres, checado pelo filtro do nome (ver "Erro no campo do perfil").

#### Scenario: Busca sem acento
- **WHEN** a pessoa digita "arabe" na busca de cozinha
- **THEN** a lista mostra "Árabe"

#### Scenario: Busca sem resultado vira Outro
- **WHEN** a pessoa digita "Tailandesa" e escolhe `Usar "Tailandesa" como Outro`
- **THEN** a cozinha fica "Outro", com o campo de texto preenchido com "Tailandesa"

#### Scenario: Outro sem texto
- **WHEN** a pessoa escolhe "Outro", deixa o texto vazio e clica em "Salvar"
- **THEN** o perfil não é enviado, e o campo mostra "Descreva o tipo de cozinha em até 30 caracteres."

### Requirement: Estado e cidade no perfil
O "Estado" SHALL listar as 27 UFs pelo nome e pela sigla ("Rio de Janeiro (RJ)"). A "Cidade" SHALL ser um combobox com busca sem acento, desabilitado até haver estado, com só os municípios da UF escolhida, carregados quando o estado é escolhido. Trocar o estado MUST limpar a cidade. Os dois campos são opcionais, e o estado pode ser salvo sem cidade.

#### Scenario: Cidade depende do estado
- **WHEN** a pessoa escolhe "Rio de Janeiro (RJ)" e busca "niteroi" na cidade
- **THEN** a lista mostra "Niterói" e nenhum município de outra UF

#### Scenario: Trocar o estado
- **WHEN** a pessoa, com a cidade "Niterói" escolhida, troca o estado para "São Paulo (SP)"
- **THEN** a cidade fica vazia

### Requirement: Formulário de perfil acessível
Os controles da tela de perfil SHALL ser operáveis só pelo teclado, ter rótulo visível ligado ao controle e caber em 390 px de largura sem rolagem horizontal. O erro de cada campo SHALL ficar ligado a ele por `aria-describedby`, com `role="alert"`, e o envio inválido MUST levar o foco ao primeiro campo com erro.

#### Scenario: Só teclado
- **WHEN** a pessoa preenche o perfil inteiro usando só Tab, setas, Enter e Esc
- **THEN** consegue escolher a cozinha, o estado e a cidade e salvar

#### Scenario: Celular
- **WHEN** a tela de perfil abre com 390 px de largura
- **THEN** os campos e as listas abertas cabem na largura, sem rolagem horizontal

### Requirement: Faixa de revisão do perfil
Quando o perfil da conta precisa de revisão (ver `chat-api`, `needsReview`), o chat SHALL mostrar a faixa "Atualizamos o formulário do perfil. Revise seus dados." com o link "Revisar perfil", que leva a `/perfil`. A faixa MUST sumir depois que o perfil é salvo.

#### Scenario: Conta antiga com cidade ambígua
- **WHEN** uma conta com o perfil antigo `{ "plan": "misto", "city": "Bom Jesus" }` abre o chat
- **THEN** vê a faixa e o link "Revisar perfil"

#### Scenario: Depois de salvar
- **WHEN** a mesma conta salva o perfil e volta ao chat
- **THEN** a faixa não aparece mais

### Requirement: Horário de funcionamento no perfil
A seção de horário SHALL ser recolhível e mostrar uma linha por dia, de segunda a domingo, com o interruptor Aberto/Fechado. Um dia aberto SHALL ter de 1 a 2 turnos, cada um com "Abre às" e "Fecha às" escolhidos de 00:00 a 23:30, de 30 em 30 minutos, e os botões "+ turno" e "Remover turno". Um turno em que "Fecha às" é menor que "Abre às" SHALL mostrar "(dia seguinte)". A seção abre já expandida quando o perfil tem horário ou precisa de revisão.

#### Scenario: Turno da madrugada
- **WHEN** a pessoa abre a sexta e escolhe 18:00 às 02:00
- **THEN** o turno mostra "(dia seguinte)"

#### Scenario: Dia fechado
- **WHEN** a pessoa desliga o domingo
- **THEN** os turnos do domingo somem, e o domingo é salvo como fechado

### Requirement: Atalhos de horário
A seção de horário SHALL ter os botões "Copiar para os dias úteis" (segunda a sexta) e "Copiar para todos os dias", que copiam os turnos do primeiro dia aberto, na ordem de segunda a domingo, para os outros dias do grupo, abrindo-os. Sem nenhum dia aberto, os dois botões MUST ficar desabilitados.

#### Scenario: Copiar para todos os dias
- **WHEN** a pessoa abre a segunda com 18:00 às 23:00 e clica em "Copiar para todos os dias"
- **THEN** os 7 dias ficam abertos com 18:00 às 23:00

#### Scenario: Copiar para os dias úteis
- **WHEN** a pessoa abre a terça com 11:00 às 15:00 e clica em "Copiar para os dias úteis"
- **THEN** segunda a sexta ficam com 11:00 às 15:00, e sábado e domingo não mudam

### Requirement: Erros e acessibilidade do horário
Cada seletor de hora SHALL ter um rótulo completo para leitor de tela, como "Segunda, primeiro turno, abre às". A interface SHALL aplicar as regras de "Regras dos turnos de um dia" (ver `chat-api`) antes de enviar e mostrar o erro na linha do dia, ligado aos seletores dela, com `role="alert"`. O envio com erro MUST levar o foco ao primeiro seletor do dia com erro.

#### Scenario: Turnos sobrepostos na tela
- **WHEN** a pessoa põe na terça 11:00 às 15:00 e 14:30 às 23:00 e clica em "Salvar"
- **THEN** o perfil não é enviado, a linha da terça mostra "Na terça, o segundo turno precisa começar depois do fim do primeiro." e o foco vai para o primeiro seletor da terça
