# Design

## Context

- `scripts/eval/questions.ts` define `EvalQuestionType`, `QUESTION_DISTRIBUTION`, `IN_SCOPE_TYPES`, `EXPECTED_BY_TYPE` e a validação. `metrics.ts` pontua cada pergunta (`scoreQuestion`) e agrega (`aggregate`); hoje tudo o que não é do escopo conta como recusa. `report.ts` gera o `.md`, `compare.ts` a tabela, `append.ts` a junção em blocos.
- O arquivo da rodada guarda `config: { models, rag }`, e o `--append` compara essa configuração.
- Depois das changes 1 e 2, `AssistantReply` tem `route: "cumprimento" | "conversa" | "rag" | null`, `routerMs`, e o `AppConfig` tem `router: { enabled, maxWords }`. `countWords` está em `src/core/router/conversation.ts`.

## Goals / Non-Goals

**Goals:** as métricas novas são funções puras testadas com resultados fictícios; uma rodada antiga (`v3.json`) continua legível pelo `--compare`; a `v4` é comparável com a `v3` nas métricas de antes.

**Non-Goals:** mudar a pontuação das 50 perguntas antigas; métricas por bloco de rodada.

## Decisions

### 1. Contratos

```ts
// scripts/eval/questions.ts
export type EvalQuestionType = /* atuais */ | "cumprimento" | "conversa" | "misto"
export type ExpectedRoute = "cumprimento" | "conversa" | "rag"
export type EvalQuestion = {
  // ...campos atuais
  rota_esperada: ExpectedRoute
  esperado: "resposta" | "fallback" | "recusa" | "conversa"
}
export const CONVERSATION_TYPES: ReadonlySet<EvalQuestionType>   // cumprimento, conversa, misto
// QUESTION_DISTRIBUTION ganha cumprimento: 4, conversa: 4, misto: 4

// scripts/eval/metrics.ts
export type QuestionScore = {
  // ...campos atuais (null nos tipos de conversa)
  routeMatches: boolean | null        // null: erro ou entrada bloqueada
  falseSmallTalk: boolean | null      // só com rota_esperada "rag"
  conversationCorrect: boolean | null // só nos tipos de conversa
}
export type RouteMetrics = {
  routeAccuracy: number          // 0 a 1, sobre as perguntas com routeMatches !== null
  falseSmallTalk: number         // contagem
  falseSmallTalkIds: number[]
  avoidedSearches: number        // perguntas que terminaram em rota cumprimento ou conversa
  greetingAccuracy: number       // cumprimento
  conversationAccuracy: number   // conversa
  mixedAccuracy: number          // misto
  shortRagLatencyAvgMs: number | null  // null se nenhuma
}
export type Metrics = { /* atuais */ routing?: RouteMetrics }   // opcional: rodadas antigas não têm
export const ROUTE_TARGETS = { falseSmallTalk: 0, routeAccuracy: 0.95 } as const

// scripts/eval/report.ts — EvalRun.config ganha:
router?: { enabled: boolean; maxWords: number }   // opcional: rodadas antigas não têm
```

- `routing` e `config.router` são opcionais só no tipo do arquivo lido; toda rodada nova grava os dois. O `--compare` mostra "—" quando faltam.
- A `rota_esperada` é obrigatória no JSON, mesmo sendo dedutível do tipo: a pergunta fica autoexplicativa no arquivo e no relatório, e a validação pega a incoerência.

### 2. Pontuação

- `IN_SCOPE_TYPES` não muda. A recusa passa a ser "nem do escopo nem de conversa" (`fora_de_escopo`, `adversarial`, `bloqueio`), para as métricas antigas continuarem sobre 36 + 14.
- Rota escolhida = `reply.route` do **último turno** (o mesmo que já é avaliado no multi-turno). Com `reply === null` (erro) ou `route === null` (bloqueio), `routeMatches` e `falseSmallTalk` ficam `null`.
- "Curta" = `countWords(última mensagem) <= config.router.maxWords`, com o `maxWords` da rodada (12 também quando o roteador está desligado, para a `v4-regras` medir o mesmo grupo). Por isso o `aggregate` passa a receber o `maxWords`.
- "Sem dígito" no acerto de `conversa` usa `/\d/` sobre a resposta, a mesma regra do roteador.
- O termo de cumprimento nas mistas vai no `deve_conter` ("bom dia"); termos com número continuam conferidos contra o `regras.yaml` pelo teste existente.

### 3. Flag `--router`

- `--router on|off`; sem a flag, `on` no `padrao` e `off` no `baseline`. O `buildConfig` monta `router: { ...config.router, enabled }`. O terminal mostra "Roteador: ligado (até 12 palavras)" ou "desligado (só a regra de cumprimento)".
- O `loadPreviousRun` passa a comparar também o `router`. Uma rodada gravada sem `router` só aceita `--append` de uma rodada que também não tenha (na prática, nenhuma nova), e a mensagem de erro é a de hoje.

### 4. Relatório e comparação

