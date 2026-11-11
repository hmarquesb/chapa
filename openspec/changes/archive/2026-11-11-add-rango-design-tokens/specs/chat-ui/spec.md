## MODIFIED Requirements

### Requirement: Sem marca de empresa real
A interface MUST NOT mostrar logo, nome ou cores de empresas reais de delivery. As cores, as fontes e as formas SHALL ser as da identidade da Rango (ver `brand`).

#### Scenario: Revisão visual
- **WHEN** alguém percorre a página inteira
- **THEN** não encontra marca, nome ou paleta de nenhuma empresa real, e as cores são as da paleta da Rango

### Requirement: Menu da conta
O chat SHALL ter um menu da conta que mostra o e-mail da conta Google, ou "Conta de demonstração" numa demo, as opções "Editar perfil", "Sair" e "Excluir minha conta" e o grupo "Tema", com "Claro", "Escuro" e "Sistema" e a escolha atual marcada.

#### Scenario: Conta Google
- **WHEN** uma conta Google abre o menu da conta
- **THEN** vê o e-mail dela, as opções "Editar perfil", "Sair" e "Excluir minha conta" e o grupo "Tema"

#### Scenario: Conta demo
- **WHEN** uma conta demo abre o menu da conta
- **THEN** vê "Conta de demonstração", as opções "Editar perfil", "Sair" e "Excluir minha conta" e o grupo "Tema"

#### Scenario: Trocar o tema pelo menu
- **WHEN** a pessoa escolhe "Escuro" no grupo "Tema"
- **THEN** a página fica escura na hora, o menu marca "Escuro", e a conversa aberta continua como estava
