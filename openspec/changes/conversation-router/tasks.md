# Tasks

## 1. Config e tipos

- [x] 1.1 Acrescentar `router: { enabled, maxWords }` ao `AppConfig` e ao `loadConfig` (`true`, `12`) e ajustar os configs montados à mão nos testes; `npm run typecheck` passa
- [x] 1.2 Acrescentar `"conversa"` ao `ReplyRoute` e `routerMs` ao `AssistantReply` (`src/core/types.ts`)

## 2. Prompt

- [x] 2.1 Extrair `KNOWLEDGE_TOPICS` do `SYSTEM_PROMPT` e acrescentar a frase de retribuir o cumprimento; `prompts.test.ts` confere que o resto do texto não mudou e que a frase está lá
- [x] 2.2 Escrever `CONVERSATION_PROMPT`, `CONVERSATION_SENTINEL`, `buildConversationSystem` e `buildConversationMessage`, com testes: os temas, a sentinela, os exemplos dos dois lados, a linha do nome só com nome e a última resposta só quando houver

## 3. Roteador

- [x] 3.1 Escrever `src/core/router/conversation.test.ts` antes do código: `countWords` (pontuação, emojis, 12 e 13 palavras) e a tabela do `acceptConversationReply` (vazio, "DUVIDA", "DÚVIDA.", "duvida" minúsculo aceito, "Se tiver outra dúvida…" aceito, dígito, texto do fallback, saída barrada pelo `validateOutput`, resposta boa aparada)
- [x] 3.2 Implementar `countWords` e `acceptConversationReply` até a 3.1 passar
- [x] 3.3 Testar e implementar `routeConversation` com dublê: parâmetros da chamada (modelo, temperatura 0, 120 tokens, system e mensagem), `conversa` com `usage`, `rag` com `usage` na sentinela e `usage: null` no erro, latência pelo `now`, nunca rejeita

## 4. Fluxo do turno

- [x] 4.1 Em `assistant.test.ts`, escrever os casos: conversa aceita (status `small_talk`, rota `conversa`, sem embedding, `appendTurn` com `sources: []`, `usage` do roteador); `DUVIDA`, erro e dígito seguem para o RAG somando o `usage`; mais de 12 palavras e `router.enabled: false` não chamam o roteador; a última resposta do Chapa chega ao roteador; cumprimento e CPF continuam sem chamar o modelo
- [x] 4.2 Ligar o roteador no `handleMessage` até os testes da 4.1 e os antigos passarem
- [x] 4.3 `routerMs` no `LogEntry` e no `handlers.ts` (teste do handler confere) e no `--debug` do `scripts/chat.ts`

## 5. Documentação

- [x] 5.1 Escrever a ADR 0025 e a linha no `docs/adr/README.md`
- [x] 5.2 Atualizar `docs/architecture.md`, `docs/business.md` e `AGENTS.md` nas seções listadas no `design.md`

## 6. Verificação manual (orquestrador)

- [x] 6.1 `npm run chat -- --nome "Cantina da Nonna" --debug` contra o `dev` com as mensagens do checkpoint 1 da proposta: as três de conversa terminam em `small_talk`; "e no Plano Entrega?", "me conta uma piada" e a mista terminam em `rag`, e a mista retribui o cumprimento
- [x] 6.2 Rodada parcial `router-check` do eval (checkpoint 2 da proposta), com `--only` nos ids de `multi_turno`, `fora_de_escopo` e `adversarial` e `--delay-ms`: nenhuma pergunta termina em `small_talk`; o resultado vai para a descrição do PR

## 7. Portões

- [x] 7.1 `npm run lint`, `npm run typecheck` e `npm test` passam

## Workflow follow-up

- Arquivar num PR `docs(openspec): archive conversation-router`, só depois do archive da `greeting-fixed-reply` (o delta de `conversation-routing` modifica um requisito que ela cria).
