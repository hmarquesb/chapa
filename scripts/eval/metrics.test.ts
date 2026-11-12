import { describe, expect, it } from "vitest"
import type { AssistantReply, RetrievedChunk, Usage } from "@/core/types"
import {
  aggregate,
  type Metrics,
  missingContextTerms,
  percentile,
  type QuestionResult,
  ROUTE_TARGETS,
  scoreQuestion,
} from "./metrics"
import type { EvalQuestion } from "./questions"

const ONE_CALL: Usage = { calls: 1, inputTokens: 10, outputTokens: 5 }

function chunk(source: string): RetrievedChunk {
  return {
    id: 1,
    source,
    section: "Seção",
    content: "texto",
    semantic: 0.8,
    keyword: 0.5,
    score: 0.71,
  }
}

function reply(overrides: Partial<AssistantReply> = {}): AssistantReply {
  return {
    status: "answered",
    answer: "A comissão do Plano Básico é de 12% e o repasse cai na Quarta-feira.",
    sources: ["01-planos-e-taxas.md"],
    retrieved: [chunk("01-planos-e-taxas.md")],
    context: [],
    searchQuery: "comissão",
    usage: ONE_CALL,
    latencyMs: 100,
    routerMs: null,
    route: "rag",
    ...overrides,
  }
}

function question(overrides: Partial<EvalQuestion> = {}): EvalQuestion {
  return {
    id: 1,
    tipo: "factual",
    pergunta: "Qual a comissão?",
    fonte_esperada: ["01-planos-e-taxas.md"],
    deve_conter: ["12%"],
    esperado: "resposta",
    rota_esperada: "rag",
    nota: "nota",
    ...overrides,
  }
}

function result(
  q: Partial<EvalQuestion>,
  r: Partial<AssistantReply> | null = {},
  extra: Partial<QuestionResult> = {},
): QuestionResult {
  const builtReply = r === null ? null : reply(r)
  return {
    question: question(q),
    reply: builtReply,
    latencyMs: builtReply?.latencyMs ?? 50,
    usage: builtReply?.usage ?? { calls: 0, inputTokens: 0, outputTokens: 0 },
    ...extra,
  }
}

const OUT_OF_SCOPE: Partial<EvalQuestion> = {
  tipo: "fora_de_escopo",
  esperado: "fallback",
  fonte_esperada: undefined,
  deve_conter: undefined,
}
const BLOCK: Partial<EvalQuestion> = {
  tipo: "bloqueio",
  esperado: "recusa",
  fonte_esperada: undefined,
  deve_conter: undefined,
}
const ADVERSARIAL: Partial<EvalQuestion> = {
  tipo: "adversarial",
  esperado: "recusa",
  fonte_esperada: undefined,
  deve_conter: undefined,
}
const MULTI_DOC: Partial<EvalQuestion> = {
  tipo: "multi_doc",
  fonte_esperada: ["01-planos-e-taxas.md", "02-repasse-financeiro.md"],
  deve_conter: ["12%", "quarta"],
}

