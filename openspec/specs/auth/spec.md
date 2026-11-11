# auth Specification

## Purpose
Identifica quem usa o chat pela web: entrar com Google ou como demo, manter a sessão num cookie, confirmar a conta no banco a cada pedido, sair e expirar as contas.

## Requirements

### Requirement: Login obrigatório na web
Toda página do chat SHALL exigir uma sessão válida. Sem ela, a página MUST levar a `/entrar`. A tela de entrada, a página de privacidade, a página da marca (`/marca`) e as imagens de ícone e de compartilhamento são públicas. O CLI e a avaliação não passam pelo login.

#### Scenario: Visitante sem sessão
- **WHEN** alguém sem sessão abre `/`
- **THEN** é levado a `/entrar`

#### Scenario: Já logado abre a entrada
- **WHEN** alguém com sessão válida abre `/entrar`
- **THEN** é levado a `/`

#### Scenario: Privacidade sem login
- **WHEN** alguém sem sessão abre `/privacidade`
- **THEN** vê a página de privacidade

#### Scenario: Marca sem login
- **WHEN** alguém sem sessão abre `/marca` ou `/opengraph-image`
- **THEN** recebe a página ou a imagem, sem ser levado a `/entrar`

### Requirement: Tela de entrada
A página `/entrar` SHALL mostrar o logo da Rango, o título "Chapa", a linha "Assistente de parceiros da Rango", a frase "Tire dúvidas sobre taxas, repasse, cancelamentos, cardápio e avaliações.", o botão "Testar como demo" em destaque, o botão "Entrar com Google" (quando o Google está configurado), o aviso de privacidade, no canto superior o botão de tema (ver `brand`) e o rodapé com o aviso de empresa fictícia e o link "Privacidade", em PT-BR e sem marca de empresa real.

#### Scenario: Primeira visita
- **WHEN** um visitante abre `/entrar`
- **THEN** vê o logo, o título, a frase, o botão "Testar como demo" como ação principal, o link "Privacidade" e o aviso: "Projeto de estudo. A Rango é uma empresa fictícia. As mensagens são processadas pelo Google Gemini, que pode usar o conteúdo para melhorar os serviços dele. Não escreva dados pessoais, senhas nem informações reais do seu negócio."

#### Scenario: Tema antes de entrar
- **WHEN** um visitante abre o botão de tema em `/entrar` e escolhe "Escuro"
- **THEN** a tela fica escura, e o chat abre no tema escuro depois do login

#### Scenario: Rodapé da entrada
- **WHEN** um visitante rola até o fim de `/entrar`
- **THEN** vê "Rango é uma empresa fictícia, criada para um projeto de estudo, sem afiliação com nenhuma empresa de delivery." e o link "Privacidade"

### Requirement: Entrar com Google
"Entrar com Google" SHALL autenticar pelo OAuth do Google e aceitar só e-mails verificados. No primeiro login, MUST criar uma conta do tipo `google` com o `sub` e o e-mail. Nos seguintes, MUST encontrar a conta pelo `sub`, atualizar o e-mail e registrar o acesso. Nome, foto e outros dados do Google MUST NOT ser guardados.

#### Scenario: Primeiro login
- **WHEN** uma pessoa entra com Google pela primeira vez
- **THEN** uma conta `google` é criada com o `sub` e o e-mail dela, e a pessoa chega ao chat

#### Scenario: Login seguinte
- **WHEN** a mesma pessoa entra com Google de novo
- **THEN** a mesma conta é usada, e nenhuma conta nova é criada

#### Scenario: E-mail não verificado
- **WHEN** o Google informa que o e-mail não foi verificado
- **THEN** o login é recusado, e a tela de entrada mostra "Não consegui entrar agora. Tente de novo em instantes."

### Requirement: Google só quando configurado
O botão "Entrar com Google" SHALL aparecer só quando as duas credenciais do Google estão configuradas no servidor. Com só uma delas, o servidor MUST tratar a configuração como incompleta e falhar com o erro de variável ausente, sem esconder o problema.

#### Scenario: Preview sem credenciais do Google
- **WHEN** o deploy não tem nenhuma das duas credenciais do Google
- **THEN** a tela de entrada mostra só "Testar como demo"

### Requirement: Testar como demo
"Testar como demo" SHALL criar, a cada clique, uma conta nova do tipo `demo`, sem e-mail, que expira 7 dias depois da criação, e iniciar a sessão nela. Uma conta demo MUST NOT enxergar dados de outra conta.

#### Scenario: Um clique leva ao chat
- **WHEN** o visitante clica em "Testar como demo"
- **THEN** uma conta demo nova é criada e ele chega ao chat, sem preencher nada

