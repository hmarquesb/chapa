# Design

## Context

`openspec/specs/` está vazia (ver `proposal.md`, "Why"). O comportamento atual está no código da `main`, nos testes ao lado de cada módulo e nas specs históricas S00 a S10, que não são mais editadas. Esta change só escreve texto: os sete deltas em `specs/` são todos `ADDED`, e o archive os transforma nas specs vivas.

Fontes usadas para escrever os deltas, por capacidade:

| Capacidade | Código | Testes |
|---|---|---|
| `guardrails` | `src/core/guardrails.ts`, `src/core/messages.ts`, `src/core/text.ts` | `src/core/guardrails.test.ts`, `src/core/assistant.test.ts` |
| `retrieval` | `src/core/rag/*.ts`, `src/config.ts`, `src/infra/db/chunk-repository.ts`, `supabase/migrations/20261106003144_schema_inicial.sql`, `scripts/ingest.ts` | `src/core/rag/*.test.ts`, `src/config.test.ts` |
| `answer-generation` | `src/core/assistant.ts`, `src/core/prompts.ts`, `src/infra/llm/*.ts`, `src/core/errors.ts` | `src/core/assistant.test.ts`, `src/core/prompts.test.ts`, `src/infra/llm/*.test.ts` |
| `session-memory` | `src/core/assistant.ts`, `src/core/memory.ts`, `src/core/rewrite-query.ts`, `src/infra/db/session-repository.ts` | `src/core/memory.test.ts`, `src/core/rewrite-query.test.ts`, `src/core/assistant.test.ts`, `src/infra/db/mappers.test.ts` |
| `chat-api` | `src/app/api/**`, `src/infra/db/rate-limit-repository.ts`, `vercel.json` | `src/app/api/_lib/*.test.ts` |
| `chat-ui` | `src/app/page.tsx`, `src/app/layout.tsx`, `src/components/chat/*.tsx`, `src/lib/*.ts` | `src/lib/*.test.ts` |
| `evaluation` | `scripts/eval.ts`, `scripts/eval/*.ts`, `eval/perguntas.json` | `scripts/eval/*.test.ts` |

## Goals / Non-Goals

**Goals:**

- Cada requisito descreve comportamento observável (pelo parceiro, pela API, pelo banco ou por quem roda os scripts), com pelo menos um cenário verificável.
- Cada cenário tem um teste automatizado que o cobre ou é marcado como verificação manual na revisão (ver `tasks.md`).
- Os deltas passam no `openspec validate --strict`.

**Non-Goals:**

- Corrigir comportamento. As observações em "Risks / Trade-offs" viram changes próprias, se a pessoa quiser.
- Escrever specs de capacidades que não estão na proposta (smoke, CLI, base de conhecimento).

## Decisions

### 1. Sete capacidades com fronteiras pelo que o usuário percebe

As fronteiras seguem o fluxo de uma mensagem e quem observa cada parte: o que entra e sai (`guardrails`), o que é recuperado (`retrieval`), como a resposta é montada (`answer-generation`), o que a conversa lembra (`session-memory`), o contrato HTTP (`chat-api`), a tela (`chat-ui`) e a medição (`evaluation`).

Comportamentos que cruzam fronteiras ficaram assim:

| Comportamento | Onde ficou | Por quê |
|---|---|---|
| Retry e erros do provedor de LLM | `answer-generation` | Afeta o turno inteiro. O efeito HTTP (429, 503) está em `chat-api`. |
| Expiração de 7 dias | Regra em `session-memory`, rota e segredo em `chat-api` | A regra é sobre a vida da sessão; o mecanismo é uma rota. |
| Link de continuação | Identificador como credencial em `session-memory`; diálogo, `?sessao=` e `no-referrer` em `chat-ui` | O servidor só conhece o UUID; o link é coisa da página. |
| Entrada bloqueada não é gravada | `guardrails` | É a garantia de privacidade do bloqueio, não um detalhe da memória. |
| Presets de RAG | `retrieval` | Os presets definem o fatiamento e a busca. A reescrita é um campo do preset, mas o comportamento dela está em `session-memory`. |

Alternativa considerada: uma capacidade `assistant` única para o turno inteiro. Ficaria grande demais para receber deltas pequenos, e qualquer mudança de prompt tocaria o mesmo arquivo que uma mudança de memória.

Alternativa considerada: uma capacidade `llm-client` só para o retry. Seria uma spec de implementação, sem comportamento que o parceiro perceba além do que `answer-generation` e `chat-api` já descrevem.

### 2. Valores visíveis no texto, parâmetros de RAG pelo nome