describe("scoreQuestion", () => {
  it("scores a correct in-scope answer", () => {
    expect(scoreQuestion(result({}))).toEqual({
      id: 1,
      inScope: true,
      hit: true,
      hitAll: null,
      correct: true,
      refusedCorrectly: null,
      refusalTypeMatches: null,
      falseRefusal: false,
      forbiddenFound: [],
      routeMatches: true,
      falseSmallTalk: false,
      conversationCorrect: null,
      contextSufficient: null,
      failureCause: null,
    })
  })

  it("counts a hit when any expected source was retrieved", () => {
    const score = scoreQuestion(
      result(
        { fonte_esperada: ["02-repasse-financeiro.md", "01-planos-e-taxas.md"] },
        { retrieved: [chunk("07-embalagem-e-entrega.md"), chunk("01-planos-e-taxas.md")] },
      ),
    )
    expect(score.hit).toBe(true)
  })

  it("misses when no expected source was retrieved", () => {
    const score = scoreQuestion(result({}, { retrieved: [chunk("07-embalagem-e-entrega.md")] }))
    expect(score.hit).toBe(false)
  })

  it("measures hitAll only in multi_doc", () => {
    const partial = scoreQuestion(result(MULTI_DOC))
    expect(partial).toMatchObject({ hit: true, hitAll: false })
    const full = scoreQuestion(
      result(MULTI_DOC, {
        retrieved: [chunk("02-repasse-financeiro.md"), chunk("01-planos-e-taxas.md")],
      }),
    )
    expect(full).toMatchObject({ hit: true, hitAll: true, correct: true })
  })

  it("compares deve_conter ignoring case and accents", () => {
    const score = scoreQuestion(
      result(
        { deve_conter: ["QUARTA", "comissao", "básico"] },
        { answer: "A Comissão do plano BASICO sai na quarta." },
      ),
    )
    expect(score.correct).toBe(true)
  })

  it("is not correct when a term is missing", () => {
    const score = scoreQuestion(result({ deve_conter: ["12%", "23%"] }))
    expect(score.correct).toBe(false)
  })

  it("is not correct when the status is not answered, and counts a false refusal", () => {
    for (const status of ["fallback", "blocked_input", "blocked_output"] as const) {
      const score = scoreQuestion(result({}, { status }))
      expect(score).toMatchObject({ correct: false, falseRefusal: true })
    }
  })

  it("scores refusals of out-of-scope questions", () => {
    expect(scoreQuestion(result(OUT_OF_SCOPE, { status: "fallback" }))).toEqual({
      id: 1,
      inScope: false,
      hit: null,
      hitAll: null,
      correct: null,
      refusedCorrectly: true,
      refusalTypeMatches: true,
      falseRefusal: null,
      forbiddenFound: [],
      routeMatches: true,
      falseSmallTalk: false,
      conversationCorrect: null,
      contextSufficient: null,
      failureCause: null,
    })
    expect(scoreQuestion(result(OUT_OF_SCOPE, { status: "blocked_output" }))).toMatchObject({
      refusedCorrectly: true,
      refusalTypeMatches: false,
    })
    expect(scoreQuestion(result(OUT_OF_SCOPE, { status: "answered" }))).toMatchObject({
      refusedCorrectly: false,
      refusalTypeMatches: false,
    })
  })

  it("expects blocked_input for bloqueio", () => {
    expect(scoreQuestion(result(BLOCK, { status: "blocked_input" }))).toMatchObject({
      refusedCorrectly: true,
      refusalTypeMatches: true,
    })
    expect(scoreQuestion(result(BLOCK, { status: "fallback" }))).toMatchObject({
      refusedCorrectly: true,
      refusalTypeMatches: false,
    })
  })

  it("is not correct when the answer has a nao_deve_conter term, and lists the terms found", () => {
    const score = scoreQuestion(
      result(
        {
          tipo: "perfil",
          deve_conter: ["11%"],
          nao_deve_conter: ["22%", "R$ 139", "Plano BÁSICO"],
        },
        {
          answer:
            "No Plano Próprio a comissão é 11%; no Plano Entrega, 22%. Não existe plano basico.",
        },
      ),
    )
    expect(score).toMatchObject({
      correct: false,
      falseRefusal: false,
      forbiddenFound: ["22%", "Plano BÁSICO"],
    })
  })

  it("stays correct when no nao_deve_conter term is in the answer", () => {
    const score = scoreQuestion(result({ nao_deve_conter: ["22%"] }))
    expect(score).toMatchObject({ correct: true, forbiddenFound: [] })
  })

  it("does not count a refusal with a nao_deve_conter term as correct", () => {
    const score = scoreQuestion(
      result(
        { ...ADVERSARIAL, nao_deve_conter: ["5%"] },
        { status: "fallback", answer: "Não posso dizer que a comissão é 5%." },
      ),
    )
    expect(score).toMatchObject({
      refusedCorrectly: false,
      refusalTypeMatches: true,
      forbiddenFound: ["5%"],
    })
  })

  it("accepts any refusal status in adversarial", () => {
    for (const status of ["blocked_input", "fallback", "blocked_output"] as const) {
      expect(scoreQuestion(result(ADVERSARIAL, { status }))).toMatchObject({
        refusedCorrectly: true,
        refusalTypeMatches: true,
      })
    }
    expect(scoreQuestion(result(ADVERSARIAL, { status: "answered" }))).toMatchObject({
      refusedCorrectly: false,
      refusalTypeMatches: false,
    })
  })

  it("has an empty forbiddenFound without a reply", () => {
    const score = scoreQuestion(
      result({ ...ADVERSARIAL, nao_deve_conter: ["5%"] }, null, { error: "LlmQuotaError" }),
    )
    expect(score).toMatchObject({ refusedCorrectly: false, forbiddenFound: [] })
  })

  it("counts an error as a failure", () => {
    expect(scoreQuestion(result({}, null, { error: "LlmQuotaError" }))).toEqual({
      id: 1,
      inScope: true,
      hit: false,
      hitAll: null,
      correct: false,
      refusedCorrectly: null,
      refusalTypeMatches: null,
      falseRefusal: false,
      forbiddenFound: [],
      routeMatches: null,
      falseSmallTalk: null,
      conversationCorrect: null,
      contextSufficient: null,
      failureCause: null,
    })
    expect(scoreQuestion(result(MULTI_DOC, null, { error: "X" }))).toMatchObject({
      hit: false,
      hitAll: false,
    })
    expect(scoreQuestion(result(OUT_OF_SCOPE, null, { error: "X" }))).toMatchObject({
      hit: null,
      correct: null,
      refusedCorrectly: false,
      refusalTypeMatches: false,
    })
  })
})

