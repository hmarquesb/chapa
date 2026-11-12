## MODIFIED Requirements

### Requirement: Tela de entrada
A página `/entrar` SHALL mostrar o logo da Rango, o título "Chapa", a linha "Assistente de parceiros da Rango", a frase "Tire dúvidas sobre taxas, repasse, cancelamentos, cardápio e avaliações.", o botão "Testar como demo" em destaque, o botão "Entrar com Google" (quando o Google está configurado), o aviso de privacidade, no canto superior o botão de tema (ver `brand`) e o rodapé com o aviso de empresa fictícia e o link "Privacidade", em PT-BR e sem marca de empresa real. A página SHALL mostrar também a arte da marca: em janelas de pelo menos 1024 px, numa coluna à esquerda, com metade da largura e a altura inteira da janela, e o conteúdo na coluna da direita; abaixo de 1024 px, numa faixa de cerca de 180 px no topo, com o conteúdo embaixo. A arte MUST ser a mesma nos dois temas, decorativa (sem texto alternativo e invisível para leitores de tela) e servida pelo próprio site.

#### Scenario: Primeira visita
- **WHEN** um visitante abre `/entrar`
- **THEN** vê o logo, o título, a frase, o botão "Testar como demo" como ação principal, o link "Privacidade" e o aviso: "Projeto de estudo. A Rango é uma empresa fictícia. As mensagens são processadas pelo Google Gemini, que pode usar o conteúdo para melhorar os serviços dele. Não escreva dados pessoais, senhas nem informações reais do seu negócio."

#### Scenario: Tema antes de entrar
- **WHEN** um visitante abre o botão de tema em `/entrar` e escolhe "Escuro"
- **THEN** a tela fica escura, e o chat abre no tema escuro depois do login

#### Scenario: Rodapé da entrada
- **WHEN** um visitante rola até o fim de `/entrar`
- **THEN** vê "Rango é uma empresa fictícia, criada para um projeto de estudo, sem afiliação com nenhuma empresa de delivery." e o link "Privacidade"

#### Scenario: Arte no computador
- **WHEN** um visitante abre `/entrar` numa janela de 1440 × 900 px
- **THEN** a arte ocupa a metade esquerda da janela, de cima a baixo, e o logo, os botões, o aviso e o rodapé ficam na metade direita, com o botão de tema no canto superior direito dela

#### Scenario: Arte no celular
- **WHEN** um visitante abre `/entrar` numa tela de 390 px
- **THEN** a arte aparece numa faixa de cerca de 180 px no topo, o botão "Testar como demo" aparece sem rolar a página numa tela de 390 × 844 px, e a página não tem rolagem horizontal

#### Scenario: Leitor de tela
- **WHEN** um leitor de tela percorre `/entrar`
- **THEN** não anuncia a arte, e o primeiro conteúdo lido é o logo "Rango"

#### Scenario: Tema escuro
- **WHEN** a tela de entrada está no tema escuro
- **THEN** a arte é a mesma do tema claro, e a coluna do conteúdo usa o fundo escuro do tema
