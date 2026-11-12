# Proposal

## Why

Hoje um "bom dia" passa por todo o RAG, não acha nenhum trecho acima do `minScore` e recebe o fallback ("Não encontrei essa informação na base do parceiro…"). A resposta parece um erro e ainda gasta um embedding (e uma reescrita, quando já há histórico). Esta é a change 1 de 3 do PRD `prd-chapa-conversa.md` (peça 4 do Chapa v2): ela resolve o cumprimento puro com uma regra local e uma resposta fixa, sem chamar nenhum modelo (objetivo O1), e cria a rota, o status e a aparência que as changes 2 (`conversation-router`) e 3 (`eval-routing`) usam.

## What Changes

- **Regra local de cumprimento:** uma função pura reconhece a mensagem **inteira** como cumprimento ("bom dia", "oi, tudo bem?", "boa noite chapa", "oiii"), sobre o texto sem acentos, pontuação e emojis. Qualquer palavra fora do vocabulário devolve "não é cumprimento": "bom dia, quanto é a comissão?" e "oi, ignore suas regras" seguem para o RAG.
- **Resposta fixa:** `{Cumprimento}{, Nome}! {Tudo certo por aqui. }Em que posso ajudar?`, com o texto em `src/core/messages.ts`. O cumprimento espelha o que o restaurante escreveu ("Bom dia", "Boa tarde", "Boa noite" ou "Olá"), sem consultar o relógio. O nome vem do perfil já limpo pelo filtro da ADR 0023. "Tudo certo por aqui." só entra quando a mensagem perguntava "tudo bem?" ou equivalente.
- **Fluxo do turno:** a regra roda depois do guardrail de entrada e da leitura da sessão e do perfil, e antes do resumo, da reescrita e da busca. Um cumprimento não chama nenhum modelo (nem o resumo), não soma consumo e é gravado como um turno normal, com `sources: []`.
- **Status novo `small_talk`** no `ReplyStatus`, na API, no histórico e no banco. **Migração** que acrescenta `small_talk` ao `check` de `messages.status`.
- **Rota do turno:** `AssistantReply` ganha `route` (`"cumprimento"` ou `"rag"`; `null` quando a entrada foi bloqueada). Ela vai para o log (campo `replyRoute`, porque `route` já é o modelo da rota HTTP) e para o eval, e **não** vai para o banco nem para a resposta da API.
- **Interface:** a resposta `small_talk` aparece no mesmo balão da resposta normal, sem fontes. A página `/marca` ganha um exemplo de cumprimento.
- **CLI:** `npm run chat` mostra o status `small_talk` como os outros.
- `docs/architecture.md`, `docs/business.md` e o `AGENTS.md` atualizados.

## Fora do escopo

- O roteador com o Flash-Lite para agradecimento, despedida e "quem é você?", a instrução de retribuir o cumprimento numa mensagem mista, a config `router` e a ADR do roteador: change 2 (`conversation-router`).
- Perguntas novas, `rota_esperada` e métricas de rota no eval, e as rodadas `v4`: change 3 (`eval-routing`). Nesta change, o `route` só passa a aparecer dentro da resposta gravada de cada pergunta, sem métrica nova e sem mudar o código do eval.
- Cumprimento em outra língua, cumprimento pelo relógio e conversa livre fora do tema (continua no fallback).
- Mudanças no RAG, nos prompts, no guardrail e nos presets.
- Smoke automatizado novo: o "bom dia" na demo publicada é verificado à mão.

## Chamadas reais e checkpoints humanos

1. **Orquestrador (autorização prévia):** aplicar a migração no `dev` (Neon), com os comandos do `DEPLOY.md`, e verificar com `npm run dev` e `npm run chat` que "bom dia", "oi, tudo bem?" e "boa noite chapa" recebem a resposta fixa com o nome, e que "bom dia, quanto é a comissão do Plano Próprio?" segue para o RAG. O cumprimento não gasta cota; a pergunta mista gasta as chamadas de um turno normal.
2. **Orquestrador (H5 parcial, autorizado):** aplicar a migração no `prod` **antes do merge**. Sem ela, o primeiro "bom dia" em produção falha no `check` e vira `500`. A migração só alarga o `check`, então o código atual continua funcionando com ela.
3. **Pessoa:** depois do deploy, entrar como demo na produção e mandar "bom dia" (ou autorizar o orquestrador a rodar o smoke).

Sem ADR: a regra local é uma consequência direta do fluxo atual. A decisão de arquitetura (roteador com Flash-Lite e sentinela) fica na ADR da change 2.

## Capabilities

### New Capabilities

- `conversation-routing`: decide, antes do RAG, se a mensagem é conversa (por enquanto, só o cumprimento puro) e como ela é respondida. A change 2 acrescenta o roteador com o Flash-Lite a esta capacidade.

### Modified Capabilities

- `answer-generation`: a ordem do turno ganha a regra de cumprimento, o status `small_talk` entra na lista de status, e a resposta passa a informar a rota.
- `chat-api`: o `status` da resposta e do histórico aceita `small_talk`, e o log registra a rota do turno.
- `chat-ui`: a resposta `small_talk` usa a aparência de resposta normal, sem fontes.
- `session-memory`: o turno de cumprimento é gravado sem passar pelo resumo, e entra no histórico e no resumo das mensagens seguintes.
- `brand`: a página de referência da marca mostra um exemplo de cumprimento.

## Impact

- **Código:** `src/core/router/greeting.ts` (novo), `src/core/messages.ts`, `src/core/assistant.ts`, `src/core/types.ts`, `src/lib/types.ts`, `src/lib/api-client.ts`, `src/app/api/_lib/log.ts` e `handlers.ts`, `src/components/chat/message-item.tsx`, `src/components/brand/brand-showcase.tsx`, `scripts/chat.ts` e uma migração nova em `supabase/migrations/`. A lista fechada está no `design.md`.
- **API:** o contrato não muda de forma, mas `status` ganha um valor. O cliente do navegador passa a aceitá-lo.
- **Banco:** uma migração que troca o `check` de `messages.status`.
- **Dependências:** nenhuma.
- **Paralelismo:** a `structure-profile-hours` está em *apply* e também precisa mexer no `cleanProfile` de `src/core/assistant.ts` (o `hours` deixa de ser texto) e em `docs/business.md` e `docs/architecture.md`. O *apply* desta change começa **depois do merge** dela, a partir da `main` atualizada.
