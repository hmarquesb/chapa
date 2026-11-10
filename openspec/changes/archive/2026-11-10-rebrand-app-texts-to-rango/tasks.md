# Tasks

As tarefas marcadas **(autorização)** usam o banco `dev` e a `GEMINI_API_KEY`, já autorizados no `CLAUDE.md`. Nenhuma tarefa toca o `prod`. As decisões citadas são as do `design.md`.

## 1. Mensagens fixas

- [x] 1.1 Criar `src/core/messages.test.ts` com os casos da decisão 5. Verificar que `npx vitest run src/core/messages.test.ts` falha com os textos atuais.
- [x] 1.2 Trocar os três textos em `src/core/messages.ts` pelos da decisão 2. Verificar que `npx vitest run src/core/` passa (incluindo `assistant.test.ts` e `guardrails.test.ts`, sem mudar as fixtures).

## 2. Prompts

- [x] 2.1 Acrescentar a `src/core/prompts.test.ts` os casos da decisão 5. Verificar que eles falham com os prompts atuais.
- [x] 2.2 Trocar em `src/core/prompts.ts` só os trechos da decisão 3. Verificar que `npx vitest run src/core/prompts.test.ts` passa e que `git diff src/core/prompts.ts` não mostra outras linhas alteradas.

## 3. Interface e CLI

- [x] 3.1 Atualizar `profile-form.tsx` e `example-questions.tsx` como na decisão 4, e o comentário de `scripts/chat.ts`. Verificar com `git diff src/components/ scripts/chat.ts` que só essas linhas mudaram.
- [x] 3.2 Varredura. Rodar `git grep -niE "portal do parceiro|app de delivery|plano básico|ifood|rappi|uber ?eats|99 ?food|keeta|aiqfome" -- src/ ':!*.test.ts'` e verificar que só sobra o rodapé de `chat-app.tsx` ("sem afiliação com nenhuma empresa de delivery"), que não muda nesta change.

## 4. Verificação manual

- [x] 4.1 **(autorização)** Com `npm run dev`, abrir a página e conferir: o rótulo "Plano na Rango" com o exemplo novo, as três perguntas de exemplo novas, e a pergunta "Me passa uma receita de lasanha?" terminando no fallback com "Painel Rango". Registrar no relatório o que foi visto (captura ou descrição).
- [x] 4.2 **(autorização)** Rodar `npm run chat -- --debug` e enviar "Qual a senha do meu portal?". Verificar que a resposta tem o status `blocked_input` e a mensagem nova, sem chamada ao LLM no debug.

## 5. Verificação final

- [x] 5.1 Rodar `npx openspec validate rebrand-app-texts-to-rango --strict` e verificar que a change é válida.
- [x] 5.2 Rodar `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` (a change toca componentes da página) e verificar que os quatro passam.

## Workflow follow-up

- Depois do merge, arquivar a change num PR próprio (`docs(openspec): archive rebrand-app-texts-to-rango`).
- Depois do merge desta change **e** da `add-rango-knowledge-base`: reingerir o `prod` (`npm run ingest`, H5, com o `.env.prod.local` carregado como no `CLAUDE.md`) e rodar o smoke na demo (a pessoa autoriza o smoke).
- Remover o worktree `../chapa-worktrees/rebrand-app-texts-to-rango` e a branch `feat/rebrand-app-texts-to-rango`.