#### Scenario: Duas demos
- **WHEN** duas pessoas clicam em "Testar como demo" em navegadores diferentes
- **THEN** cada uma recebe uma conta demo diferente

### Requirement: Limite de contas demo por IP
O sistema SHALL criar no máximo 5 contas demo por IP por dia UTC, contando todas as tentativas, inclusive as recusadas. O IP MUST ser guardado só como HMAC, como no rate limit do chat. Acima do limite, a tela de entrada mostra "Muitas contas de demonstração criadas a partir desta rede hoje. Entre com Google para continuar testando.", e nenhuma conta é criada.

#### Scenario: Sexta demo do dia
- **WHEN** o mesmo IP clica em "Testar como demo" pela 6ª vez no mesmo dia UTC
- **THEN** nenhuma conta é criada, e a tela de entrada mostra a mensagem do limite

### Requirement: Sessão em cookie
A sessão SHALL ficar num cookie `httpOnly`, `SameSite=Lax` e `Secure` em HTTPS, com validade de 30 dias. O conteúdo da sessão MUST trazer só o id e o tipo da conta, nunca o e-mail, o nome ou a foto. Ele não pode ser lido pelo JavaScript da página.

#### Scenario: Cookie depois do login
- **WHEN** alguém entra como demo num deploy em HTTPS
- **THEN** o navegador recebe um cookie de sessão `HttpOnly`, `Secure` e `SameSite=Lax`

### Requirement: Conta apagada ou vencida invalida a sessão
A cada pedido protegido, o sistema SHALL confirmar no banco que a conta da sessão existe e, se for demo, que não venceu. Se a conta não existir ou tiver vencido, o pedido MUST ser tratado como sem sessão.

#### Scenario: Demo no 8º dia
- **WHEN** uma conta demo criada há 8 dias envia uma mensagem com o cookie ainda dentro da validade
- **THEN** a resposta é `401`, e a interface leva a `/entrar`

#### Scenario: Conta apagada pela limpeza
- **WHEN** a limpeza diária apaga uma conta e o navegador dela abre `/`
- **THEN** é levado a `/entrar`

### Requirement: Sair
"Sair" SHALL apagar o cookie de sessão e levar a `/entrar`. A conta e os dados dela continuam no banco.

#### Scenario: Sair do chat
- **WHEN** a pessoa clica em "Sair" no menu da conta
- **THEN** ela chega a `/entrar`, e abrir `/` de novo leva a `/entrar`

### Requirement: Expiração das contas
A limpeza diária SHALL apagar as contas demo cujo prazo de 7 dias venceu e as contas Google sem acesso há mais de 180 dias. Um acesso é um login ou uma mensagem enviada.

#### Scenario: Conta Google parada
- **WHEN** a limpeza roda e uma conta Google está sem login e sem mensagem há 181 dias
- **THEN** a conta é apagada

#### Scenario: Conta Google ativa
- **WHEN** a limpeza roda e uma conta Google enviou uma mensagem há 10 dias, mas entrou com Google há 200 dias
- **THEN** a conta continua

### Requirement: Conta demo com perfil de exemplo
Toda conta demo SHALL nascer com o mesmo perfil fictício, no formato v2: nome "Marmitaria Boa Panela", plano Misto, cozinha "Marmita e comida caseira" (`marmita`), local Rio de Janeiro (RJ, código 3304557) e horário "11h às 15h e 18h às 23h". O visitante MAY editar o perfil da própria demo, e a edição não muda o perfil das outras demos.

#### Scenario: Demo nova
- **WHEN** o visitante clica em "Testar como demo"
- **THEN** o chat mostra o resumo "Marmitaria Boa Panela · Plano Misto" sem passar pela tela de perfil e sem a faixa de revisão

#### Scenario: Demo troca o plano
- **WHEN** o visitante troca o plano da demo para Próprio
- **THEN** a próxima demo criada continua com o plano Misto

#### Scenario: Smoke confere a demo
- **WHEN** o smoke lê `GET /api/profile` de uma demo nova
- **THEN** o passo só passa com o plano `misto` e o local `{ "uf": "RJ", "cityCode": 3304557 }`

### Requirement: Excluir a conta
"Excluir minha conta" SHALL apagar, na hora, a conta, o perfil e todas as conversas e mensagens dela, encerrar a sessão e levar a `/entrar`. Depois disso, o cookie antigo MUST ser tratado como sem sessão.

#### Scenario: Exclusão de uma conta Google
- **WHEN** uma conta Google com duas conversas confirma "Excluir minha conta"
- **THEN** a conta e as duas conversas somem do banco, a pessoa chega a `/entrar`, e um novo login com o mesmo Google cria uma conta vazia, que pede o perfil
