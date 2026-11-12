## MODIFIED Requirements

### Requirement: Página única em PT-BR
A interface do chat SHALL ser uma página só, em `/`, aberta só com sessão válida e perfil com plano (ver `auth`), em PT-BR (`lang="pt-BR"`), com o logo da Rango, o título "Chapa", a linha de subtítulo, o menu da conta, a lista de conversas, o botão "Nova conversa", o resumo do perfil, a conversa, a caixa de mensagem e o rodapé com o aviso de empresa fictícia e o link "Privacidade".

#### Scenario: Textos fixos
- **WHEN** alguém logado, com o perfil salvo, abre a página
- **THEN** o subtítulo é "Tire dúvidas sobre taxas, repasse, cancelamentos, cardápio e avaliações." e o rodapé é "Rango é uma empresa fictícia, criada para um projeto de estudo, sem afiliação com nenhuma empresa de delivery. As conversas são apagadas depois de 30 dias sem uso. Não envie dados pessoais.", seguido do link "Privacidade"

#### Scenario: Primeira visita
- **WHEN** alguém logado, com o perfil salvo, abre a página pela primeira vez
- **THEN** vê primeiro o card de boas-vindas e, depois de clicar em "Entendi", o logo, o título, o menu da conta, a lista de conversas vazia, o resumo do perfil, a dica "Faça uma pergunta sobre a operação do seu restaurante ou escolha um exemplo abaixo.", as perguntas de exemplo, a caixa de mensagem e o rodapé com o aviso de empresa fictícia

### Requirement: Perguntas de exemplo
Com a conversa vazia e sem carregamento em curso, a interface SHALL mostrar duas perguntas de exemplo, "Quando o repasse cai na minha conta?" e "Quem paga o desconto quando eu crio um cupom?", e enviar a escolhida como se o parceiro a tivesse digitado. Os exemplos MUST ser perguntas que a base responde.

#### Scenario: Clique num exemplo
- **WHEN** o parceiro clica em "Quando o repasse cai na minha conta?"
- **THEN** essa pergunta é enviada e os exemplos somem quando a conversa deixa de estar vazia

#### Scenario: Sem exemplo fora do escopo
- **WHEN** o parceiro abre uma conversa vazia
- **THEN** vê só as duas perguntas de exemplo, e "Me passa uma receita de lasanha?" não aparece

### Requirement: Menu da conta
O chat SHALL ter um menu da conta que mostra o e-mail da conta Google, ou "Conta de demonstração" numa demo, as opções "Sobre o Chapa", "Editar perfil", "Sair" e "Excluir minha conta" e o grupo "Tema", com "Claro", "Escuro" e "Sistema" e a escolha atual marcada.

#### Scenario: Conta Google
- **WHEN** uma conta Google abre o menu da conta
- **THEN** vê o e-mail dela, as opções "Sobre o Chapa", "Editar perfil", "Sair" e "Excluir minha conta" e o grupo "Tema"

#### Scenario: Conta demo
- **WHEN** uma conta demo abre o menu da conta
- **THEN** vê "Conta de demonstração", as opções "Sobre o Chapa", "Editar perfil", "Sair" e "Excluir minha conta" e o grupo "Tema"

#### Scenario: Trocar o tema pelo menu
- **WHEN** a pessoa escolhe "Escuro" no grupo "Tema"
- **THEN** a página fica escura na hora, o menu marca "Escuro", e a conversa aberta continua como estava

### Requirement: Primeiro acesso pede o perfil
Uma conta sem plano salvo SHALL ser levada de `/` a `/perfil` antes do chat, com o título "Conte sobre o seu restaurante", o botão "Salvar e começar" e o botão "Voltar para o login", sem o link para voltar ao chat. Só o plano é obrigatório. "Voltar para o login" MUST encerrar a sessão como o "Sair" (ver `auth`) e levar a `/entrar`, sem salvar o que foi preenchido.