- `report.ts`: seção "Rotas" depois das metas atuais, com as métricas de rota contra as metas, a lista de falso small talk e uma coluna "Rota" (esperada → escolhida) na tabela por pergunta. As falhas das perguntas de conversa entram no detalhe de falhas, com o motivo (status, termo faltando, dígito).
- `compare.ts`: linhas "Acerto de rota", "Falso small talk", "Chamadas evitadas", "Acerto conversa / mistas" e "Latência curtas → RAG", e a linha de configuração "Roteador" quando muda.

### 5. As 12 perguntas (ids 151 a 162)

| Id | Tipo | Mensagem | Perfil | `deve_conter` / `nao_deve_conter` |
|---|---|---|---|---|
| 151 | cumprimento | "bom dia" | `name` "Cantina da Nonna" | "Bom dia, Cantina da Nonna", "Em que posso ajudar" |
| 152 | cumprimento | "oi, tudo bem?" | `name` "Pizzaria Bella" | "Olá, Pizzaria Bella", "Tudo certo por aqui" |
| 153 | cumprimento | "boa noite chapa" | `name` "Sushi do Porto" | "Boa noite, Sushi do Porto" |
| 154 | cumprimento | "Boa tarde!" | `name` "Marmitaria Boa Panela" | "Boa tarde, Marmitaria Boa Panela" |
| 155 | conversa | "obrigada, ajudou muito" | — | `nao_deve_conter`: texto do fallback |
| 156 | conversa | "valeu, era só isso" | — | idem |
| 157 | conversa | "o que você sabe fazer?" | — | idem |
| 158 | conversa | "tchau, até amanhã" | — | idem |
| 159 | misto | "bom dia! quanto é a comissão no Plano Próprio?" | — | "bom dia", "11%" |
| 160 | misto | "Boa tarde, em que dia cai o repasse?" | — | "boa tarde", "quarta" |
| 161 | misto | "oi! qual a taxa do Pix no pagamento online?" | — | "1,5%" (ou o formato do `regras.yaml`) |
| 162 | misto | "boa noite, até quantos dias posso contestar um cancelamento?" | — | "boa noite", "7 dias" |

- O perfil das `cumprimento` é `{ "version": 2, "name": <nome> }`, o formato v2 que a validação exige.
- As `fonte_esperada` das mistas são as das factuais equivalentes (101 a 103 e a do Pix). Os nomes de restaurante são fictícios. O implementador ajusta o formato dos números ao que o teste do `regras.yaml` aceita, sem trocar a pergunta.
- **Por que conversa sem `multi_turno`:** o falso small talk em continuação já é medido pelos 5 `multi_turno` existentes, que agora têm `rota_esperada: "rag"`.

### 6. Documentação e resultados

- `docs/business.md`, "Metas de qualidade": as duas metas de rota (dona das metas).
- `docs/qa.md`, "Avaliação": 62 perguntas (ids 101 a 162), os tipos novos e a `rota_esperada`, a flag `--router`, e os comandos das rodadas `v4`, `v4-regras` e `v4-baseline` em blocos (o bloco 151 a 162 é o novo). A `v4` vira a linha de base.
- `README.md`: "Fluxo de uma requisição" com a regra de cumprimento e o roteador (ADR 0025); "Avaliação" com a tabela de 62 perguntas, as métricas de rota e a coluna `v4`; "Experimentos e aprendizados" com a leitura `v4` × `v4-regras` × `v4-baseline`; "Resumo executivo" se os números de lá mudarem.
- `eval/resultados/COMPARACAO.md`: seção nova com a comparação `v3` × `v4` × `v4-regras` × `v4-baseline` e, se as metas de rota não forem atingidas, a explicação.

### Arquivos que a change pode criar ou alterar

- Alterados: `scripts/eval/questions.ts`, `questions.test.ts`, `questions-rules.test.ts`, `metrics.ts`, `metrics.test.ts`, `report.ts`, `report.test.ts`, `compare.ts`, `compare.test.ts`, `append.ts`, `append.test.ts`, `scripts/eval.ts`, `eval/perguntas.json`, `eval/resultados/COMPARACAO.md`, `docs/business.md`, `docs/qa.md` e `README.md`.
- Novos: `eval/resultados/v4.json`, `v4.md`, `v4-regras.json`, `v4-regras.md`, `v4-baseline.json` e `v4-baseline.md` (gerados pelas rodadas).

## Risks / Trade-offs

- [Cota do plano gratuito com três rodadas de 62] → blocos de 10 com `--delay-ms`; o bloco 151 a 162 gasta pouco (cumprimentos não chamam modelo). As três rodadas podem ocupar mais de um dia.
- [12 perguntas de conversa dão pouca amostra] → o falso small talk, que é o risco principal, é medido nas 50 perguntas `rag`, não só nas novas.
- [Ruído entre rodadas na latência] → a "latência extra" é lida como ordem de grandeza no `COMPARACAO.md`, não como número exato.

## Migration Plan

Sem banco nem deploy. As rodadas antigas continuam legíveis. Rollback: reverter o PR; os arquivos `v4*` ficam como histórico.
