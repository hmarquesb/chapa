## ADDED Requirements

### Requirement: Metadados de compartilhamento
Todas as páginas SHALL ter metadados `og:` e `twitter:` em PT-BR, com o título "Chapa, o assistente de parceiros da Rango", uma descrição que diz que a Rango é fictícia e que é um projeto de estudo, e a imagem de compartilhamento de 1200 × 630 com o logo, essa frase, o avatar do Chapa e o aviso "Projeto de estudo · empresa fictícia".

#### Scenario: Link colado no LinkedIn
- **WHEN** alguém cola o endereço da demo num post do LinkedIn
- **THEN** o cartão mostra a imagem de compartilhamento, o título e a descrição em PT-BR

#### Scenario: Página de entrada
- **WHEN** um robô de pré-visualização pede `/entrar`
- **THEN** o HTML traz `og:image` com um endereço absoluto e `twitter:card` com `summary_large_image`, sem precisar de login
