# Proposal

## Why

O horário de funcionamento é texto livre ("11h às 15h e 18h às 23h"). Não dá para validá-lo nem usá-lo nas regras de disponibilidade da base (`05-horarios-pausas-e-disponibilidade.md`) e nas ferramentas das próximas ondas. Esta é a change 3 de 3 do PRD `prd-chapa-perfil-estruturado.md`. Ela troca o horário por uma grade semanal estruturada, com atalhos para não cansar quem preenche (R4), e agrupa os dias no prompt (R7) (objetivos O2 e O3). Ela **depende da change `structure-profile-cuisine-and-location` estar mergeada e arquivada**, porque estende o perfil v2, a conversão na leitura e a faixa de revisão que aquela change cria. Os deltas foram escritos sobre o texto que ela deixa.

## What Changes

- **Horário estruturado:** `hours` passa a ser uma grade com os 7 dias (`seg` a `dom`). Cada dia tem até 2 turnos `{ open, close }` no formato `HH:MM`, em passos de 30 minutos, e um dia sem turnos está fechado. Uma grade sem nenhum turno é o mesmo que não informar o horário. O perfil continua na `version: 2`: só o formato de `hours` muda.
- **Regras de validação**, iguais na interface e no servidor: abrir e fechar diferentes; o segundo turno começa depois do fim do primeiro; só o último turno do dia pode passar da meia-noite (quando fechar é menor que abrir, termina no dia seguinte); um turno da madrugada não pode invadir o primeiro turno do dia seguinte (domingo segue para segunda).
- **BREAKING (API):** o `PUT /api/profile` recusa `hours` em texto. O erro de horário volta com `field: "hours"` (formato) ou `field: "hours.<dia>"` (regra de um dia).
- **Interface:** uma seção recolhível "Horário de funcionamento · opcional", com uma linha por dia, o interruptor Aberto/Fechado, até 2 turnos com "Abre às" e "Fecha às" (lista de 00:00 a 23:30), "+ turno" e "Remover turno", a indicação "(dia seguinte)" e os atalhos "Copiar para os dias úteis" e "Copiar para todos os dias", que partem do primeiro dia preenchido. Cada seletor tem rótulo completo para leitor de tela ("Segunda, primeiro turno, abre às").
- **Prompt:** a linha "Horário" agrupa os dias seguidos com o mesmo horário, por exemplo "Horário: seg a sex, 11h às 15h e 18h às 23h; sáb, 18h às 2h (dia seguinte); dom, fechado". As horas aparecem sem zero à esquerda ("2h", e não "02h" como no exemplo do PRD), para ficarem coerentes com "11h".
- **Perfis com horário em texto:** a conversão na leitura descarta o texto e marca o perfil como "precisa revisar". A faixa de revisão da change 2 aparece até a pessoa salvar.
- **Demo:** seg a sáb, 11:00 às 15:00 e 18:00 às 23:00; domingo fechado. O PRD pedia para confirmar esse horário. Esta change o adota e registra a escolha como premissa.

## Fora do escopo

- "Aberto agora", fuso horário por cidade, feriados e horários especiais por data.
- Mais de 2 turnos por dia e passos de 15 minutos. O PRD deixava o passo em aberto, e esta change adota **30 minutos**.
- Perguntas novas no eval. Nenhuma das 5 perguntas com perfil tem horário, então o eval não muda.
- Mudanças no RAG e na base de conhecimento.
- ADR nova. A grade é consequência do ADR 0024 (perfil estruturado).

## Chamadas reais e checkpoints humanos

1. **Orquestrador (autorização prévia):** verificação manual com `npm run dev` contra o `dev`: o fluxo "Primeiro acesso" do PRD (§6), com segunda das 18:00 às 23:00, "Copiar para todos os dias" e domingo desligado; um turno de sexta das 18:00 às 02:00 com "(dia seguinte)"; o fluxo "Conta antiga" do PRD, com uma conta de teste de horário em texto, que mostra a faixa e, depois de salvar, não mostra mais; a seção inteira só pelo teclado e em 390 px.
2. **Orquestrador (autorização prévia):** uma rodada de `npm run chat -- --perfil <arquivo com horário> --debug` para ver a linha "Horário" agrupada no prompt.
3. Sem `db push` e sem eval: o schema e as perguntas não mudam.
4. **Pessoa:** depois do merge, rodar o smoke em produção (ou autorizar o orquestrador) e abrir a demo para ver o horário de exemplo.

## Capabilities

### New Capabilities

Nenhuma.

### Modified Capabilities

- `chat-api`: o `hours` do `PUT /api/profile` passa a ser a grade semanal, com as regras e os erros por dia.
- `chat-ui`: a seção de horário na tela de perfil.
- `answer-generation`: o horário agrupado no prompt; o horário em texto é descartado na leitura.
- `auth`: o horário da demo passa a ser a grade.

## Impact

- **Código:** `src/lib/profile/` (`types.ts`, `hours.ts` novo, `parse.ts`, `upgrade.ts`), `src/lib/validation-messages.ts`, `src/core/prompts.ts`, `src/core/accounts.ts`, `src/components/chat/` (`hours-editor.tsx` novo, `profile-form.tsx`), `src/components/ui/switch.tsx` (novo, pelo shadcn).
- **Dependências:** nenhuma. O `Switch` do shadcn usa o `radix-ui`, que já é dependência.
- **Banco:** nenhuma migração.
- **Docs:** `docs/business.md`, `docs/architecture.md`, `docs/qa.md` e `AGENTS.md`.
