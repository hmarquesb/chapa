# brand Specification

## Purpose
Define a identidade visual da Rango no Chapa: os tokens de cor, tipografia, forma e movimento nos temas claro e escuro, o contraste mínimo, a proibição de cores fixas fora dos tokens e a preferência de tema de quem usa.

## Requirements

### Requirement: Paleta da Rango nos dois temas
A interface SHALL usar a paleta "Vinho e canela" em todas as telas, nos temas claro e escuro: fundo linho, texto ameixa, cor principal vinho (rosa-vinho no escuro), canela só como preenchimento e um vermelho-tijolo para erro. A cor principal MUST NOT ser vermelho, laranja vivo, amarelo ou verde-vivo.

#### Scenario: Tema claro
- **WHEN** alguém abre qualquer tela no tema claro
- **THEN** o fundo é linho (`#FAF5F0`), o texto é ameixa (`#2A1E22`) e os botões principais são vinho (`#7A2E3B`) com texto branco

#### Scenario: Tema escuro
- **WHEN** alguém abre qualquer tela no tema escuro
- **THEN** o fundo é `#1D1517`, o texto é `#F3E9E4` e os botões principais são rosa-vinho (`#CF7686`) com texto no tom do fundo

#### Scenario: Erro distinto do vinho
- **WHEN** a tela mostra um erro ou uma ação de excluir
- **THEN** a cor é o vermelho-tijolo do tema, de tom diferente do vinho da cor principal

### Requirement: Contraste AA verificado
Os pares de cor de uso SHALL passar no WCAG AA nos dois temas: texto normal com contraste de pelo menos 4,5 : 1 e elementos de interface (anel de foco e borda de campo) com pelo menos 3 : 1. Um teste automatizado MUST ler os tokens da folha de estilos e falhar listando cada par reprovado.

#### Scenario: Par reprovado
- **WHEN** um token muda para um tom que deixa o texto secundário com 4,2 : 1 sobre o fundo do tema escuro
- **THEN** o teste falha com a linha `dark: muted-foreground/background → 4.20`

#### Scenario: Canela como texto
- **WHEN** um texto precisa da canela no tema claro
- **THEN** ele usa a canela escura (`#9A5F2A`, 4,8 : 1 sobre o linho), e não a canela de preenchimento (2,7 : 1)

### Requirement: Nenhuma cor fora dos tokens
O código das telas e dos componentes SHALL usar só os tokens da marca. Cores em hex, `rgb()`, `hsl()`, `oklch()` e classes de cor fixa do Tailwind (`bg-red-500`, `text-neutral-600`, `bg-black/10`…) MUST NOT aparecer fora da folha de estilos global, e um teste automatizado falha listando arquivo e linha de cada ocorrência.

#### Scenario: Classe de cor fixa
- **WHEN** um componente usa `text-neutral-600`
- **THEN** o teste falha apontando o arquivo, a linha e a classe

### Requirement: Tipografia da marca
Os títulos SHALL usar Bricolage Grotesque, e o texto e a interface, Figtree. As fontes MUST ser servidas pelo próprio site, sem pedido do navegador a domínios de fontes externos.

#### Scenario: Pedidos de rede
- **WHEN** alguém abre `/entrar` com as ferramentas de rede do navegador abertas
- **THEN** as fontes vêm do próprio domínio, e nenhum pedido vai para `fonts.googleapis.com` ou `fonts.gstatic.com`

### Requirement: Cantos arredondados
Botões, campos, cartões, bolhas, menus e diálogos SHALL ter cantos arredondados, a partir de um raio base de `1rem`. Nenhum elemento interativo MUST ter canto vivo.

#### Scenario: Botão e campo
- **WHEN** alguém vê um botão ou um campo de tamanho padrão
- **THEN** os cantos são arredondados a ponto de o elemento parecer uma pílula

### Requirement: Escolha de tema
A interface SHALL oferecer três temas, "Claro", "Escuro" e "Sistema", com "Sistema" como padrão, que segue o tema do sistema operacional e acompanha a mudança dele com a página aberta. A escolha MUST ficar só no navegador, sem ir para a conta nem para o servidor.

#### Scenario: Primeira visita
- **WHEN** alguém abre o Chapa pela primeira vez com o sistema operacional no modo escuro
- **THEN** a página aparece no tema escuro, e a opção marcada é "Sistema"

#### Scenario: Escolha persiste
- **WHEN** a pessoa escolhe "Claro" e recarrega a página
- **THEN** a página continua no tema claro, mesmo com o sistema no modo escuro

#### Scenario: Sem piscar
- **WHEN** a pessoa escolheu "Escuro" e abre qualquer página
- **THEN** a primeira pintura já é escura, sem um instante no tema claro

#### Scenario: Armazenamento indisponível
- **WHEN** o navegador bloqueia o armazenamento local
- **THEN** a página abre no tema "Sistema", sem erro, e a escolha vale só até recarregar

### Requirement: Movimento reduzido
Com `prefers-reduced-motion: reduce`, a interface SHALL desligar as animações e as transições de cor, sem perder nenhuma informação.

#### Scenario: Troca de tema com movimento reduzido
- **WHEN** a pessoa com movimento reduzido troca de tema
- **THEN** as cores mudam na hora, sem transição

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
