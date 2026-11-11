## ADDED Requirements

### Requirement: Logo da Rango
O logo SHALL ser a palavra "rango." em minúsculas, na fonte de títulos com peso 800, na cor principal do tema, com o ponto final em canela, sem símbolo. Ele MUST ter o nome acessível "Rango" e aparecer no cabeçalho do chat e na tela de entrada.

#### Scenario: Cabeçalho do chat
- **WHEN** alguém logado abre o chat no tema claro
- **THEN** o cabeçalho mostra "rango." em vinho com o ponto em canela, e o leitor de tela lê "Rango"

#### Scenario: Tema escuro
- **WHEN** a mesma tela está no tema escuro
- **THEN** o logo fica em rosa-vinho, com o ponto em canela

### Requirement: Ícone e avatar do Chapa
O Chapa SHALL ter um ícone próprio, uma espátula de chapa em traço arredondado, legível a 24 px e sem copiar ícones de bibliotecas ou logos existentes. O avatar MUST ser esse ícone em ameixa sobre um círculo canela, com o nome acessível "Chapa" quando não houver outro rótulo ao lado.

#### Scenario: Avatar ao lado de um rótulo
- **WHEN** o avatar aparece numa resposta que já é identificada como "Chapa" para leitores de tela
- **THEN** o avatar é decorativo e o leitor de tela não lê "Chapa" duas vezes

### Requirement: Animação de mensagem nova
Uma mensagem nova na conversa SHALL entrar com fade e leve subida, em cerca de 200 ms. Com movimento reduzido, MUST aparecer direto, sem animação.

#### Scenario: Resposta chega
- **WHEN** a resposta do Chapa chega, sem movimento reduzido
- **THEN** ela entra com fade e leve subida

#### Scenario: Movimento reduzido
- **WHEN** a resposta chega com `prefers-reduced-motion: reduce`
- **THEN** ela aparece direto, sem animação
