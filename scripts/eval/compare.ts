// Comparação lado a lado de rodadas de avaliação (S08, RF6). Pura: usa só os EvalRun.
import type { RagConfig } from "@/config"
import type { Metrics, RouteMetrics } from "./metrics"
import type { EvalRun } from "./report"
import { cell, formatPercent, formatScore } from "./report"

const EMPTY = "—"

// Campos de configuração mostrados quando mudam entre as rodadas.
const CONFIG_FIELDS: Array<keyof RagConfig> = [
  "chunkStrategy",
  "chunkSize",
  "minScore",
  "topK",
  "alpha",
  "rewriteQuery",
]

const METRIC_ROWS: Array<[string, (m: Metrics) => string]> = [
  ["Perguntas", (m) => String(m.total)],
  ["No escopo", (m) => String(m.inScope)],
  ["Hit@K", (m) => formatPercent(m.hitAtK)],
  ["Acerto", (m) => formatPercent(m.accuracy)],
  ["Recusa correta", (m) => formatPercent(m.correctRefusal)],
  ["Falsa recusa", (m) => formatPercent(m.falseRefusal)],
  ["Latência p50", (m) => `${m.latencyP50Ms} ms`],
  ["Latência p95", (m) => `${m.latencyP95Ms} ms`],
  ["Erros", (m) => String(m.errors)],
  ["Chamadas", (m) => String(m.usage.calls)],
  ["Tokens de entrada", (m) => String(m.usage.inputTokens)],
  ["Tokens de saída", (m) => String(m.usage.outputTokens)],
]

// Linhas de rota: "—" na rodada gravada antes das métricas de rota (ou sem nenhuma pergunta curta).
const ROUTE_ROWS: Array<[string, (r: RouteMetrics) => string | null]> = [
  ["Acerto de rota", (r) => formatPercent(r.routeAccuracy)],
  ["Falso small talk", (r) => String(r.falseSmallTalk)],
  ["Chamadas evitadas", (r) => String(r.avoidedSearches)],
  [
    "Acerto conversa / mistas",
    (r) => `${formatPercent(r.conversationAccuracy)} / ${formatPercent(r.mixedAccuracy)}`,
  ],
  [
    "Latência curtas → RAG",
    (r) => (r.shortRagLatencyAvgMs === null ? null : `${Math.round(r.shortRagLatencyAvgMs)} ms`),
  ],
]

function routerLabel(run: EvalRun): string {
  const router = run.config.router
  if (router === undefined) return EMPTY
  return router.enabled ? "ligado" : "desligado"
}

function row(name: string, values: string[]): string {
  return `| ${[name, ...values].map(cell).join(" | ")} |`
}

export function renderComparison(runs: EvalRun[]): string {
  if (runs.length === 0) throw new Error("Informe pelo menos uma rodada para comparar.")

  const header = ["Métrica", ...runs.map((run) => run.label)]
  const lines = [`| ${header.map(cell).join(" | ")} |`, `|${header.map(() => "---").join("|")}|`]
  for (const [name, format] of METRIC_ROWS) {
    lines.push(
      row(
        name,
        runs.map((run) => format(run.metrics)),
      ),
    )
  }

  for (const [name, format] of ROUTE_ROWS) {
    lines.push(
      row(
        name,
        runs.map((run) => (run.metrics.routing ? (format(run.metrics.routing) ?? EMPTY) : EMPTY)),
      ),
    )
  }

  if (runs.some((run) => run.metrics.judgeAvg)) {
    for (const field of ["corretude", "fidelidade"] as const) {
      lines.push(
        row(
          `Juiz: ${field}`,
          runs.map((run) => {
            const judge = run.metrics.judgeAvg
            return judge ? formatScore(judge[field]) : EMPTY
          }),
        ),
      )
    }
  }

  for (const field of CONFIG_FIELDS) {
    const values = runs.map((run) => String(run.config.rag[field]))
    if (new Set(values).size > 1) lines.push(row(field, values))
  }

  const routers = runs.map(routerLabel)
  if (new Set(routers).size > 1) lines.push(row("Roteador", routers))

  const intro = [
    "# Comparação das rodadas",
    "",
    ...runs.map(
      (run) => `- ${run.label}: preset \`${run.preset}\`, ${run.date}, commit \`${run.commit}\``,
    ),
    "",
  ]
  return `${[...intro, ...lines].join("\n")}\n`
}
