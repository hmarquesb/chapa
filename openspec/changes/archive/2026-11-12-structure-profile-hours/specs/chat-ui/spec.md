## MODIFIED Requirements

### Requirement: Tela de perfil
A página `/perfil` SHALL ter, nesta ordem, os campos "Nome do restaurante" (até 60 caracteres), "Plano na Rango" (escolha obrigatória entre "Plano Próprio", "Plano Entrega" e "Plano Misto"), "Tipo de cozinha", "Estado", "Cidade" e a seção "Horário de funcionamento · opcional", o aviso de privacidade e o botão "Salvar". Salvo o perfil, volta ao chat, e o perfil vale a partir da próxima mensagem.

#### Scenario: Editar o plano
- **WHEN** a conta troca o plano para Entrega, salva e faz uma pergunta sobre a mensalidade
- **THEN** a resposta considera o Plano Entrega

#### Scenario: Erro ao salvar
- **WHEN** a API recusa o perfil com 400
- **THEN** a página mostra o texto do campo `error` e mantém o que foi escolhido e digitado

## ADDED Requirements

### Requirement: Horário de funcionamento no perfil
A seção de horário SHALL ser recolhível e mostrar uma linha por dia, de segunda a domingo, com o interruptor Aberto/Fechado. Um dia aberto SHALL ter de 1 a 2 turnos, cada um com "Abre às" e "Fecha às" escolhidos de 00:00 a 23:30, de 30 em 30 minutos, e os botões "+ turno" e "Remover turno". Um turno em que "Fecha às" é menor que "Abre às" SHALL mostrar "(dia seguinte)". A seção abre já expandida quando o perfil tem horário ou precisa de revisão.

#### Scenario: Turno da madrugada
- **WHEN** a pessoa abre a sexta e escolhe 18:00 às 02:00
- **THEN** o turno mostra "(dia seguinte)"

#### Scenario: Dia fechado
- **WHEN** a pessoa desliga o domingo
- **THEN** os turnos do domingo somem, e o domingo é salvo como fechado

### Requirement: Atalhos de horário
A seção de horário SHALL ter os botões "Copiar para os dias úteis" (segunda a sexta) e "Copiar para todos os dias", que copiam os turnos do primeiro dia aberto, na ordem de segunda a domingo, para os outros dias do grupo, abrindo-os. Sem nenhum dia aberto, os dois botões MUST ficar desabilitados.

#### Scenario: Copiar para todos os dias
- **WHEN** a pessoa abre a segunda com 18:00 às 23:00 e clica em "Copiar para todos os dias"
- **THEN** os 7 dias ficam abertos com 18:00 às 23:00

#### Scenario: Copiar para os dias úteis
- **WHEN** a pessoa abre a terça com 11:00 às 15:00 e clica em "Copiar para os dias úteis"
- **THEN** segunda a sexta ficam com 11:00 às 15:00, e sábado e domingo não mudam

### Requirement: Erros e acessibilidade do horário
Cada seletor de hora SHALL ter um rótulo completo para leitor de tela, como "Segunda, primeiro turno, abre às". A interface SHALL aplicar as regras de "Regras dos turnos de um dia" (ver `chat-api`) antes de enviar e mostrar o erro na linha do dia, ligado aos seletores dela, com `role="alert"`. O envio com erro MUST levar o foco ao primeiro seletor do dia com erro.

#### Scenario: Turnos sobrepostos na tela
- **WHEN** a pessoa põe na terça 11:00 às 15:00 e 14:30 às 23:00 e clica em "Salvar"
- **THEN** o perfil não é enviado, a linha da terça mostra "Na terça, o segundo turno precisa começar depois do fim do primeiro." e o foco vai para o primeiro seletor da terça
