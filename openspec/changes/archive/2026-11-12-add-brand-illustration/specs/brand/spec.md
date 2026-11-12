## ADDED Requirements

### Requirement: Paleta de ilustração
A interface SHALL ter uma paleta de ilustração, separada da paleta de uso, com cinco tons (ameixa-funda, terracota, tangerina, mostarda e creme), cada um com valor nos dois temas. Esses tons MUST pintar só desenhos decorativos, nunca texto, borda, anel de foco ou controle, e um teste automatizado MUST falhar quando isso acontece.

#### Scenario: Tom de ilustração como texto
- **WHEN** um componente usa `text-art-mustard`
- **THEN** o teste falha apontando o arquivo, a linha e a classe

#### Scenario: Espelho da paleta
- **WHEN** o valor de `art-clay` muda na folha de estilos e não no espelho da paleta
- **THEN** o teste de paleta falha, como já acontece com os outros tokens

#### Scenario: Fora do teste de contraste
- **WHEN** o teste de contraste roda
- **THEN** nenhum par usa um tom de ilustração, porque nenhum deles é texto

### Requirement: Ornamentos nas bordas
O chat (`/`) e o perfil (`/perfil`) SHALL mostrar, em janelas de pelo menos 1280 px, três grupos de ornamentos em vetor com a paleta de ilustração, fixos nos cantos da janela e atrás do conteúdo. Os ornamentos MUST NOT receber clique nem foco, ser anunciados por leitores de tela ou aparecer abaixo de 1280 px, e nenhum texto, campo ou botão MUST ficar por cima deles sem o próprio fundo do tema.

#### Scenario: Os três grupos
- **WHEN** alguém logado abre o chat ou o perfil numa janela de 1440 px
- **THEN** vê vapor e folhas no canto superior direito; meias-luas, ramo, sementes e espiral no canto inferior esquerdo; e onda, tigela e sementes no canto inferior direito

#### Scenario: Chat no computador
- **WHEN** alguém logado abre o chat numa janela de 1280, 1440 ou 1920 px no tema claro, com a conversa vazia
- **THEN** vê os três grupos de ornamentos nos cantos, e nenhum texto, campo ou botão (cabeçalho, lista de conversas, exemplos, caixa de mensagem e rodapé) fica por cima de um ornamento sem o próprio fundo do tema

#### Scenario: Conversa longa
- **WHEN** a conversa enche a área de mensagens e a pessoa rola a página
- **THEN** os ornamentos continuam nos cantos da janela, atrás do conteúdo, e o texto continua legível

#### Scenario: Clique e teclado
- **WHEN** a pessoa clica onde há um ornamento sobre um link ou percorre a página com Tab
- **THEN** o clique chega ao link, e o foco nunca para num ornamento

#### Scenario: Leitor de tela
- **WHEN** um leitor de tela percorre o chat ou o perfil
- **THEN** não anuncia nenhum ornamento

#### Scenario: Tema escuro
- **WHEN** a mesma tela está no tema escuro
- **THEN** os ornamentos aparecem com os tons escuros da paleta de ilustração e opacidade reduzida

#### Scenario: Janela estreita e celular
- **WHEN** alguém abre o chat ou o perfil numa janela de 1024 px ou numa tela de 390 px
- **THEN** não vê ornamentos, e a página não tem rolagem horizontal

#### Scenario: Movimento reduzido
- **WHEN** alguém abre o chat com `prefers-reduced-motion: reduce`
- **THEN** vê os mesmos ornamentos, que de qualquer forma não se mexem

## MODIFIED Requirements

### Requirement: Página de referência da marca
A página `/marca` SHALL ser pública e mostrar os princípios da marca, a relação Rango × Chapa, a paleta com nome, hex e contraste de cada par nos dois temas, a paleta de ilustração com nome e hex nos dois temas e a regra de uso, a arte da tela de entrada e os ornamentos, a tipografia com a escala de tamanhos, os raios, as sombras, o movimento, o logo nas três versões, o avatar, o favicon, a imagem de compartilhamento, os componentes reais em uso e a seção "O que evitamos".

#### Scenario: Visitante sem login
- **WHEN** alguém sem sessão abre `/marca`
- **THEN** vê a página inteira, sem ser levado a `/entrar`

#### Scenario: Paleta com contraste
- **WHEN** alguém olha a paleta na `/marca`
- **THEN** cada par de uso mostra o hex das duas cores e o contraste nos temas claro e escuro, com os mesmos valores que o teste de contraste confere

#### Scenario: Ilustração
- **WHEN** alguém olha a seção "Ilustração" na `/marca`
- **THEN** vê os cinco tons de ilustração com nome e hex nos dois temas, a frase de que eles só pintam desenho e nunca texto ou controle, a arte da tela de entrada e os três grupos de ornamentos

#### Scenario: Componentes reais
- **WHEN** alguém olha a seção de componentes
- **THEN** vê um botão de cada variante, uma bolha do parceiro, uma resposta do Chapa com fontes, uma resposta a um cumprimento, um fallback, um bloqueio, a faixa de demo e o campo de mensagem, desenhados pelos mesmos componentes do chat, sem enviar nada

#### Scenario: Celular
- **WHEN** alguém abre `/marca` numa tela de 390 px
- **THEN** a página não tem rolagem horizontal, e as tabelas cabem ou rolam dentro do próprio bloco
