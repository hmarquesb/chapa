## MODIFIED Requirements

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
- **THEN** vê um botão de cada variante, uma bolha do parceiro, uma resposta do Chapa com fontes, uma resposta a um cumprimento, um fallback, um bloqueio, a faixa de demo e o campo de mensagem, desenhados pelos mesmos componentes do chat, sem enviar nada

#### Scenario: Celular
- **WHEN** alguém abre `/marca` numa tela de 390 px
- **THEN** a página não tem rolagem horizontal, e as tabelas cabem ou rolam dentro do próprio bloco