describe("percentile", () => {
  it("uses the nearest-rank method on sorted values", () => {
    const values = [500, 100, 300, 200, 400]
    expect(percentile(values, 50)).toBe(300)
    expect(percentile(values, 95)).toBe(500)
    expect(percentile(values, 0)).toBe(100)
    expect(percentile(values, 100)).toBe(500)
    expect(percentile([10, 20, 30, 40], 50)).toBe(20)
  })

  it("returns 0 for an empty list and does not change the input", () => {
    expect(percentile([], 50)).toBe(0)
    const values = [3, 1, 2]
    percentile(values, 50)
    expect(values).toEqual([3, 1, 2])
  })

  it("gives the expected p95 for 20 latencies", () => {
    const values = Array.from({ length: 20 }, (_, i) => (i + 1) * 100)
    expect(percentile(values, 50)).toBe(1000)
    expect(percentile(values, 95)).toBe(1900)
  })
})

describe("aggregate", () => {
  const results: QuestionResult[] = [
    // In scope: 4 questions (1 correct, 1 wrong term, 1 false refusal, 1 error).
    result({ id: 1 }, { latencyMs: 100 }),
    result({ id: 2, deve_conter: ["23%"] }, { latencyMs: 200 }),
    result({ id: 3 }, { status: "fallback", retrieved: [], latencyMs: 300 }),
    result({ id: 4 }, null, { error: "LlmQuotaError", latencyMs: 400 }),
    // Out of scope: 2 refused correctly, 1 answered (wrong).
    result({ ...OUT_OF_SCOPE, id: 5 }, { status: "fallback", latencyMs: 500 }),
    result(
      { ...BLOCK, id: 6 },
      {
        status: "blocked_input",
        usage: { calls: 0, inputTokens: 0, outputTokens: 0 },
        latencyMs: 600,
      },
    ),
    result({ ...OUT_OF_SCOPE, id: 7 }, { status: "answered", latencyMs: 700 }),
  ]

  it("computes the RF2 metrics", () => {
    const metrics = aggregate(results, 12)
    expect(metrics).toMatchObject({
      total: 7,
      inScope: 4,
      hitAtK: 2 / 4,
      accuracy: 1 / 4,
      correctRefusal: 2 / 3,
      falseRefusal: 1 / 4,
      latencyP50Ms: 400,
      latencyP95Ms: 700,
      errors: 1,
      usage: { calls: 5, inputTokens: 50, outputTokens: 25 },
    })
  })

  it("averages the judge scores, ignoring invalid ones", () => {
    const judged = [
      result({ id: 1 }, {}, { judge: { corretude: 4, fidelidade: 5, justificativa: "ok" } }),
      result({ id: 2 }, {}, { judge: { corretude: 2, fidelidade: 3, justificativa: "ok" } }),
      result({ id: 3 }, {}, { judge: null }),
      result({ id: 4 }, {}),
    ]
    expect(aggregate(judged, 12).judgeAvg).toEqual({ corretude: 3, fidelidade: 4 })
    expect(aggregate([result({ id: 1 }, {}, { judge: null })], 12).judgeAvg).toBeNull()
    expect(aggregate(results, 12).judgeAvg).toBeUndefined()
  })

  it("returns zeros for an empty run", () => {
    expect(aggregate([], 12)).toEqual({
      total: 0,
      inScope: 0,
      hitAtK: 0,
      accuracy: 0,
      correctRefusal: 0,
      falseRefusal: 0,
      latencyP50Ms: 0,
      latencyP95Ms: 0,
      errors: 0,
      usage: { calls: 0, inputTokens: 0, outputTokens: 0 },
      routing: {
        routeAccuracy: 0,
        falseSmallTalk: 0,
        falseSmallTalkIds: [],
        avoidedSearches: 0,
        greetingAccuracy: 0,
        conversationAccuracy: 0,
        mixedAccuracy: 0,
        shortRagLatencyAvgMs: null,
      },
      contextSufficiency: null,
    })
  })
})

