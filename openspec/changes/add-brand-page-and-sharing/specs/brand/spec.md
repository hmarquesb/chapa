## ADDED Requirements

### Requirement: Página de referência da marca
A página `/marca` SHALL ser pública e mostrar os princípios da marca, a relação Rango × Chapa, a paleta com nome, hex e contraste de cada par nos dois temas, a tipografia com a escala de tamanhos, os raios, as sombras, o movimento, o logo nas três versões, o avatar, o favicon, a imagem de compartilhamento, os componentes reais em uso e a seção "O que evitamos".

#### Scenario: Visitante sem login
- **WHEN** alguém sem sessão abre `/marca`
- **THEN** vê a página inteira, sem ser levado a `/entrar`

#### Scenario: Paleta com contraste
- **WHEN** alguém olha a paleta na `/marca`
- **THEN** cada par de uso mostra o hex das duas cores e o contraste nos temas claro e escuro, com os mesmos valores que o teste de contraste confere

#### Scenario: Componentes reais
- **WHEN** alguém olha a seção de componentes
- **THEN** vê um botão de cada variante, uma bolha do parceiro, uma resposta do Chapa com fontes, um fallback, um bloqueio, a faixa de demo e o campo de mensagem, desenhados pelos mesmos componentes do chat, sem enviar nada

#### Scenario: Celular
- **WHEN** alguém abre `/marca` numa tela de 390 px
- **THEN** a página não tem rolagem horizontal, e as tabelas cabem ou rolam dentro do próprio bloco

### Requirement: Link para a marca no rodapé
O rodapé de todas as telas SHALL ter o link "Marca", que leva a `/marca`, ao lado do link "Privacidade".

#### Scenario: Rodapé do chat
- **WHEN** alguém logado clica em "Marca" no rodapé do chat
- **THEN** a `/marca` abre

### Requirement: Arquivos de marca para uso externo
O site SHALL publicar em `/brand/` o logo nas versões clara, escura e monocromática e o avatar do Chapa, em SVG com o texto em contorno, a imagem de compartilhamento em PNG e um `README.md` com a paleta em hex e as fontes. Os SVGs MUST abrir com a mesma aparência num computador sem as fontes da marca.

#### Scenario: SVG sem a fonte
- **WHEN** alguém abre `/brand/rango-logo.svg` num computador sem a Bricolage Grotesque instalada
- **THEN** vê "rango." no desenho da marca, porque o arquivo não tem texto, só contornos

### Requirement: Favicon da Rango
O site SHALL ter o favicon "r." na fonte do logo, em vinho sobre linho com o ponto em canela, e um ícone de 180 px para a tela inicial do celular.

#### Scenario: Aba do navegador
- **WHEN** alguém abre qualquer página do Chapa
- **THEN** a aba mostra o "r." da Rango, e não o ícone padrão do Next.js
