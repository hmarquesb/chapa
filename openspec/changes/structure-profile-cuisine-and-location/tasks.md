# Tasks

Esta change é a 2 de 3 do PRD `prd-chapa-perfil-estruturado.md`. Ela só começa depois que a `add-profile-term-filter` estiver mergeada e arquivada. Antes do apply, faça o rebase deste worktree na `main` atualizada. As tarefas **(autorização)** usam o banco `dev`, a API do Gemini ou a API pública do IBGE, e o orquestrador repassa essa autorização no prompt do subagente quando a tarefa pede.

## 1. Listas e municípios

- [x] 1.1 Escrever os testes de `search.ts` (acentos, maiúsculas, espaços) e depois implementá-lo. Trocar a normalização privada do `plans.ts` por `normalizeSearch`. Verificar com `npm test -- search plans`.
- [x] 1.2 Escrever os testes de `states.ts` (27 UFs, siglas únicas, `isUf`) e de `cuisines.ts` (18 opções na ordem do PRD, ids únicos, `cuisineLabel` com id e com "Outro", `matchCuisine` com rótulo, sinônimo, sem acento e sem casamento). Depois, implementar os dois e os tipos da decisão 1. Verificar com `npm test -- states cuisines`.
- [x] 1.3 Escrever o teste de `buildCityModules` com uma amostra de 5 municípios de 2 UFs (UF pelo prefixo do código, ordem alfabética em `pt-BR`, `CITY_COUNT` e data no `index.ts`) e depois implementar `scripts/ibge/cities.ts` e `generate-cities.ts`. Verificar com `npm test -- ibge`.
- [x] 1.4 **(autorização: API pública do IBGE, sem chave)** Rodar `npx tsx scripts/ibge/generate-cities.ts` uma vez. Verificar que os 28 arquivos de `src/lib/profile/cities/` foram criados, que `npm run lint` passa sem reformatar nada e que o `CITY_COUNT` gerado aparece no relatório.
- [x] 1.5 Escrever os testes de `cities.ts` (Rio de Janeiro 3304557 em RJ; `findCity` com código de outra UF devolve `null`; `findCitiesByName("Bom Jesus")` devolve mais de um; a soma das UFs é igual a `CITY_COUNT`) e depois implementá-lo. Verificar com `npm test -- cities`.

## 2. Parser e conversão

- [x] 2.1 Mover os textos de validação para `src/lib/validation-messages.ts`, com os novos da decisão 4, e reexportá-los em `errors.ts`. Verificar com `npm test -- validate handlers`, que deve continuar passando sem mudar as asserções.
- [x] 2.2 Escrever os testes de `parseProfileInput`, com os cenários da spec `chat-api` ("Ler e salvar o perfil da conta"), a ordem da decisão 4, `requirePlan` falso, o filtro no texto de "Outro" e o `field` de cada erro. Depois, implementar. Verificar com `npm test -- parse`.
- [x] 2.3 Escrever os testes de `upgradeProfile`, com os cenários da spec `answer-generation` ("Perfil salvo no formato antigo"), `{}` → `{ version: 2 }` sem revisão, v2 com campo inválido descartado e nome antigo recusado pelo filtro. Depois, implementar. Verificar com `npm test -- upgrade`.

## 3. Banco, API e assistente

- [x] 3.1 Trocar o `toProfile` por `upgradeProfile` nos repositórios de conta e de conversa e acrescentar `profileNeedsReview` ao `AccountRecord` (decisão 5). Ajustar os testes dos mapeadores. Verificar com `npm test -- mappers` e `npm run typecheck`.
- [x] 3.2 Escrever os testes do handler de perfil (`GET` com `needsReview`; `PUT` v2 válido; `PUT` antigo; erros com `field: "cuisine"` e `"location"`) e depois ligar o `parseProfileUpdate` ao parser. Verificar com `npm test -- handlers validate`.
- [x] 3.3 Escrever os testes de `formatProfile` e `buildSystemInstruction` (cenários da spec `answer-generation`) e do assistente (`cityName` resolvido a partir do local). Depois, implementar a decisão 6. Verificar com `npm test -- prompts assistant`.
- [x] 3.4 Passar o `DEMO_PROFILE` para o v2 e ajustar `checkDemoProfile`, com os testes (local certo passa; local ausente ou diferente falha). Verificar com `npm test -- accounts smoke-checks`.

