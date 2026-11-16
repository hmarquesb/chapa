# Tasks

## 1. Núcleo

- [x] 1.1 Acrescentar `ProgressStep`, `ProgressEvent`, `ChatStreamEvent` e `CHAT_STREAM_CONTENT_TYPE` em `src/lib/types.ts` e `onProgress` em `HandleMessageInput` (`src/core/types.ts`), como na decisão 1; verificar com `npm run typecheck`
- [x] 1.2 Em `src/core/assistant.test.ts`, escrever primeiro os testes das etapas com fakes: bloqueio de entrada e cumprimento sem etapas; "conversa" pelo roteador com `history` e `understanding`; pergunta sem histórico e longa com `history`, `searching` e `writing` (sem `understanding`); pergunta com histórico com as quatro, `writing.documents` igual ao número de arquivos do contexto; fallback sem `writing`; um `onProgress` que lança não muda a resposta; sem `onProgress`, nada muda
- [x] 1.3 Implementar o `emit` e os quatro pontos da decisão 2 em `src/core/assistant.ts`; verificar com `npx vitest run src/core`

## 2. API

- [x] 2.1 Em `src/app/api/_lib/http.test.ts`, escrever primeiro os testes de `wantsNdjson` (com e sem o tipo, com lista e `q=`) e `encodeNdjsonLine` (uma linha com `\n` no fim, JSON válido), depois implementá-los em `src/app/api/_lib/http.ts`; verificar com `npx vitest run src/app/api/_lib/http.test.ts`
- [x] 2.2 Em `src/app/api/_lib/handlers.test.ts`, escrever primeiro os testes do ramo NDJSON com fakes: cabeçalhos da resposta; etapas e `reply` na ordem; `reply` igual ao JSON (inclusive `sessionId: null` no bloqueio de conversa nova); 401, 415, 404 e 429 em JSON mesmo com o `Accept`; erro inesperado e `LlmUnavailableError` no meio viram `error` com o texto de `toPublicError`; uma linha de log só, no fim, com `status` 200, 500 ou 503; sem o `Accept`, o JSON de hoje
- [x] 2.3 Implementar `toChatResponse` e o ramo NDJSON em `createChatHandler` (decisão 3); verificar com `npx vitest run src/app/api src/architecture.test.ts`

## 3. Cliente e interface

- [x] 3.1 Escrever primeiro `src/lib/chat-stream.test.ts` (linha quebrada entre dois pedaços, várias linhas num pedaço, `\r\n`, linha vazia, JSON inválido, evento desconhecido, `writing` sem `documents`) e `src/lib/progress-steps.test.ts` (os quatro textos, singular e plural), depois criar os dois arquivos (decisão 4); verificar com `npx vitest run src/lib/chat-stream.test.ts src/lib/progress-steps.test.ts`
- [x] 3.2 Em `src/lib/api-client.test.ts`, escrever primeiro os testes de `sendMessage` com um `fetch` falso que devolve um corpo NDJSON em pedaços: manda o `Accept`; chama `onProgress` na ordem; `reply` vira `ok`; `error` vira `{ ok: false, status: 500 }` com o texto; corpo sem final ou com linha inválida dá o texto de resposta inesperada; resposta JSON segue como hoje; depois implementar em `src/lib/api-client.ts` e ajustar os testes antigos à nova ordem de parâmetros; verificar com `npx vitest run src/lib/api-client.test.ts`
- [x] 3.3 Em `src/lib/chat-state.test.ts`, escrever primeiro os testes de `steps` (acumula com `sending`, ignora sem `sending`, zera em `send_started`, `send_succeeded`, `send_failed` e `reset`), depois implementar em `src/lib/chat-state.ts`; verificar com `npx vitest run src/lib/chat-state.test.ts`
- [x] 3.4 Atualizar `ThinkingIndicator` (decisão 5), `MessageList` (prop `steps`) e `chat-app.tsx` (`onProgress` que despacha `progress` só se a conversa não mudou); verificar com `npm run typecheck`, `npm run lint` e `grep -n "ThinkingIndicator" src/components/brand/brand-showcase.tsx` ainda sem props

## 4. Documentação

- [x] 4.1 Escrever `docs/adr/0028-etapas-do-turno-em-ndjson.md` (contexto, decisão, alternativas SSE e JSON sempre em stream, consequências, inclusive o log com o desfecho do turno) e a linha na tabela de `docs/adr/README.md`; verificar que o ADR 0004 não foi editado (`git diff --stat docs/adr/0004-sem-streaming.md` vazio)
- [x] 4.2 Atualizar a regra 8 do `AGENTS.md`, as seções "Front-end" e "Back-end" de `docs/architecture.md` e o item do chat em "Verificação manual local" de `docs/qa.md`, como no design; verificar relendo cada trecho

## 5. Verificação manual (orquestrador)

- [ ] 5.1 Com `npm run dev` no `dev` (demo): numa conversa com histórico, uma pergunta da base mostra "Lendo a conversa", "Entendendo a pergunta", "Buscando na base de conhecimento" e "Escrevendo a resposta com base em N documentos", com ✓ nas anteriores, e a lista some quando a resposta chega; "bom dia" mostra só "Chapa está pensando…"; uma pergunta fora da base para em "Buscando"; com movimento reduzido, sem pontos; o Network do navegador mostra a resposta em `application/x-ndjson` e nenhuma linha com trecho ou pergunta reescrita; o terminal mostra uma linha de log por pedido; nos dois temas
- [x] 5.2 Rodar `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` no worktree, todos verdes

## Workflow follow-up

- Pendência da pessoa, depois do deploy: conferir na Vercel que as etapas aparecem uma a uma, e não todas no fim.
- Depois do merge: arquivar a change num PR próprio (`docs(openspec): archive add-progress-steps`) e remover o worktree.
