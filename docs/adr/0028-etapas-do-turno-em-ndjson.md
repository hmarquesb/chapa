# 0028. Etapas do turno em NDJSON, com a resposta ainda inteira

- **Status:** Aceito
- **Data:** 2026-11-16
- **Complementa:** [ADR 0004](0004-sem-streaming.md) (não o substitui)

## Contexto

Um turno do Chapa leva alguns segundos: memória, roteador, reescrita, busca e geração. Durante esse tempo a tela mostrava só "Chapa está pensando…". Para um projeto de estudo de RAG, é o momento mais interessante de mostrar: o assistente lê a conversa, busca na base e escreve com base em alguns documentos. As etapas precisam ser as que de fato acontecem, e não uma animação por tempo. O [ADR 0004](0004-sem-streaming.md) continua valendo: o texto da resposta só sai depois do guardrail de saída.

## Decisão

- **O núcleo avisa as etapas.** `handleMessage` aceita um `onProgress` opcional, chamado no início de cada etapa que de fato roda: `history`, `understanding` (roteador ou reescrita, uma vez), `searching` e `writing` (com quantos documentos vão ao modelo). O cumprimento e o bloqueio de entrada não têm etapas; o fallback sem trecho para em `searching`. Uma falha no aviso é ignorada e nunca derruba o turno. O CLI e o eval não usam o aviso.
- **`POST /api/chat` responde em NDJSON quando o pedido traz `Accept: application/x-ndjson`.** São 200, com uma linha JSON por evento: uma por etapa e, no fim, o `reply` (o mesmo objeto da resposta em JSON) ou o `error` (o mesmo texto fixo em PT-BR). Sem o cabeçalho, a rota responde em JSON, como antes.
- **Os erros antes do turno continuam em JSON**, com o status HTTP de sempre (401, 400, 404, 415, 429): a sessão, o formato, o corpo, os limites e o dono da conversa são conferidos antes de o stream começar.
- **As etapas não levam conteúdo:** só o nome e, em `writing`, a contagem de documentos. A pergunta reescrita, os trechos, os nomes dos arquivos, o prompt e o consumo ficam no servidor. O texto da resposta sai só no `reply`, inteiro, depois do guardrail de saída.
- **Uma linha de log por pedido, no fim do stream**, com o desfecho do turno: `status: 200` e os dados do turno no `reply`; o status do erro (500, 503, 429, 404) e o nome do erro no `error`.

## Alternativas consideradas

- **SSE (`text/event-stream`).** Descartada: o `EventSource` só faz GET, e o cliente teria de interpretar o formato com `fetch` de qualquer jeito. NDJSON é uma linha de JSON por evento, mais simples de gerar e de testar.
- **Responder sempre em stream.** Descartada: quebraria o smoke, o `scripts/screenshots.ts` e o `curl` sem ganho para eles.
- **Etapas adivinhadas por tempo, no handler ou na interface.** Descartada: mostraria etapas que não aconteceram, como a busca num "obrigada".
- **Streaming do texto da resposta.** Fora do escopo: contraria o [ADR 0004](0004-sem-streaming.md).

## Consequências

- **Log com o desfecho do turno:** um pedido em NDJSON que falha no meio registra `status: 503` (ou 500) embora o HTTP enviado tenha sido 200. É o desfecho do turno que o log serve para medir.
- **Cliente que fecha a aba:** o servidor termina e grava o turno, como no JSON. Escrever num stream fechado é ignorado.
- **Proxy que segura o stream:** a interface continua funcionando, só sem etapas no meio; a resposta chega inteira no fim.
- **Etapas rápidas piscam:** aceito, porque são as reais. A lista mantém as feitas com ✓, então nada some antes da resposta.
- **Sem dependências, variáveis ou migrações novas:** `ReadableStream`, `TextEncoder` e `TextDecoder` já existem no Node e no navegador.