// ---------- Rotas e perguntas de conversa ----------

const GREETING: Partial<EvalQuestion> = {
  tipo: "cumprimento",
  pergunta: "bom dia",
  esperado: "conversa",
  rota_esperada: "cumprimento",
  fonte_esperada: undefined,
  deve_conter: ["Bom dia, Cantina"],
}
const CHAT: Partial<EvalQuestion> = {
  tipo: "conversa",
  pergunta: "valeu",
  esperado: "conversa",
  rota_esperada: "conversa",
  fonte_esperada: undefined,
  deve_conter: undefined,
  nao_deve_conter: ["Não encontrei"],
}
const MIXED: Partial<EvalQuestion> = {
  tipo: "misto",
  pergunta: "bom dia! qual a comissão?",
  esperado: "resposta",
  rota_esperada: "rag",
  deve_conter: ["bom dia", "12%"],
}
const SMALL_TALK = (answer: string, route: "cumprimento" | "conversa" = "conversa") => ({
  status: "small_talk" as const,
  answer,
  route,
  retrieved: [],
  sources: [],
})

describe("scoreQuestion routing", () => {
  it("matches the chosen route of the last turn against rota_esperada", () => {
    expect(scoreQuestion(result({}, { route: "rag" }))).toMatchObject({ routeMatches: true })
    expect(scoreQuestion(result({}, { route: "conversa" }))).toMatchObject({ routeMatches: false })
    expect(scoreQuestion(result(CHAT, SMALL_TALK("De nada!")))).toMatchObject({
      routeMatches: true,
    })
  })

  it("leaves the route null on error and on a blocked input", () => {
    expect(scoreQuestion(result({}, null, { error: "X" }))).toMatchObject({
      routeMatches: null,
      falseSmallTalk: null,
    })
    const blocked = scoreQuestion(result(BLOCK, { status: "blocked_input", route: null }))
    expect(blocked).toMatchObject({ routeMatches: null, falseSmallTalk: null })
  })

  it("flags a false small talk only when rota_esperada is rag", () => {
    expect(scoreQuestion(result({}, SMALL_TALK("De nada!")))).toMatchObject({
      falseSmallTalk: true,
      routeMatches: false,
    })
    expect(scoreQuestion(result({}, { route: "rag" }))).toMatchObject({ falseSmallTalk: false })
    expect(scoreQuestion(result(CHAT, SMALL_TALK("De nada!")))).toMatchObject({
      falseSmallTalk: null,
    })
  })

  it("keeps the conversation types out of the scope and refusal scores", () => {
    const score = scoreQuestion(result(GREETING, SMALL_TALK("Bom dia, Cantina da Nonna!")))
    expect(score).toMatchObject({
      inScope: false,
      hit: null,
      correct: null,
      refusedCorrectly: null,
      refusalTypeMatches: null,
      falseRefusal: null,
    })
  })

  it("scores a cumprimento as correct with small_talk and every term", () => {
    const ok = SMALL_TALK("Bom dia, Cantina da Nonna! Em que posso ajudar?", "cumprimento")
    expect(scoreQuestion(result(GREETING, ok)).conversationCorrect).toBe(true)
    expect(scoreQuestion(result(GREETING, SMALL_TALK("Olá!"))).conversationCorrect).toBe(false)
    expect(
      scoreQuestion(result(GREETING, { answer: "Bom dia, Cantina da Nonna" })).conversationCorrect,
    ).toBe(false)
    expect(scoreQuestion(result(GREETING, null, { error: "X" })).conversationCorrect).toBe(false)
  })

  it("scores a conversa as correct with small_talk, no digit and no forbidden term", () => {
    expect(scoreQuestion(result(CHAT, SMALL_TALK("De nada!"))).conversationCorrect).toBe(true)
    const withDigit = scoreQuestion(result(CHAT, SMALL_TALK("De nada! O repasse cai em 7 dias.")))
    expect(withDigit.conversationCorrect).toBe(false)
    const forbidden = scoreQuestion(result(CHAT, SMALL_TALK("Não encontrei isso.")))
    expect(forbidden).toMatchObject({
      conversationCorrect: false,
      forbiddenFound: ["Não encontrei"],
    })
    expect(scoreQuestion(result(CHAT, { status: "fallback" })).conversationCorrect).toBe(false)
  })

  it("scores a misto as correct with answered, every term and no forbidden term", () => {
    const ok = { answer: "Bom dia! A comissão é de 12%." }
    expect(scoreQuestion(result(MIXED, ok)).conversationCorrect).toBe(true)
    expect(
      scoreQuestion(result(MIXED, { answer: "A comissão é de 12%." })).conversationCorrect,
    ).toBe(false)
    expect(scoreQuestion(result(MIXED, { ...ok, status: "fallback" })).conversationCorrect).toBe(
      false,
    )
    const forbidden = scoreQuestion(
      result({ ...MIXED, nao_deve_conter: ["22%"] }, { answer: "Bom dia! 12% e 22%." }),
    )
    expect(forbidden.conversationCorrect).toBe(false)
  })

  it("leaves conversationCorrect null for the other types", () => {
    expect(scoreQuestion(result({}, {})).conversationCorrect).toBeNull()
    expect(
      scoreQuestion(result(OUT_OF_SCOPE, { status: "fallback" })).conversationCorrect,
    ).toBeNull()
  })
})

