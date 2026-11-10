import { describe, expect, it } from "vitest"
import type { AssistantReply, RetrievedChunk, Usage } from "@/core/types"
import { aggregate, percentile, type QuestionResult, scoreQuestion } from "./metrics"
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
    searchQuery: "comissão",
    usage: ONE_CALL,
    latencyMs: 100,
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
    const metrics = aggregate(results)
    expect(metrics).toEqual({
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
    expect(aggregate(judged).judgeAvg).toEqual({ corretude: 3, fidelidade: 4 })
    expect(aggregate([result({ id: 1 }, {}, { judge: null })]).judgeAvg).toBeNull()
    expect(aggregate(results).judgeAvg).toBeUndefined()
  })

  it("returns zeros for an empty run", () => {
    expect(aggregate([])).toEqual({
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
    })
  })
})
