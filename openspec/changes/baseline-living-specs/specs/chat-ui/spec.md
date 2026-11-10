# Spec Delta

## Purpose

Dá ao restaurante parceiro uma página única de chat em PT-BR, sem login, com as fontes de cada resposta, o perfil opcional, a conversa que sobrevive ao recarregar e o link para continuar em outro navegador.

## ADDED Requirements

### Requirement: Página única em PT-BR
A interface SHALL ser uma página só, em PT-BR (`lang="pt-BR"`), com o título "Chapa", uma linha sobre os temas cobertos, o perfil, a conversa, a caixa de mensagem, os botões "Continuar depois" e "Nova conversa" e um rodapé que diz que o projeto é de estudo, não oficial e sem afiliação, que as conversas somem depois de 7 dias sem uso e que não se deve enviar dados pessoais.

#### Scenario: Primeira visita
- **WHEN** alguém abre a página pela primeira vez
- **THEN** vê o título, o perfil recolhido, a dica de conversa vazia, as perguntas de exemplo, a caixa de mensagem e o rodapé com o aviso de não afiliação

### Requirement: Sem marca de empresa real
A interface MUST NOT mostrar logo, nome ou cores de empresas reais de delivery.

#### Scenario: Revisão visual
- **WHEN** alguém percorre a página inteira
- **THEN** não encontra marca, nome ou paleta de nenhuma empresa real

### Requirement: Resposta inteira, sem streaming
A interface SHALL mostrar a resposta só quando ela chega inteira, depois do guardrail de saída. Enquanto espera, MUST mostrar a mensagem do parceiro como "enviando…" e a linha "Digitando…", e bloquear o envio de outra mensagem.

#### Scenario: Esperando a resposta
- **WHEN** o parceiro envia uma pergunta
- **THEN** a pergunta aparece na conversa como "enviando…", a linha "Digitando…" aparece, e a caixa de mensagem, os exemplos e "Nova conversa" ficam desabilitados até a resposta

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
Com a conversa vazia e sem carregamento em curso, a interface SHALL mostrar três perguntas de exemplo, "Quando o repasse cai na minha conta?", "O cliente cancelou e eu perdi a comida, e agora?" e "Me passa uma receita de lasanha?", e enviar a escolhida como se o parceiro a tivesse digitado.

#### Scenario: Clique num exemplo
- **WHEN** o parceiro clica em "Quando o repasse cai na minha conta?"
- **THEN** essa pergunta é enviada e os exemplos somem quando a conversa deixa de estar vazia

### Requirement: Perfil opcional do restaurante
A interface SHALL oferecer, recolhido, o formulário "Perfil do restaurante (opcional)" com nome, plano, tipo de cozinha, cidade e horário, cada um com até 60 caracteres e a marca "preenchido" quando houver algum valor. O perfil MUST ser salvo no navegador e enviado com cada mensagem só quando tem algum campo preenchido, aparado.

#### Scenario: Perfil vazio
- **WHEN** o parceiro envia uma pergunta sem preencher o perfil
- **THEN** o pedido não traz o campo `profile`

#### Scenario: Perfil preenchido
- **WHEN** o parceiro preenche o plano e envia uma pergunta
- **THEN** o pedido traz o perfil com o plano, e o perfil continua preenchido depois de recarregar a página

### Requirement: Sessão salva no navegador
A interface SHALL guardar o identificador da sessão no `localStorage` só depois que o servidor conhece a sessão (o histórico carregou ou a primeira resposta chegou). Ao abrir a página, MUST usar, nesta ordem, o id válido do link, o id válido salvo ou um id novo, e carregar o histórico do servidor quando o id não é novo.

#### Scenario: Recarregar a página
- **WHEN** o parceiro recarrega a página depois de uma conversa
- **THEN** a mesma conversa volta, carregada do servidor, e o perfil salvo na sessão é aplicado ao formulário

#### Scenario: Recarregar antes da primeira resposta
- **WHEN** o parceiro abre a página e recarrega sem ter enviado nada
- **THEN** a página começa uma conversa nova, sem aviso de conversa inexistente

### Requirement: Conversa que não existe mais
Quando o servidor responde 404 ao histórico, a interface SHALL começar uma conversa nova e avisar "Esta conversa não existe mais. Começamos uma nova." Em outro erro, MUST mostrar o erro e manter a sessão.

