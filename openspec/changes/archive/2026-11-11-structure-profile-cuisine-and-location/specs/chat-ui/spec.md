## MODIFIED Requirements

### Requirement: Tela de perfil
A página `/perfil` SHALL ter, nesta ordem, os campos "Nome do restaurante" (até 60 caracteres), "Plano na Rango" (escolha obrigatória entre "Plano Próprio", "Plano Entrega" e "Plano Misto"), "Tipo de cozinha", "Estado", "Cidade" e "Horário de funcionamento" (texto de até 60 caracteres), o aviso de privacidade e o botão "Salvar". Salvo o perfil, volta ao chat, e o perfil vale a partir da próxima mensagem.

#### Scenario: Editar o plano
- **WHEN** a conta troca o plano para Entrega, salva e faz uma pergunta sobre a mensalidade
- **THEN** a resposta considera o Plano Entrega

#### Scenario: Erro ao salvar
- **WHEN** a API recusa o perfil com 400
- **THEN** a página mostra o texto do campo `error` e mantém o que foi escolhido e digitado

## ADDED Requirements

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
