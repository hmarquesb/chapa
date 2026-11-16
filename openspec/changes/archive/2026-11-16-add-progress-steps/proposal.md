# Proposal

## Why

Uma resposta do Chapa leva alguns segundos (memória, roteador, reescrita, busca e geração), e a tela mostra só "Chapa está pensando…". Para um projeto de estudo de RAG, esse é o momento mais interessante de mostrar: a pessoa vê o assistente ler a conversa, buscar na base e escrever com base em alguns documentos. As etapas mostradas precisam ser as que de fato acontecem, e não uma animação por tempo.

## What Changes

- **O núcleo avisa as etapas do turno:** `handleMessage` aceita um aviso opcional, chamado no início de cada etapa que de fato roda: "Lendo a conversa", "Entendendo a pergunta" (roteador ou reescrita), "Buscando na base de conhecimento" e "Escrevendo a resposta" (com quantos documentos foram ao modelo). O cumprimento e o bloqueio de entrada não têm etapas; o fallback sem trecho para em "Buscando". O CLI e o eval não usam o aviso e não mudam.
- **`POST /api/chat` em NDJSON, quando pedido:** com `Accept: application/x-ndjson`, a resposta é 200 com uma linha JSON por evento: uma por etapa e, no fim, a resposta inteira (`status`, `answer`, `sources`, `sessionId`) ou um erro. Os erros que acontecem antes de o turno começar (401, 400, 404, 415, 429) continuam em JSON, com o status HTTP de sempre. Sem esse cabeçalho, a rota responde como hoje (smoke, screenshots e `curl` não mudam).
- **O texto da resposta continua sem streaming.** A resposta só sai, inteira, depois do guardrail de saída. As etapas não levam a pergunta reescrita, os trechos nem o prompt: só o nome da etapa e uma contagem de documentos.
- **Interface:** o indicador "Chapa está pensando…" vira uma lista curta das etapas recebidas: as já feitas com ✓ e a atual com os três pontos. O leitor de tela anuncia cada etapa nova. Com `prefers-reduced-motion`, sem pontos se mexendo.
- **ADR novo:** `docs/adr/0028-etapas-do-turno-em-ndjson.md`, que complementa o [ADR 0004](../../../docs/adr/0004-sem-streaming.md) (a resposta segue sem streaming; só as etapas vão antes). A regra 8 do `AGENTS.md` passa a citar as duas coisas.

## Capabilities

### New Capabilities
<!-- Nenhuma. -->

### Modified Capabilities
- `chat-api`: o formato NDJSON de `POST /api/chat` (eventos, ordem das etapas por rota, erro depois do início e o log do pedido).
- `chat-ui`: o requisito "Resposta inteira, sem streaming" passa a mostrar as etapas enquanto a resposta não chega.

## Impact

- **Código:** `src/core/types.ts` e `src/core/assistant.ts` (o aviso das etapas), `src/lib/types.ts` (tipos das etapas e dos eventos), `src/app/api/_lib/handlers.ts` (o ramo NDJSON), `src/lib/` (leitura do NDJSON no `api-client`, textos das etapas, `chat-state`), `src/components/brand/thinking-indicator.tsx` e `src/components/chat/` (`message-list`, `chat-app`).
- **Infra:** a Vercel já aceita respostas em stream nas funções Node, e a rota já tem `maxDuration = 60`. Nenhuma variável, migração ou configuração nova.
- **Chamadas reais e checkpoints humanos:** nenhuma chamada nova nos testes. A verificação manual usa `npm run dev` com o banco `dev` e a `GEMINI_API_KEY` (autorizada para o orquestrador). Conferir as etapas no deploy da Vercel fica com a pessoa, depois do merge. Sem `ingest`, `eval`, `smoke` nem `db push`.
- **Dependências:** nenhuma nova. O NDJSON usa `ReadableStream`, `TextEncoder` e `TextDecoder`, que já existem no Node e no navegador.
- **ADR:** 0028, novo.

### Fora do escopo

- Streaming do texto da resposta, palavra por palavra (o ADR 0004 continua valendo).
- Mostrar a pergunta reescrita, os trechos, as notas da busca ou os nomes dos documentos antes da resposta.
- Guardar as etapas no banco ou mostrá-las depois que a resposta chega, inclusive no histórico.
- Etapas no `npm run chat` e no `eval`.
- Cancelar o turno quando a pessoa fecha a aba: o servidor termina e grava o turno, como hoje.
- Mudar o smoke para NDJSON.
- Memória entre conversas: a memória dentro de uma conversa já existe e não muda.