- Limites que o usuário percebe ficam com o número: 1.000 caracteres, 60 caracteres por campo do perfil, 4.096 bytes, 10 por minuto e 100 por dia, 7 dias, 16 e 10 mensagens na memória, 6 mensagens e 300 caracteres na reescrita, 20 perguntas no eval e as metas.
- Os parâmetros calibráveis do RAG (`topK`, `minScore`, `alpha`, `candidateLimit`, tamanho e sobreposição do trecho) aparecem pelo nome, como "do preset ativo". Os valores ficam só em `src/config.ts`, como manda a regra 1 de IA e RAG do `AGENTS.md`.

Por quê: uma calibração muda o valor sem mudar o contrato ("descarta o que fica abaixo do `minScore`"), e duplicar os números na spec criaria duas fontes que divergem. Mudar a regra (por exemplo, trocar a soma ponderada por outra fórmula) continua exigindo um delta.

Alternativa considerada: escrever os valores do preset `padrao` na spec. Cada rodada de calibração viraria uma change só para atualizar números.

### 3. Textos fixos citados por extenso

As mensagens que o parceiro lê (fallback, bloqueios, erros da API, avisos da página) aparecem entre aspas, exatamente como no código. Elas são parte do contrato com o usuário e são o que os testes conferem. Trocar um texto passa a exigir um delta `MODIFIED`, o que é o comportamento desejado: a mudança de texto fica revisada.

### 4. Na divergência, vale o código

Onde as specs históricas S00 a S10 e o código discordam, os deltas descrevem o código, que é o que está em produção e passou na CI. A divergência encontrada fica registrada no relatório da apply e na descrição do PR, sem mudar o código.

### 5. Contratos

Esta change não cria nem altera tipos, assinaturas, rotas ou tabelas. O único contrato é o formato dos deltas do OpenSpec (`## Purpose`, `## ADDED Requirements`, `### Requirement:`, `#### Scenario:` com **WHEN** e **THEN**).

### 6. Arquivos que podem ser criados ou alterados

- `openspec/changes/baseline-living-specs/proposal.md`
- `openspec/changes/baseline-living-specs/design.md`
- `openspec/changes/baseline-living-specs/tasks.md`
- `openspec/changes/baseline-living-specs/specs/guardrails/spec.md`
- `openspec/changes/baseline-living-specs/specs/retrieval/spec.md`
- `openspec/changes/baseline-living-specs/specs/answer-generation/spec.md`
- `openspec/changes/baseline-living-specs/specs/session-memory/spec.md`
- `openspec/changes/baseline-living-specs/specs/chat-api/spec.md`
- `openspec/changes/baseline-living-specs/specs/chat-ui/spec.md`
- `openspec/changes/baseline-living-specs/specs/evaluation/spec.md`

Nada fora de `openspec/changes/baseline-living-specs/`. O archive, depois do merge, cria `openspec/specs/<capacidade>/spec.md` num PR próprio.

## Risks / Trade-offs

- [Um requisito descreve o que o código deveria fazer, não o que faz] → A apply confere cada cenário contra o código e o teste correspondente e corrige o delta, nunca o código.
- [Cenário sem teste automatizado, como os visuais da `chat-ui` e o RLS] → A apply lista esses cenários como verificação manual no relatório, para a pessoa decidir se cobre com teste numa change futura.
- [Spec detalhada demais engessa mudanças pequenas] → Os parâmetros calibráveis ficam pelo nome (decisão 2). Textos e limites visíveis ficam fixos de propósito.

Comportamentos atuais que a escrita revelou e que a spec registra como são, sem corrigir:

- Um número de 11 dígitos seguidos, como um celular com DDD sem espaço (`11987654321`), casa com o padrão de CPF e bloqueia a mensagem. Com espaço ou hífen (`11 98765-4321`), passa.
- A API aceita `profile: {}`, e isso apaga o perfil salvo da sessão. A interface nunca manda o perfil vazio (omite o campo), então o efeito só aparece em chamadas diretas à API.
- A janela diária do rate limit vira à meia-noite UTC (21h em Brasília).
- Quando o resumo falha numa sessão com mais de 16 mensagens pendentes, aquele turno vê só as 10 mais recentes e o resumo antigo. As mensagens entre os dois ficam fora do contexto até o próximo resumo dar certo.

## Migration Plan

1. Esta branch nasceu de `docs/land-skills-and-docs` (PR #25), porque precisa do `docs/` que só chega à `main` com ele. Depois do merge do #25, o orquestrador faz o rebase sobre a `main` e só então abre o PR desta change, com a base `main`. Sem PR empilhado.
2. Merge (squash) pela pessoa.
3. PR `docs(openspec): archive baseline-living-specs`, com o `/opsx:archive`, que cria as sete specs em `openspec/specs/`.
4. Rollback: reverter o PR de archive apaga as specs vivas. Nenhum código depende delas.