## 4. Interface

- [x] 4.1 Rodar `npx shadcn add command popover native-select` (decisão 7). Verificar que o `git diff package.json` só acrescenta o `cmdk` e que `npm run build` passa.
- [x] 4.2 Criar `search-combobox.tsx` e `cuisine-field.tsx`: busca com `matchesSearch`, opção `Usar "<busca>" como Outro`, campo de "Outro" com o filtro e o limite de 30. Verificar com `npm run typecheck` e `npm run lint`.
- [x] 4.3 Criar `location-fields.tsx`: estado com as 27 UFs, cidade desabilitada sem estado, carregada por `loadCities` e limpa ao trocar o estado. Verificar com `npm run typecheck`.
- [x] 4.4 Refazer o `profile-form.tsx` na ordem da spec `chat-ui`, com o corpo v2 e os erros por `field`, e ajustar o `saveProfile` e o `isProfileResponse` do `api-client.ts`, com os testes. Verificar com `npm test -- api-client`.
- [x] 4.5 Criar `profile-review-banner.tsx` e mostrá-lo em `src/app/page.tsx` quando `profileNeedsReview` for verdadeiro. Verificar com `npm run typecheck`.
- [x] 4.6 Revisar a tela com a skill `web-design-guidelines` (comboboxes por teclado, rótulos, erros ligados, 390 px). Verificar que cada apontamento foi corrigido ou justificado no relatório.

## 5. CLI e eval

- [x] 5.1 Implementar o `--perfil` no `scripts/chat.ts` (decisão 8), com o erro para as flags removidas. Verificar com `npm run typecheck`. A rodada real fica na 7.3.
- [x] 5.2 Validar o `perfil` do eval com o parser e atualizar as perguntas 122 a 126 (decisão 8), com os testes do cenário "Perfil no formato antigo". Verificar com `npm test -- questions` e com `git diff eval/perguntas.json`, que só pode mostrar essas mudanças.

## 6. Documentação

- [ ] 6.1 Escrever o ADR 0024, acrescentá-lo à lista do `docs/adr/README.md` e atualizar `AGENTS.md`, `docs/business.md`, `docs/architecture.md`, `docs/development.md`, `docs/qa.md` e `README.md` nas seções da decisão 9. Verificar com `git grep -n "nome, cozinha, cidade e horário\|--cidade\|--horario"`, que não deve achar nada fora de `docs/history/` e `openspec/`.

## 7. Verificação manual (orquestrador)

- [ ] 7.1 **(autorização)** Com `npm run dev` contra o `dev`, percorrer o fluxo "Primeiro acesso" do PRD (§6) numa demo: buscar "pizza", escolher RJ e "Niterói", salvar e ver "Local: Niterói (RJ)" no prompt com `--debug` ou no log local. Repetir só pelo teclado e com 390 px de largura. Registrar no `docs/qa.md` e no relatório.
- [ ] 7.2 **(autorização)** No `dev`, gravar numa conta de teste o perfil antigo `{ "plan": "misto", "city": "Bom Jesus" }`, abrir o chat e ver a faixa; salvar o perfil e ver que a faixa some. Registrar no relatório.
- [ ] 7.3 **(autorização)** Rodar `npm run chat -- --perfil <arquivo v2>` uma vez e `npm run eval -- --label perfil-v2 --only 122,123,124,125,126 --delay-ms 4000` contra o `dev`. Verificar que os acertos são iguais aos da última rodada em `eval/resultados/`. Se algum mudar, registrar a pergunta, a resposta e a causa.

## 8. Verificação final

- [ ] 8.1 Rodar `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`. Verificar que os quatro passam, que o build separa os municípios por UF (decisão 2) e registrar no relatório os critérios de aceite do PRD (§7) que esta change fecha, com a evidência de cada um.
