## MODIFIED Requirements

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
