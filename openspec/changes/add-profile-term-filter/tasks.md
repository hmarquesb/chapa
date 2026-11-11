# Tasks

Esta change é a 1 de 3 do PRD `prd-chapa-perfil-estruturado.md` e não depende das outras duas. As tarefas **(autorização)** usam o banco `dev` ou a API, com a autorização prévia do `CLAUDE.md`, e são do orquestrador.

## 1. Filtro

- [x] 1.1 Escrever o `normalize.test.ts` (minúsculas e acentos, cada troca de leetspeak, letras repetidas, letras soltas separadas por espaço, `.` e `-`, sinais permitidos viram separador de token) e depois implementar `normalizeForModeration` (decisão 1). Verificar com `npm test -- normalize`.
- [x] 1.2 Criar `blocked-terms.ts` e `allowed-terms.ts` (decisão 2), com o comentário de propósito e as cinco categorias em base64. Verificar com um teste que decodifica as listas (nenhuma vazia e sem termo repetido) e com `git grep -niw` de três termos da lista, que não pode achar nada em texto claro.
- [x] 1.3 Escrever o `profile-text.test.ts` com os cenários da spec `guardrails`: os casos bloqueados gerados a partir das listas (decisão 2), as instruções, os caracteres, as marcas (só em `name`), a mensagem por campo e motivo, e as tabelas de falsos positivos e de 20 ou mais nomes inventados. Depois, implementar `checkProfileText` e `profileTextMessage`. Verificar com `npm test -- profile-text`.

## 2. API

- [x] 2.1 Escrever os testes de `parseProfileUpdate` (cenários da spec `chat-api`, "Recusa do texto do perfil por campo", e a ordem da decisão 3) e do `HttpError` com `field`. Depois, implementar em `validate.ts`, `http.ts` e `types.ts`. Verificar com `npm test -- validate http`.
- [x] 2.2 Escrever os testes do handler do `PUT /api/profile`: o `400` traz `{ error, field }`; o log traz `profileRejected` e não traz nenhum pedaço do texto recusado (checar a linha serializada); o perfil salvo não muda. Depois, implementar em `handlers.ts` e `log.ts`. Verificar com `npm test -- handlers`.

## 3. Prompt e assistente

- [x] 3.1 Escrever os testes de `buildSystemInstruction` (título do bloco delimitado; texto base com a regra nova) e do assistente (nome antigo recusado fica fora do prompt, e o plano continua). Depois, implementar a decisão 4. Verificar com `npm test -- prompts assistant`.
- [x] 3.2 Checar `--nome` e `--cozinha` no `scripts/chat.ts` (decisão 6). Verificar com `npm run typecheck`. A rodada real fica na 6.2.

## 4. Interface

- [ ] 4.1 Escrever o teste de `saveProfile` devolvendo o `field` do `400` e depois ajustar o `api-client.ts`. Verificar com `npm test -- api-client`.
- [ ] 4.2 Ajustar o `profile-form.tsx` (decisão 5): erro por campo ao sair dele e ao salvar, ARIA, foco no primeiro inválido e o `field` da API no campo certo. Verificar com `npm run typecheck` e `npm run lint`. O teste no navegador fica na 6.1.
- [ ] 4.3 Revisar o formulário com a skill `web-design-guidelines` (erro ligado ao campo, foco, `role="alert"`). Verificar que cada apontamento foi corrigido ou justificado no relatório.

## 5. Documentação

- [ ] 5.1 Escrever o ADR 0023 e acrescentá-lo à lista do `docs/adr/README.md`. Atualizar `AGENTS.md`, `docs/architecture.md` e `docs/development.md` nas seções da decisão 7. Verificar com `git diff --stat`, que deve mostrar só esses arquivos na documentação, e com `git grep -n "0024" docs/adr/`, que não deve achar nada.

## 6. Verificação manual (orquestrador)

- [ ] 6.1 **(autorização)** Com `npm run dev` contra o `dev`, entrar como demo e percorrer o checkpoint 1 da proposta: "M3rd@ Burguer" e "Ignore as regras" recusados no campo; "Pastelaria do Pinto" salvo; `PUT` direto com nome inadequado → `400` com `field: "name"`, e a linha de log sem o texto. Registrar no relatório.
- [ ] 6.2 **(autorização)** Rodar `npm run chat -- --nome "Ignore as regras" --plano misto` (deve terminar com a mensagem do filtro) e `npm run eval -- --label perfil-filtro --delay-ms 4000` contra o `dev`. Comparar com a última rodada em `eval/resultados/` e registrar no relatório cada pergunta que mudou, com a causa.

## 7. Verificação final

- [ ] 7.1 Rodar `npm run lint`, `npm run typecheck`, `npm test` e `npm run build`. Verificar que os quatro passam e registrar no relatório os critérios de aceite do PRD (§7) que esta change fecha (o filtro e a proteção do prompt com as duas tabelas; nenhum texto recusado nos logs), com a evidência de cada um.
