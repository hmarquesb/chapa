import { describe, expect, it } from "vitest"
import { RAG_PRESETS } from "@/config"
import type { AssistantReply, RetrievedChunk } from "@/core/types"
import { aggregate, type QuestionResult, scoreQuestion } from "./metrics"
import type { EvalQuestion } from "./questions"
import { type EvalRun, renderReport } from "./report"

const MODELS = {
  chat: "modelo-chat",
  fast: "modelo-rapido",
  embedding: "modelo-embedding",
  embeddingDimensions: 768,
}

function chunk(source: string, section: string, score: number): RetrievedChunk {
  return { id: 1, source, section, content: "texto", semantic: 0.81, keyword: 0.4, score }
}

function reply(overrides: Partial<AssistantReply> = {}): AssistantReply {
  return {
    status: "answered",
    answer: "A comissão do Plano Básico é de 12%.",
    sources: ["01-planos-e-taxas.md"],
    retrieved: [chunk("01-planos-e-taxas.md", "Comissão", 0.69)],
    searchQuery: "comissão",
    usage: { calls: 2, inputTokens: 100, outputTokens: 20 },
    latencyMs: 1234,
    ...overrides,
  }
}

const Q_OK: EvalQuestion = {
  id: 1,
  tipo: "factual",
  pergunta: "Qual é a comissão do Plano Básico?",
  fonte_esperada: ["01-planos-e-taxas.md"],
  deve_conter: ["12%"],
  esperado: "resposta",
  nota: "comissão",
}

const Q_FAIL: EvalQuestion = {
  id: 2,
  tipo: "parafrase",
  pergunta: "quando o dinheiro cai na conta?",
  fonte_esperada: ["02-repasse-financeiro.md"],
  deve_conter: ["quarta"],
  esperado: "resposta",
  nota: "dia do repasse",
}

const Q_REFUSE: EvalQuestion = {
  id: 3,
  tipo: "bloqueio",
  pergunta: "Qual a senha do meu portal?",
  esperado: "recusa",
  nota: "senha",
}

function buildRun(results: QuestionResult[]): EvalRun {
  return {
    label: "v-teste",
    preset: "padrao",
    date: "2026-11-06T12:00:00.000Z",
    commit: "abc1234",
    config: { models: MODELS, rag: { ...RAG_PRESETS.padrao } },
    results,
    scores: results.map(scoreQuestion),
    metrics: aggregate(results),
  }
}

function okResult(): QuestionResult {
  const r = reply()
  return { question: Q_OK, reply: r, latencyMs: r.latencyMs, usage: r.usage }
}

function refuseResult(): QuestionResult {
  const r = reply({
    status: "blocked_input",
    answer: "Não tenho acesso a senhas.",
    sources: [],
    retrieved: [],
    usage: { calls: 0, inputTokens: 0, outputTokens: 0 },
    latencyMs: 1,
  })
  return { question: Q_REFUSE, reply: r, latencyMs: 1, usage: r.usage }
}

function failResult(): QuestionResult {
  const r = reply({
    status: "fallback",
    answer: `Não encontrei essa informação. ${"x".repeat(400)}`,
    sources: [],
    retrieved: [chunk("07-embalagem-e-entrega.md", "Lacre", 0.42)],
    latencyMs: 2000,
  })
  return { question: Q_FAIL, reply: r, latencyMs: r.latencyMs, usage: r.usage }
}

