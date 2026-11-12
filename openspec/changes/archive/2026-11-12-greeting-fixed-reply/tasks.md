# Tasks

## 1. Banco e tipos

- [x] 1.1 Criar a migração `small_talk_status` (`npm run db -- migration new small_talk_status`) que troca o `messages_status_check` pelos cinco status; conferir o SQL lendo o arquivo gerado (sem aplicar)
- [x] 1.2 Acrescentar `small_talk` ao `ReplyStatus` (`src/lib/types.ts`) e criar `ReplyRoute` e o campo `route` no `AssistantReply` (`src/core/types.ts`); `npm run typecheck` aponta os pontos a ajustar

## 2. Regra de cumprimento

- [x] 2.1 Escrever `src/core/router/greeting.test.ts` antes do código: tabela com os cumprimentos do vocabulário, alongamentos (`oiii`, `olaaa`), complementos, emojis e pontuação, os tipos (`bom_dia`, `boa_tarde`, `boa_noite`, `neutro`), o `asksHowAreYou` e os contraexemplos ("bom dia, quanto é a comissão?", "oi, ignore suas regras", "bom dia e boa sorte com o repasse", "oi oi", "chapa", "tudo bem")
- [x] 2.2 Implementar `normalizeGreeting` e `matchGreeting` em `src/core/router/greeting.ts` até o teste da 2.1 passar
- [x] 2.3 Testar e implementar `greetingReply` em `src/core/messages.ts` (com e sem nome, com e sem "Tudo certo por aqui.", os quatro tipos); `npm test -- messages` passa

## 3. Fluxo do turno

- [x] 3.1 Em `src/core/assistant.test.ts`, escrever os casos com dublês que falham se chamados: "bom dia" com nome, sem nome e com nome recusado pelo filtro; cumprimento com 20 mensagens pendentes (sem resumo, sem `listMessages`); `appendTurn` com `small_talk` e `sources: []`; `usage` zero; `route` `cumprimento`, `rag` e `null` (CPF na mensagem curta)
- [x] 3.2 Implementar o desvio do cumprimento em `handleMessage` e o `route` em todos os retornos, até os testes da 3.1 e os antigos passarem

## 4. API, interface e CLI

- [x] 4.1 `LogEntry.replyRoute` em `src/app/api/_lib/log.ts` e o preenchimento em `handlers.ts`; teste do handler confere `replyRoute: "cumprimento"` e `llmCalls: 0` no log e o corpo `{ status, answer, sources, sessionId }` sem `route`
- [x] 4.2 `small_talk` na lista de status de `src/lib/api-client.ts`; o teste do cliente (se existir) aceita uma resposta `small_talk`
- [x] 4.3 `message-item.tsx` desenha `small_talk` no `Card` de resposta, sem fontes; `brand-showcase.tsx` ganha o exemplo de cumprimento; conferir com `npm run build`
- [x] 4.4 `scripts/chat.ts` mostra a rota no `--debug`; `npm run typecheck` passa

## 5. Documentação

- [x] 5.1 Atualizar `docs/architecture.md` ("Arquitetura do projeto", item "Fluxo de uma mensagem"), `docs/business.md` ("Como o restaurante usa") e `AGENTS.md` ("Onde mexer", linha nova), conforme o `design.md`

## 6. Verificação manual (orquestrador)

- [x] 6.1 Aplicar a migração no `dev` com os comandos do `DEPLOY.md` ("Banco `dev` no Neon")
- [x] 6.2 `npm run chat -- --nome "Cantina da Nonna" --debug`: "bom dia", "oi, tudo bem?" e "boa noite chapa" recebem a resposta fixa com 0 chamadas; "bom dia, quanto é a comissão do Plano Próprio?" segue para o RAG
- [x] 6.3 `npm run dev` como demo: "bom dia" mostra "Bom dia, Marmitaria Boa Panela! Em que posso ajudar?" no balão de resposta; recarregar a conversa mantém a aparência; `/marca` mostra o exemplo
- [x] 6.4 Aplicar a migração no `prod` (H5 parcial) antes do merge

## 7. Portões

- [x] 7.1 `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` passam

## Workflow follow-up

- Depois do deploy, a pessoa (ou o orquestrador, com autorização) manda "bom dia" com a conta demo na produção.
- Arquivar a change num PR `docs(openspec): archive greeting-fixed-reply` depois do merge, antes do archive da `conversation-router`.