#### Scenario: Primeiro login com Google
- **WHEN** uma conta Google nova abre `/`
- **THEN** é levada a `/perfil`, e só chega ao chat depois de escolher o plano e salvar

#### Scenario: Desistir no primeiro acesso
- **WHEN** uma conta Google nova, em `/perfil`, clica em "Voltar para o login"
- **THEN** chega a `/entrar` com as opções "Testar como demo" e "Entrar com Google", e abrir `/` de novo leva a `/entrar`

#### Scenario: Edição do perfil
- **WHEN** uma conta com plano salvo abre `/perfil` pelo menu da conta
- **THEN** vê o link "Voltar ao chat", e o botão "Voltar para o login" não aparece

## ADDED Requirements

### Requirement: Card de boas-vindas
O card de boas-vindas SHALL abrir sobre a página do chat, com o fundo borrado, o título "Boas-vindas ao Chapa", o texto fixo do cenário "Conteúdo do card" e o botão "Entendi", que o fecha. Fechar pelo Esc também vale como "Entendi". O foco MUST ficar preso no card enquanto ele está aberto e voltar à página quando ele fecha.

#### Scenario: Conteúdo do card
- **WHEN** o card abre
- **THEN** mostra, nesta ordem: "A Rango é uma empresa de delivery fictícia, criada para este projeto de estudo. Os restaurantes parceiros vendem pelo app dela."; "O Chapa é o assistente desses parceiros. Ele tira dúvidas sobre a operação do restaurante com base nas regras da Rango e mostra de onde tirou cada resposta."; "Pergunte, por exemplo, sobre:" seguido da lista "Planos, taxas e repasse", "Cancelamentos e contestações", "Cardápio, fotos e horários", "Avaliações, promoções e cupons", "Embalagem e entrega" e "Suporte, acessos e pagamentos"; e "Fora disso, como receitas ou assuntos que não são da Rango, ele avisa que não encontrou a informação. Não escreva dados pessoais nem senhas."

#### Scenario: Celular
- **WHEN** o card abre numa tela de 390 × 844 px
- **THEN** o texto e o botão "Entendi" cabem na tela ou rolam dentro do card, sem rolagem horizontal

#### Scenario: Leitor de tela
- **WHEN** o card abre com um leitor de tela ligado
- **THEN** ele é anunciado como diálogo com o título "Boas-vindas ao Chapa"

### Requirement: Quando o card de boas-vindas aparece
Numa conta Google, o card SHALL abrir sozinho só enquanto a conta não o fechou nenhuma vez; fechá-lo MUST ficar registrado na conta, valendo em qualquer navegador. Numa conta demo, o card SHALL abrir sozinho toda vez que o chat é carregado, e nada é registrado.

#### Scenario: Conta Google na segunda visita
- **WHEN** uma conta Google fecha o card com "Entendi" e depois abre o chat em outro navegador
- **THEN** o card não abre sozinho

#### Scenario: Falha ao registrar
- **WHEN** uma conta Google fecha o card e o registro falha
- **THEN** o card fecha mesmo assim, sem mensagem de erro, e volta a abrir sozinho na próxima vez que o chat for carregado

#### Scenario: Demo volta ao chat
- **WHEN** uma conta demo fecha o card, vai a "Editar perfil", salva e volta ao chat
- **THEN** o card abre de novo

### Requirement: Reabrir o card de boas-vindas
A opção "Sobre o Chapa" do menu da conta SHALL abrir o mesmo card, com o mesmo conteúdo, em qualquer conta. Fechá-lo de novo MUST NOT mudar a conversa aberta nem o texto digitado na caixa de mensagem.

#### Scenario: Rever o escopo no meio da conversa
- **WHEN** a pessoa, com uma conversa aberta e um texto na caixa de mensagem, escolhe "Sobre o Chapa" e depois clica em "Entendi"
- **THEN** o card abre e fecha, e a conversa e o texto continuam como estavam