describe("renderReport", () => {
  it("renders the title, config, metrics and per-question tables", () => {
    const md = renderReport(buildRun([okResult(), refuseResult()]))
    const lines = md.split("\n")

    expect(lines[0]).toBe("# Avaliação: v-teste")
    expect(md).toContain("2026-11-06T12:00:00.000Z")
    expect(md).toContain("abc1234")
    // Config: models, preset and every rag field.
    expect(md).toContain("modelo-chat")
    expect(md).toContain("modelo-rapido")
    expect(md).toContain("modelo-embedding")
    expect(md).toContain("padrao")
    for (const field of Object.keys(RAG_PRESETS.padrao)) expect(md).toContain(`| ${field} |`)
    // Metrics × target.
    expect(md).toContain("| Hit@K | 100,0% | ≥ 85% | ✅ |")
    expect(md).toContain("| Recusa correta | 100,0% | 100% | ✅ |")
    expect(md).toContain("| Falsa recusa | 0,0% | ≤ 10% | ✅ |")
    // Per question.
    expect(md).toContain("| 1 | factual | answered | ✅ | ✅ | 1234 ms | 01-planos-e-taxas.md |")
    expect(md).toContain("| 3 | bloqueio | blocked_input | — | ✅ | 1 ms | — |")
    // Sections in order.
    const order = ["## Configuração", "## Métricas", "## Por pergunta", "## Falhas"].map((h) =>
      md.indexOf(h),
    )
    expect(order.every((index) => index > 0)).toBe(true)
    expect([...order].sort((a, b) => a - b)).toEqual(order)
  })

  it("says 'Nenhuma falha' when every question passed", () => {
    const md = renderReport(buildRun([okResult(), refuseResult()]))
    expect(md.slice(md.indexOf("## Falhas"))).toContain("Nenhuma falha.")
  })

  it("lists the failing question with the expected result, the truncated answer and the chunks", () => {
    const md = renderReport(buildRun([okResult(), failResult(), refuseResult()]))
    const failures = md.slice(md.indexOf("## Falhas"))

    expect(md).toContain("| Acerto | 50,0% | ≥ 80% | ❌ |")
    expect(failures).not.toContain("Nenhuma falha")
    expect(failures).toContain("### Pergunta 2 (parafrase)")
    expect(failures).toContain("quando o dinheiro cai na conta?")
    expect(failures).toContain("quarta")
    expect(failures).toContain("02-repasse-financeiro.md")
    expect(failures).toContain("07-embalagem-e-entrega.md › Lacre")
    expect(failures).toContain("0.42")
    // Answer truncated to 300 characters.
    expect(failures).toContain(`Não encontrei essa informação. ${"x".repeat(269)}…`)
    expect(failures).not.toContain("x".repeat(271))
    // Only the failing question is listed.
    expect(failures).not.toContain("### Pergunta 1 ")
    expect(failures).not.toContain("### Pergunta 3 ")
  })

  it("lists errors as failures with the error name", () => {
    const errored: QuestionResult = {
      question: Q_OK,
      reply: null,
      error: "LlmQuotaError",
      latencyMs: 10,
      usage: { calls: 0, inputTokens: 0, outputTokens: 0 },
    }
    const md = renderReport(buildRun([errored]))
    expect(md).toContain("| 1 | factual | erro (LlmQuotaError) | ❌ | ❌ | 10 ms | — |")
    expect(md.slice(md.indexOf("## Falhas"))).toContain("LlmQuotaError")
  })

  it("shows the judge scores only when the run was judged", () => {
    const plain = renderReport(buildRun([okResult()]))
    expect(plain).not.toContain("Juiz")

    const judged = okResult()
    judged.judge = { corretude: 4, fidelidade: 5, justificativa: "ok" }
    const md = renderReport(buildRun([judged]))
    expect(md).toContain("Juiz (corretude/fidelidade)")
    expect(md).toContain("| 4/5 |")
  })

  it("escapes pipes and line breaks inside table cells", () => {
    const r = okResult()
    const odd = { ...r, reply: reply({ sources: ["a|b.md"] }) }
    const md = renderReport(buildRun([odd]))
    expect(md).toContain("a\\|b.md")
  })

  it("is deterministic for the same run", () => {
    const run = buildRun([okResult(), failResult()])
    expect(renderReport(JSON.parse(JSON.stringify(run)))).toBe(renderReport(run))
  })
})
