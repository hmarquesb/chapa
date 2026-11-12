import { describe, expect, it } from "vitest"
import { RAG_PRESETS, type RagConfig } from "@/config"
import { renderComparison } from "./compare"
import type { Metrics, RouteMetrics } from "./metrics"
import type { EvalRun } from "./report"

const ROUTING: RouteMetrics = {
  routeAccuracy: 1,
  falseSmallTalk: 0,
  falseSmallTalkIds: [],
  avoidedSearches: 6,
  greetingAccuracy: 1,
  conversationAccuracy: 0.75,
  mixedAccuracy: 1,
  shortRagLatencyAvgMs: 1800,
}

function routerOf(enabled: boolean | undefined): EvalRun["config"]["router"] {
  return enabled === undefined ? undefined : { enabled, maxWords: 12 }
}

const MODELS = {
  chat: "modelo-chat",
  fast: "modelo-rapido",
  embedding: "modelo-embedding",
  embeddingDimensions: 768,
}

function metrics(overrides: Partial<Metrics> = {}): Metrics {
  return {
    total: 20,
    inScope: 14,
    hitAtK: 0.5,
    accuracy: 0.5,
    correctRefusal: 1,
    falseRefusal: 0.25,
    latencyP50Ms: 1500,
    latencyP95Ms: 3000,
    errors: 0,
    usage: { calls: 40, inputTokens: 20000, outputTokens: 3000 },
    ...overrides,
  }
}

function run(
  label: string,
  rag: Partial<RagConfig>,
  m: Partial<Metrics> = {},
  router?: boolean,
): EvalRun {
  return {
    label,
    preset: "padrao",
    date: "2026-11-06T12:00:00.000Z",
    commit: "abc1234",
    config: { models: MODELS, rag: { ...RAG_PRESETS.padrao, ...rag }, router: routerOf(router) },
    results: [],
    scores: [],
    metrics: metrics(m),
  }
}

function row(md: string, name: string): string | undefined {
  return md.split("\n").find((line) => line.startsWith(`| ${name} |`))
}

describe("renderComparison", () => {
  it("puts one column per run and a minScore row when it changed", () => {
    const md = renderComparison([
      run("v1", { minScore: 0.7 }, { hitAtK: 0.5 }),
      run("v2", { minScore: 0.45 }, { hitAtK: 13 / 14 }),
    ])
    const lines = md.split("\n").filter((line) => line.startsWith("|"))
    expect(lines[0]).toBe("| Métrica | v1 | v2 |")
    expect(lines[1]).toBe("|---|---|---|")
    expect(row(md, "minScore")).toBe("| minScore | 0.7 | 0.45 |")
    expect(row(md, "Hit@K")).toBe("| Hit@K | 50,0% | 92,9% |")
  })

  it("has a row for every RF2 metric", () => {
    const md = renderComparison([run("v1", {}), run("v2", {})])
    for (const name of [
      "Perguntas",
      "Hit@K",
      "Acerto",
      "Recusa correta",
      "Falsa recusa",
      "Latência p50",
      "Latência p95",
      "Erros",
      "Chamadas",
      "Tokens de entrada",
      "Tokens de saída",
    ]) {
      expect(row(md, name), name).toBeDefined()
    }
    expect(row(md, "Latência p50")).toBe("| Latência p50 | 1500 ms | 1500 ms |")
  })

  it("shows only the config rows that changed", () => {
    const md = renderComparison([
      run("v1", { chunkStrategy: "fixed", chunkSize: 500, rewriteQuery: false }),
      run("v2", { chunkStrategy: "markdown", chunkSize: 1200, rewriteQuery: true }),
    ])
    expect(row(md, "chunkStrategy")).toBe("| chunkStrategy | fixed | markdown |")
    expect(row(md, "chunkSize")).toBe("| chunkSize | 500 | 1200 |")
    expect(row(md, "rewriteQuery")).toBe("| rewriteQuery | false | true |")
    for (const name of ["minScore", "topK", "alpha"]) expect(row(md, name)).toBeUndefined()
  })

  it("shows the judge averages when some run has them", () => {
    const md = renderComparison([
      run("v1", {}),
      run("v2", {}, { judgeAvg: { corretude: 4.25, fidelidade: 4.5 } }),
    ])
    expect(row(md, "Juiz: corretude")).toBe("| Juiz: corretude | — | 4.25 |")
    expect(row(md, "Juiz: fidelidade")).toBe("| Juiz: fidelidade | — | 4.50 |")
    expect(row(renderComparison([run("v1", {})]), "Juiz: corretude")).toBeUndefined()
  })

  it("shows the route rows with a dash for a run without routing (v3 x v4)", () => {
    const md = renderComparison([run("v3", {}), run("v4", {}, { routing: ROUTING }, true)])
    expect(row(md, "Acerto de rota")).toBe("| Acerto de rota | — | 100,0% |")
    expect(row(md, "Falso small talk")).toBe("| Falso small talk | — | 0 |")
    expect(row(md, "Chamadas evitadas")).toBe("| Chamadas evitadas | — | 6 |")
    expect(row(md, "Acerto conversa / mistas")).toBe(
      "| Acerto conversa / mistas | — | 75,0% / 100,0% |",
    )
    expect(row(md, "Latência curtas → RAG")).toBe("| Latência curtas → RAG | — | 1800 ms |")
    expect(row(md, "Roteador")).toBe("| Roteador | — | ligado |")
  })

  it("shows the router row and the short-RAG latency side by side (v4 x v4-regras)", () => {
    const md = renderComparison([
      run("v4", {}, { routing: { ...ROUTING, shortRagLatencyAvgMs: 1200 } }, true),
      run(
        "v4-regras",
        {},
        { routing: { ...ROUTING, avoidedSearches: 4, shortRagLatencyAvgMs: null } },
        false,
      ),
    ])
    expect(row(md, "Roteador")).toBe("| Roteador | ligado | desligado |")
    expect(row(md, "Latência curtas → RAG")).toBe("| Latência curtas → RAG | 1200 ms | — |")
    expect(row(md, "Chamadas evitadas")).toBe("| Chamadas evitadas | 6 | 4 |")
  })

  it("hides the router row when every run has the same router", () => {
    const md = renderComparison([run("v4", {}, {}, true), run("v4b", {}, {}, true)])
    expect(row(md, "Roteador")).toBeUndefined()
    expect(row(renderComparison([run("v3", {}), run("v3b", {})]), "Roteador")).toBeUndefined()
  })

  it("asks for at least one run", () => {
    expect(() => renderComparison([])).toThrow()
  })
})