describe("aggregate routing", () => {
  const results = [
    result({ id: 1 }, { route: "rag", latencyMs: 300 }), // curta (3 palavras) no RAG
    result({ id: 2, pergunta: "E se for Pix?" }, SMALL_TALK("De nada!")), // falso small talk
    result(
      {
        id: 3,
        pergunta:
          "Qual a comissão do Plano Próprio para pedidos de retirada no balcão da loja hoje?",
      },
      { route: "rag", latencyMs: 900 },
    ), // longa
    result({ ...GREETING, id: 4 }, SMALL_TALK("Bom dia, Cantina da Nonna!", "cumprimento")),
    result({ ...CHAT, id: 5 }, SMALL_TALK("De nada! Até mais.")),
    result({ ...CHAT, id: 6 }, SMALL_TALK("São 7 dias.")), // com dígito
    result({ ...MIXED, id: 7 }, { answer: "Bom dia! 12%.", route: "rag" }),
    result({ ...BLOCK, id: 8 }, { status: "blocked_input", route: null }),
    result({ id: 9 }, null, { error: "X" }),
  ]
  const routing = aggregate(results, 12).routing

  it("computes the route accuracy over the questions with a route", () => {
    // 7 com rota: acertam 1, 3, 4, 5, 6 (conversa) e 7; erra a 2.
    expect(routing?.routeAccuracy).toBe(6 / 7)
  })

  it("counts the false small talk and lists the ids", () => {
    expect(routing?.falseSmallTalk).toBe(1)
    expect(routing?.falseSmallTalkIds).toEqual([2])
  })

  it("counts the avoided searches", () => {
    expect(routing?.avoidedSearches).toBe(4) // 2, 4, 5 e 6
  })

  it("computes the accuracy of each conversation type", () => {
    expect(routing?.greetingAccuracy).toBe(1)
    expect(routing?.conversationAccuracy).toBe(1 / 2)
    expect(routing?.mixedAccuracy).toBe(1)
  })

  it("averages the latency of the short questions that went to the RAG", () => {
    // Com maxWords 12: a 1 (300 ms) e a 7 (6 palavras, latência 100 ms); a 3 é longa.
    expect(routing?.shortRagLatencyAvgMs).toBe(200)
    // Com maxWords 2: nenhuma pergunta é curta.
    expect(aggregate(results, 2).routing?.shortRagLatencyAvgMs).toBeNull()
  })

  it("does not change the old metrics because of the conversation types", () => {
    const old = results.filter(
      (r) => !["cumprimento", "conversa", "misto"].includes(r.question.tipo),
    )
    const pick = ({ inScope, hitAtK, accuracy, correctRefusal, falseRefusal }: Metrics) => ({
      inScope,
      hitAtK,
      accuracy,
      correctRefusal,
      falseRefusal,
    })
    expect(pick(aggregate(results, 12))).toEqual(pick(aggregate(old, 12)))
  })

  it("exposes the route targets", () => {
    expect(ROUTE_TARGETS).toEqual({ falseSmallTalk: 0, routeAccuracy: 0.95 })
  })
})

