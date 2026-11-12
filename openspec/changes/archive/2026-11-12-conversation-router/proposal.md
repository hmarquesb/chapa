# Proposal

## Why

Depois da change 1 (`greeting-fixed-reply`), o cumprimento puro já recebe uma resposta fixa, mas "obrigada, ajudou muito", "valeu, era só isso" e "o que você sabe fazer?" ainda passam pela busca, não acham trecho e caem no fallback. Esta é a change 2 de 3 do PRD `prd-chapa-conversa.md`: um **roteador** com o Flash-Lite, que já faz a reescrita e o resumo, decide numa única chamada se a mensagem curta é conversa e, se for, já devolve a resposta (objetivo O2). Na dúvida, a mensagem segue para o RAG (objetivo O3). A change também pede ao modelo de resposta que retribua o cumprimento numa mensagem mista (objetivo O4). Ela **depende da change 1 estar aplicada e arquivada**, e os deltas foram escritos sobre o texto que ela deixa.

## What Changes

- **Roteador de conversa:** para mensagens que não são cumprimento (regra da change 1) e têm até 12 palavras, uma chamada ao `config.models.fast`, com temperatura 0 e até 120 tokens, recebe a mensagem, a última resposta do Chapa (quando houver) e o nome do restaurante. O modelo devolve a resposta, se a mensagem for conversa (agradecimento, despedida, elogio, pergunta sobre o próprio Chapa), ou exatamente `DUVIDA`, se não for.
- **Prompt novo `CONVERSATION_PROMPT`**, com as regras do PRD (no máximo 2 frases, nunca cita número, prazo, taxa ou regra da Rango, na dúvida escolhe `DUVIDA`) e 4 a 6 exemplos de cada lado, incluindo mensagens mistas, continuações curtas ("e no Plano Entrega?"), assunto fora do tema e pedido para ignorar regras.
- **RAG como padrão seguro:** a mensagem segue para o RAG, como hoje, quando a saída é a sentinela `DUVIDA`, vem vazia, tem **qualquer dígito**, contém o texto do fallback, é barrada pelo `validateOutput`, ou quando a chamada falha. O roteador nunca derruba o turno.
- **Resposta de conversa:** status `small_talk`, rota nova `conversa`, sem fontes, gravada como os outros turnos. O consumo do turno soma o resumo (se houve) e a chamada do roteador. Quando a mensagem segue para o RAG, o consumo soma também a chamada do roteador.
- **Mensagem mista:** o `SYSTEM_PROMPT` ganha "Se a mensagem começar com um cumprimento, retribua em poucas palavras antes de responder." O resto da geração não muda.
- **Config nova** `router: { enabled, maxWords }` em `AppConfig`, com `enabled: true` e `maxWords: 12`. Com `enabled: false`, só a regra local da change 1 roda. A change 3 usa esse interruptor nas rodadas `v4-baseline` e `v4-regras`.
- **Log:** `routerMs`, a latência da chamada do roteador, quando ela acontece.
- **ADR 0025** "Roteador de conversa antes do RAG, com regra local e Flash-Lite".
- `docs/architecture.md`, `docs/business.md`, `AGENTS.md` e o índice de ADRs atualizados.

## Fora do escopo

- Perguntas novas, `rota_esperada`, métricas de rota, a flag do eval e as rodadas `v4`, `v4-baseline` e `v4-regras`: change 3 (`eval-routing`). O README com a tabela da `v4` também fica para ela.
- Conversa livre fora do tema ("me conta uma piada", futebol, receitas): continua no fallback, porque o roteador devolve `DUVIDA`.
- Provedor ou framework novo (a JEV, da TypeSafe, foi descartada por ser paga; a ADR 0009, só Gemini, continua valendo). Os itens do PRD sobre a JEV e a "confiança mínima de 0,8" (seções 8 e 9) são resquícios da alternativa descartada e não entram.
- Ferramentas e loop de agente, streaming, mudanças no RAG, nos presets e na interface.

## Chamadas reais e checkpoints humanos

1. **Orquestrador (autorização prévia):** `npm run chat --debug` contra o `dev` com "obrigada, ajudou muito", "valeu, era só isso", "o que você sabe fazer?", "e no Plano Entrega?" depois de uma pergunta sobre o Plano Próprio, "me conta uma piada" e "bom dia, quanto é a comissão do Plano Próprio?". Cerca de 15 chamadas.
2. **Orquestrador (autorização prévia):** como o prompt de sistema muda, uma rodada parcial do eval contra o `dev` nos grupos de maior risco de falso small talk: `npm run eval -- --label router-check --only <ids de multi_turno, fora_de_escopo e adversarial> --delay-ms <n>` (16 perguntas, cerca de 60 chamadas). Nenhuma delas pode terminar em `small_talk`. As rodadas completas ficam na change 3.
3. **Pessoa:** nenhum checkpoint novo. Não há migração: o status `small_talk` já existe desde a change 1.

## Capabilities

### New Capabilities

Nenhuma. O roteador entra na capacidade `conversation-routing`, criada pela change 1.

### Modified Capabilities

- `conversation-routing`: o roteador com o Flash-Lite (quando roda, o que recebe, como decide, o padrão seguro e o interruptor) e a rota `conversa`.
- `answer-generation`: a ordem do turno ganha o roteador, a instrução de sistema pede para retribuir o cumprimento, e o consumo do turno soma a chamada do roteador.
- `chat-api`: o log registra a latência do roteador.

## Impact

- **Código:** `src/core/router/conversation.ts` (novo), `src/core/prompts.ts`, `src/core/messages.ts`, `src/core/assistant.ts`, `src/core/types.ts`, `src/config.ts`, `src/app/api/_lib/log.ts` e `handlers.ts`, `scripts/chat.ts`. A lista fechada está no `design.md`.
- **API:** nenhuma mudança de contrato.
- **Banco:** nenhuma.
- **Dependências:** nenhuma. Usa o `LlmClient` de sempre (ADR 0002).
- **Custo:** mensagens de conversa trocam embedding e busca por 1 chamada ao Flash-Lite. Perguntas curtas que são dúvida de verdade pagam 1 chamada a mais; mensagens longas e cumprimentos, nenhuma.
- **Paralelismo:** mexe em `src/core/prompts.ts` e `src/core/assistant.ts`, os mesmos arquivos da change 1 e da `structure-profile-hours`. O *apply* começa depois do merge da change 1.