#### Scenario: Sessão expirada
- **WHEN** o id salvo pertence a uma sessão já apagada pela limpeza
- **THEN** a tela fica vazia com o aviso de conversa inexistente e um id novo

### Requirement: Link de continuação
O botão "Continuar depois" SHALL abrir um diálogo com o link `/?sessao=<id>`, o aviso de que quem tiver o link consegue ler a conversa e de que ela some depois de 7 dias sem uso, e o botão "Copiar link". Copiado, MUST mostrar "Link copiado". Sem acesso à área de transferência, MUST selecionar o link e pedir para copiar com Ctrl+C ou Cmd+C.

#### Scenario: Copiar o link
- **WHEN** o parceiro abre o diálogo e clica em "Copiar link"
- **THEN** o link vai para a área de transferência e aparece "Link copiado"

### Requirement: Abrir pelo link de continuação
Ao abrir a página com `?sessao=<id>`, a interface SHALL adotar esse id, carregar a conversa e tirar o parâmetro da barra de endereço na hora. Um `?sessao=` malformado MUST ser ignorado com um aviso: "Este link de conversa não é válido. Mostramos a conversa salva neste navegador." ou, sem conversa salva, "Este link de conversa não é válido. Começamos uma nova conversa."

#### Scenario: Link válido em outro navegador
- **WHEN** alguém abre `/?sessao=<id>` de uma sessão existente
- **THEN** a conversa aparece, o endereço passa a ser `/` e esse id fica salvo no navegador

#### Scenario: Link truncado
- **WHEN** alguém abre `/?sessao=abc` e o navegador já tem uma conversa salva
- **THEN** a conversa salva aparece com o aviso de link inválido

### Requirement: Link não vaza em referrer
A página SHALL usar a política `no-referrer`, para que o link de continuação nunca saia no cabeçalho `Referer`.

#### Scenario: Clique num link externo
- **WHEN** o parceiro sai da página por um link externo
- **THEN** o destino não recebe o endereço da página

### Requirement: Nova conversa
O botão "Nova conversa" SHALL gerar um id novo, limpar a conversa, os avisos e o rascunho, e manter o perfil.

#### Scenario: Começar de novo
- **WHEN** o parceiro clica em "Nova conversa"
- **THEN** a tela volta ao estado vazio com os exemplos, e a próxima mensagem cria uma sessão nova

### Requirement: Falha no envio
Quando o envio falha, a interface SHALL tirar a mensagem pendente da conversa, devolver o texto à caixa de mensagem e mostrar o erro: o texto que a API mandou, "Não consegui falar com o servidor. Confira sua conexão." sem rede, ou um texto genérico quando a resposta vem num formato inesperado. Avisos e erros MUST poder ser fechados.

#### Scenario: Rate limit
- **WHEN** a API responde 429 com "Muitas mensagens em pouco tempo. Aguarde um pouco e tente de novo."
- **THEN** a mensagem pendente some, o texto volta à caixa e o erro aparece com o botão "Fechar aviso"

#### Scenario: Sem rede
- **WHEN** o pedido não chega ao servidor
- **THEN** o erro "Não consegui falar com o servidor. Confira sua conexão." aparece

### Requirement: Resposta de conversa antiga é descartada
Se a conversa mudou enquanto um pedido estava em curso, a interface SHALL descartar a resposta que chegar para a conversa anterior.

#### Scenario: Histórico atrasado
- **WHEN** o histórico de uma sessão chega depois de a sessão ter sido trocada
- **THEN** a tela não mostra esse histórico

### Requirement: Funciona sem localStorage
Se o navegador bloquear o `localStorage`, a interface SHALL continuar funcionando, só sem guardar a sessão e o perfil entre recargas.

#### Scenario: Navegação privada com armazenamento bloqueado
- **WHEN** o `localStorage` lança erro em toda leitura e escrita
- **THEN** o chat envia e recebe mensagens normalmente

### Requirement: Acessibilidade da conversa
A conversa SHALL ser uma região de log anunciada aos leitores de tela, focável pelo teclado e com rolagem até a última mensagem, e cada mensagem MUST identificar o autor ("Você" ou "Chapa") para leitores de tela.

#### Scenario: Leitor de tela
- **WHEN** chega uma resposta
- **THEN** o leitor de tela anuncia a nova mensagem, identificada como do Chapa
