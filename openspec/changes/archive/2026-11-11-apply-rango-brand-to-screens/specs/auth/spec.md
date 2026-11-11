## MODIFIED Requirements

### Requirement: Tela de entrada
A página `/entrar` SHALL mostrar o logo da Rango, o título "Chapa", a linha "Assistente de parceiros da Rango", a frase "Tire dúvidas sobre taxas, repasse, cancelamentos, cardápio e avaliações.", o botão "Testar como demo" em destaque, o botão "Entrar com Google" (quando o Google está configurado), o aviso de privacidade, no canto superior o botão de tema (ver `brand`) e o rodapé com o aviso de empresa fictícia e o link "Privacidade", em PT-BR e sem marca de empresa real.

#### Scenario: Primeira visita
- **WHEN** um visitante abre `/entrar`
- **THEN** vê o logo, o título, a frase, o botão "Testar como demo" como ação principal, o link "Privacidade" e o aviso: "Projeto de estudo. A Rango é uma empresa fictícia. As mensagens são processadas pelo Google Gemini, que pode usar o conteúdo para melhorar os serviços dele. Não escreva dados pessoais, senhas nem informações reais do seu negócio."

#### Scenario: Tema antes de entrar
- **WHEN** um visitante abre o botão de tema em `/entrar` e escolhe "Escuro"
- **THEN** a tela fica escura, e o chat abre no tema escuro depois do login

#### Scenario: Rodapé da entrada
- **WHEN** um visitante rola até o fim de `/entrar`
- **THEN** vê "Rango é uma empresa fictícia, criada para um projeto de estudo, sem afiliação com nenhuma empresa de delivery." e o link "Privacidade"
