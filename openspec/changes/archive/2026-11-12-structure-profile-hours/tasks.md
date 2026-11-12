# Tasks

Esta change é a 3 de 3 do PRD `prd-chapa-perfil-estruturado.md`. Ela só começa depois que a `structure-profile-cuisine-and-location` estiver mergeada e arquivada. Antes do apply, faça o rebase deste worktree na `main` atualizada. As tarefas **(autorização)** usam o banco `dev` ou a API, com a autorização prévia do `CLAUDE.md`, e são do orquestrador.

## 1. Grade de horário

- [x] 1.1 Escrever os testes de `parseWeekHours` por tabela: os cenários da spec `chat-api` ("Horário do perfil na API" e "Regras dos turnos de um dia"), mais dia com 3 turnos, chave faltando, chave a mais, primeiro turno que passa da meia-noite com segundo turno, e domingo de madrugada que invade a segunda. Depois, implementar os tipos da decisão 1 e a função. Verificar com `npm test -- hours`.
- [x] 1.2 Escrever os testes de `formatWeekHours` com os cenários da spec `answer-generation` ("Horário agrupado no prompt") e um grupo de 2 dias. Depois, implementar. Verificar com `npm test -- hours`.
- [x] 1.3 Escrever os testes de `hourOptions` (48 opções, de 00:00 a 23:30), `crossesMidnight`, `firstOpenDay` e `copyShifts` (dias úteis e todos os dias, sem mudar a origem). Depois, implementar. Verificar com `npm test -- hours`.

## 2. Parser, conversão, prompt e demo

- [x] 2.1 Acrescentar as mensagens de horário ao `validation-messages.ts` e ligar `parseWeekHours` ao `parseProfileInput`, com os testes de `field: "hours"` e `"hours.<dia>"` e da grade vazia sem `hours`. Verificar com `npm test -- parse handlers`.
- [x] 2.2 Escrever os testes de `upgradeProfile` (horário em texto e grade inválida → descartados e `needsReview`) e depois implementar. Verificar com `npm test -- upgrade`.
- [x] 2.3 Trocar o horário no `formatProfile` e o `DEMO_PROFILE` (decisões 4 e 6), com o teste do cenário "Horário da demo no prompt". Verificar com `npm test -- prompts accounts`.

## 3. Interface

- [x] 3.1 Rodar `npx shadcn add switch`. Verificar que o `git diff package.json` está vazio e que `npm run typecheck` passa.
- [x] 3.2 Criar o `hours-editor.tsx` (decisão 5): interruptor por dia, até 2 turnos, "(dia seguinte)", atalhos e rótulos completos. Verificar com `npm run typecheck` e `npm run lint`.
- [x] 3.3 Ligar o editor ao `profile-form.tsx`: erro por dia, foco no primeiro seletor com erro, `field` da API e `defaultOpen`. Verificar com `npm run typecheck` e `npm test -- api-client`.
- [x] 3.4 Revisar a seção com a skill `web-design-guidelines` (rótulos dos seletores, interruptor, erro por dia, 390 px). Verificar que cada apontamento foi corrigido ou justificado no relatório.

## 4. Documentação

- [x] 4.1 Atualizar `docs/business.md`, `docs/architecture.md`, `docs/qa.md` e `AGENTS.md` nas seções da decisão 7. Verificar com `git grep -n "horário (até 60\|11h às 15h e 18h às 23h" -- docs AGENTS.md README.md`, que não deve achar nada.

## 5. Verificação manual (orquestrador)

- [x] 5.1 **(autorização)** Com `npm run dev` contra o `dev`, percorrer o checkpoint 1 da proposta: o primeiro acesso com "Copiar para todos os dias" e o domingo desligado; a sexta das 18:00 às 02:00 com "(dia seguinte)"; uma conta de teste com horário em texto, que mostra a faixa e, depois de salvar, não mostra mais; a seção só pelo teclado e em 390 px. Registrar no `docs/qa.md` e no relatório.
- [x] 5.2 **(autorização)** Rodar `npm run chat -- --perfil <arquivo com horário> --debug` e conferir a linha "Horário" agrupada no prompt. Registrar no relatório.

## 6. Verificação final

- [x] 6.1 Rodar `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`. Verificar que os quatro passam e registrar no relatório os critérios de aceite do PRD (§7) que esta change fecha (horário com todas as regras de R4 testadas; `formatProfile` com dias agrupados; faixa de revisão para o horário), com a evidência de cada um.
