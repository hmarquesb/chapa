import { describe, expect, it } from "vitest"
import { RAG_PRESETS } from "@/config"
import type { AssistantReply } from "@/core/types"
import { mergeRuns, parseStoredRun, sameRunConfig } from "./append"
import { aggregate, type QuestionResult, scoreQuestion } from "./metrics"
import type { EvalQuestion } from "./questions"
import type { EvalRun } from "./report"

const MODELS = {
  chat: "modelo-chat",
  fast: "modelo-rapido",
  embedding: "modelo-embedding",
  embeddingDimensions: 768,
}

function question(id: number, overrides: Partial<EvalQuestion> = {}): EvalQuestion {
  return {
    id,
    tipo: "factual",
    pergunta: `Pergunta ${id}?`,
    fonte_esperada: ["01-planos-e-taxas.md"],
    deve_conter: ["11%"],
    esperado: "resposta",
    rota_esperada: "rag",
    nota: "nota",
    ...overrides,
  }
}

function reply(answer: string): AssistantReply {
  return {
    status: "answered",
    answer,
    sources: ["01-planos-e-taxas.md"],
    retrieved: [],
    context: [],
    searchQuery: "busca",
    usage: { calls: 1, inputTokens: 10, outputTokens: 5 },
    latencyMs: 100,
    routerMs: null,
    route: "rag",
  }
}

function resultFor(q: EvalQuestion, answer = "É 11%."): QuestionResult {
  const r = reply(answer)
  return { question: q, reply: r, latencyMs: r.latencyMs, usage: r.usage }
}

function run(results: QuestionResult[], overrides: Partial<EvalRun> = {}): EvalRun {
  return {
    label: "v3",
    preset: "padrao",
    date: "2026-11-10T10:00:00.000Z",
    commit: "aaa1111",
    config: {
      models: { ...MODELS },
      rag: { ...RAG_PRESETS.padrao },
      router: { enabled: true, maxWords: 12 },
    },
    results,
    scores: results.map(scoreQuestion),
    metrics: aggregate(results, 12),
    ...overrides,
  }
}

// Ida e volta pelo JSON, como o arquivo gravado em eval/resultados/.
function stored(value: EvalRun): unknown {
  return JSON.parse(JSON.stringify(value))
}

const QUESTIONS = [101, 102, 103, 104].map((id) => question(id))
const byId = (id: number) => QUESTIONS.find((item) => item.id === id) as EvalQuestion

describe("parseStoredRun", () => {
  it("accepts a stored run", () => {
    const previous = run([resultFor(byId(101))])
    expect(parseStoredRun(stored(previous))).toEqual(stored(previous))
  })

  it("returns null for data without the minimal shape", () => {
    const valid = stored(run([resultFor(byId(101))])) as Record<string, unknown>
    const broken: unknown[] = [
      null,
      [],
      "texto",
      { ...valid, label: 3 },
      { ...valid, preset: undefined },
      { ...valid, date: null },
      { ...valid, commit: undefined },
      { ...valid, config: { models: MODELS } },
      { ...valid, config: "padrao" },
      { ...valid, results: {} },
      { ...valid, results: [{ reply: null }] },
      { ...valid, results: [{ question: { id: "101" } }] },
    ]
    for (const data of broken) expect(parseStoredRun(data)).toBeNull()
  })
})

describe("sameRunConfig", () => {
  const base = run([])

  it("is true for the same preset, models and RAG", () => {
    const copy = stored(base) as EvalRun
    expect(sameRunConfig(base, copy)).toBe(true)
  })

  it("is false when the preset, a model or a RAG field differs", () => {
    expect(sameRunConfig(base, { ...base, preset: "baseline" })).toBe(false)
    expect(
      sameRunConfig(base, {
        ...base,
        config: { ...base.config, rag: { ...base.config.rag, minScore: 0.6 } },
      }),
    ).toBe(false)
    expect(
      sameRunConfig(base, {
        ...base,
        config: { ...base.config, models: { ...base.config.models, chat: "outro" } },
      }),
    ).toBe(false)
  })

  it("is false when the router differs", () => {
    const off = { ...base.config, router: { enabled: false, maxWords: 12 } }
    expect(sameRunConfig(base, { ...base, config: off })).toBe(false)
    const words = { ...base.config, router: { enabled: true, maxWords: 8 } }
    expect(sameRunConfig(base, { ...base, config: words })).toBe(false)
  })

  it("accepts a run without router only against another run without router", () => {
    const { router: _router, ...oldConfig } = base.config
    const old = { ...base, config: oldConfig }
    expect(sameRunConfig(old, { ...old })).toBe(true)
    expect(sameRunConfig(old, base)).toBe(false)
    expect(sameRunConfig(base, old)).toBe(false)
  })

  it("is false when a field exists only on one side", () => {
    const rag = { ...base.config.rag, extra: 1 } as unknown as EvalRun["config"]["rag"]
    expect(sameRunConfig(base, { ...base, config: { ...base.config, rag } })).toBe(false)
  })
})

describe("sameRunConfig with the context mode", () => {
  const base = run([])
  const withRag = (rag: Partial<EvalRun["config"]["rag"]>): EvalRun => ({
    ...base,
    config: { ...base.config, rag: { ...base.config.rag, ...rag } },
  })

  it("is false when contextMode or maxContextDocs differ", () => {
    expect(sameRunConfig(base, withRag({ contextMode: "chunks" }))).toBe(false)
    expect(sameRunConfig(base, withRag({ maxContextDocs: 4 }))).toBe(false)
  })

  it("is false for a stored round recorded without the new fields", () => {
    const legacy = stored(base) as EvalRun
    const { contextMode: _mode, maxContextDocs: _max, ...rag } = legacy.config.rag
    legacy.config.rag = rag as EvalRun["config"]["rag"]
    expect(sameRunConfig(base, legacy)).toBe(false)
  })
})