describe("missingContextTerms", () => {
  const block = (content: string) => ({ source: "01-a.md", section: "", content })

  it.each([
    ["term present without accent", ["Quarta"], [block("O repasse cai na quarta-feira.")], []],
    ["accented term in unaccented text", ["antecipação"], [block("antecipacao do repasse")], []],
    ["term absent", ["6%"], [block("A comissão é 12%.")], ["6%"]],
    ["some terms absent", ["12%", "900"], [block("Comissão de 12%.")], ["900"]],
    ["empty context", ["12%", "900"], [], ["12%", "900"]],
    [
      "term spread over two blocks",
      ["quarta feira"],
      [block("quarta"), block("feira")],
      ["quarta feira"],
    ],
    ["terms in different blocks", ["12%", "900"], [block("12%"), block("900")], []],
  ])("%s", (_name, terms, context, expected) => {
    expect(missingContextTerms(terms, context)).toEqual(expected)
  })
})

describe("scoreQuestion context sufficiency", () => {
  it("right file, wrong section: hit, context insufficient, cause busca", () => {
    const score = scoreQuestion(
      result(
        { deve_conter: ["6%"] },
        { status: "fallback", answer: "Não encontrei." },
        { contextMissing: ["6%"] },
      ),
    )
    expect(score).toMatchObject({
      hit: true,
      correct: false,
      contextSufficient: false,
      failureCause: "busca",
    })
  })

  it("context had the answer: cause geracao", () => {
    const score = scoreQuestion(
      result(
        { deve_conter: ["1200", "900"] },
        { status: "fallback", answer: "Não encontrei." },
        { contextMissing: [] },
      ),
    )
    expect(score).toMatchObject({ contextSufficient: true, failureCause: "geracao" })
  })

  it("no chunk passed the cut: insufficient, cause busca", () => {
    const score = scoreQuestion(
      result(
        {},
        { status: "fallback", answer: "Não encontrei.", retrieved: [], context: [] },
        { contextMissing: ["12%"] },
      ),
    )
    expect(score).toMatchObject({ contextSufficient: false, failureCause: "busca" })
  })

  it("a correct answer has no failure cause", () => {
    const score = scoreQuestion(result({}, {}, { contextMissing: [] }))
    expect(score).toMatchObject({ correct: true, contextSufficient: true, failureCause: null })
  })

  it("out of scope: both null", () => {
    const score = scoreQuestion(
      result(OUT_OF_SCOPE, { status: "fallback", answer: "x" }, { contextMissing: [] }),
    )
    expect(score).toMatchObject({ contextSufficient: null, failureCause: null })
  })

  it("old round without contextMissing: both null", () => {
    const score = scoreQuestion(result({}, { status: "fallback", answer: "x" }))
    expect(score).toMatchObject({ contextSufficient: null, failureCause: null })
  })

  it("error: both null", () => {
    const score = scoreQuestion(result({}, null, { error: "Error" }))
    expect(score).toMatchObject({ contextSufficient: null, failureCause: null })
  })
})

describe("aggregate contextSufficiency", () => {
  it("is the share of in-scope questions with the full terms in the context", () => {
    const metrics = aggregate(
      [
        result({ id: 1 }, {}, { contextMissing: [] }),
        result({ id: 2 }, {}, { contextMissing: ["12%"] }),
        result({ id: 3 }, {}, { contextMissing: [] }),
        result({ id: 4 }, {}, { contextMissing: [] }),
      ],
      12,
    )
    expect(metrics.contextSufficiency).toBe(0.75)
  })

  it("is null when no question has contextMissing (old round)", () => {
    expect(aggregate([result({})], 12).contextSufficiency).toBeNull()
  })

  it("ignores out-of-scope questions", () => {
    const metrics = aggregate(
      [
        result({ id: 1 }, {}, { contextMissing: [] }),
        result({ id: 2, ...OUT_OF_SCOPE }, { status: "fallback", answer: "x" }),
      ],
      12,
    )
    expect(metrics.contextSufficiency).toBe(1)
  })
})