describe("mergeRuns", () => {
  it("adds a second block and recomputes the metrics over all questions", () => {
    const previous = stored(run([resultFor(byId(101)), resultFor(byId(102))])) as EvalRun
    const current = run([resultFor(byId(103), "Não sei.")], {
      date: "2026-11-10T11:00:00.000Z",
      commit: "bbb2222",
    })
    const { run: merged, discarded, pending } = mergeRuns(previous, current, QUESTIONS)

    expect(merged.results.map((r) => r.question.id)).toEqual([101, 102, 103])
    expect(merged.scores.map((s) => s.id)).toEqual([101, 102, 103])
    expect(merged.metrics.total).toBe(3)
    expect(merged.metrics.accuracy).toBeCloseTo(2 / 3)
    expect(merged.metrics).toEqual(aggregate(merged.results, 12))
    expect(merged.date).toBe("2026-11-10T11:00:00.000Z")
    expect(merged.commit).toBe("aaa1111, bbb2222")
    expect(discarded).toEqual([])
    expect(pending).toEqual([104])
  })

  it("recomputes the context sufficiency from the stored contextMissing", () => {
    const sufficient = { ...resultFor(byId(101)), contextMissing: [] }
    const missing = { ...resultFor(byId(102), "Não sei."), contextMissing: ["11%"] }
    const previous = stored(run([sufficient, missing])) as EvalRun
    const current = run([{ ...resultFor(byId(103)), contextMissing: [] }])
    const { run: merged } = mergeRuns(previous, current, QUESTIONS)
    expect(merged.scores.map((s) => s.contextSufficient)).toEqual([true, false, true])
    expect(merged.scores[1]?.failureCause).toBe("busca")
    expect(merged.metrics.contextSufficiency).toBeCloseTo(2 / 3)
  })

  it("replaces a question that ran again", () => {
    const previous = run([resultFor(byId(101), "Não sei."), resultFor(byId(102))])
    const current = run([resultFor(byId(101), "É 11%.")])
    const { run: merged, discarded } = mergeRuns(previous, current, QUESTIONS)
    expect(merged.results).toHaveLength(2)
    expect(merged.results[0]?.reply?.answer).toBe("É 11%.")
    expect(merged.scores[0]?.correct).toBe(true)
    expect(discarded).toEqual([])
  })

  it("discards a previous result whose question changed and lists it as pending", () => {
    const previous = stored(run([resultFor(byId(101)), resultFor(byId(102))])) as EvalRun
    const changed = QUESTIONS.map((item) =>
      item.id === 102 ? { ...item, pergunta: "Texto novo?" } : item,
    )
    const current = run([resultFor(byId(103))])
    const { run: merged, discarded, pending } = mergeRuns(previous, current, changed)
    expect(merged.results.map((r) => r.question.id)).toEqual([101, 103])
    expect(discarded).toEqual([102])
    expect(pending).toEqual([102, 104])
  })

  it("compares questions field by field, ignoring the key order", () => {
    const reordered = Object.fromEntries(
      Object.entries(byId(101)).reverse(),
    ) as unknown as EvalQuestion
    expect(Object.keys(reordered)).not.toEqual(Object.keys(byId(101)))
    const previous = run([resultFor(reordered)])
    const { discarded } = mergeRuns(previous, run([]), QUESTIONS)
    expect(discarded).toEqual([])
  })

  it("discards a previous result whose question left the file", () => {
    const previous = run([resultFor(question(99)), resultFor(byId(101))])
    const { run: merged, discarded } = mergeRuns(previous, run([]), QUESTIONS)
    expect(merged.results.map((r) => r.question.id)).toEqual([101])
    expect(discarded).toEqual([99])
  })

  it("orders the results by eval/perguntas.json", () => {
    const previous = run([resultFor(byId(104)), resultFor(byId(102))])
    const current = run([resultFor(byId(103)), resultFor(byId(101))])
    const { run: merged, pending } = mergeRuns(previous, current, QUESTIONS)
    expect(merged.results.map((r) => r.question.id)).toEqual([101, 102, 103, 104])
    expect(pending).toEqual([])
  })

  it("keeps each commit once, in order, previous first", () => {
    const previous = run([resultFor(byId(101))], { commit: "aaa1111, bbb2222" })
    const same = mergeRuns(previous, run([], { commit: "bbb2222" }), QUESTIONS)
    expect(same.run.commit).toBe("aaa1111, bbb2222")
    const next = mergeRuns(previous, run([], { commit: "ccc3333" }), QUESTIONS)
    expect(next.run.commit).toBe("aaa1111, bbb2222, ccc3333")
  })

  it("keeps the label, preset and config of the current run", () => {
    const previous = run([resultFor(byId(101))])
    const current = run([resultFor(byId(102))])
    const { run: merged } = mergeRuns(previous, current, QUESTIONS)
    expect(merged).toMatchObject({
      label: current.label,
      preset: current.preset,
      config: current.config,
    })
  })

  it("works with an empty previous run (first block)", () => {
    const current = run([resultFor(byId(101)), resultFor(byId(102))])
    const { run: merged, pending } = mergeRuns(run([]), current, QUESTIONS)
    expect(merged.results).toHaveLength(2)
    expect(pending).toEqual([103, 104])
  })
})
