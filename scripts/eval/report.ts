// Relatório em markdown de uma rodada de avaliação (S08, RF5). Puro: usa só o EvalRun, para que
// gerar o .md de novo a partir do .json dê o mesmo texto (RNF4).
import type { AppConfig, RagConfig } from "@/config"
import { type Metrics, type QuestionResult, type QuestionScore, REFUSAL_STATUSES } from "./metrics"
import { questionMessages } from "./questions"

export type EvalRun = {
  label: string
  preset: string
  date: string // ISO
  commit: string // git rev-parse --short HEAD, ou "sem-git"
  config: { models: AppConfig["models"]; rag: RagConfig }
  results: QuestionResult[]
  scores: QuestionScore[]
  metrics: Metrics
}

const ANSWER_PREVIEW_CHARS = 300
const EMPTY = "—"

// Metas da avaliação. Recusa correta ≥ 92%: no máximo 1 erro nas 14 perguntas de recusa.
export const TARGETS = {
  hitAtK: 0.85,
  accuracy: 0.8,
  correctRefusal: 0.92,
  falseRefusal: 0.1,
} as const

export function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1).replace(".", ",")}%`
}

export function formatScore(value: number): string {
  return value.toFixed(2)
}

// Texto seguro dentro de uma célula de tabela markdown.
export function cell(value: string): string {
  return value.replace(/\r?\n/g, " ").replace(/\|/g, "\\|")
}

function check(value: boolean | null): string {
  if (value === null) return EMPTY
  return value ? "✅" : "❌"
}

function oneLine(text: string): string {
  return text.replace(/\s*\r?\n\s*/g, " ").trim()
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text
}

function renderConfig(run: EvalRun): string[] {
  const { models, rag } = run.config
  const lines = [
    "## Configuração",
    "",
    `- Preset: \`${run.preset}\``,
    `- Modelo de chat: \`${models.chat}\``,
    `- Modelo rápido (reescrita, resumo e juiz): \`${models.fast}\``,
    `- Modelo de embedding: \`${models.embedding}\` (${models.embeddingDimensions} dimensões)`,
    "",
    "| Campo | Valor |",
    "|---|---|",
  ]
  for (const [field, value] of Object.entries(rag)) lines.push(`| ${field} | ${String(value)} |`)
  return lines
}

function metricRow(name: string, value: string, target: string, ok: boolean | null): string {
  return `| ${name} | ${value} | ${target} | ${ok === null ? EMPTY : check(ok)} |`
}

function renderMetrics(metrics: Metrics): string[] {
  const { usage } = metrics
  const lines = [
    "## Métricas",
    "",
    `Perguntas: ${metrics.total} (${metrics.inScope} no escopo). Erros: ${metrics.errors}.`,
    "",
    "| Métrica | Valor | Meta | Status |",
    "|---|---|---|---|",
    metricRow("Hit@K", formatPercent(metrics.hitAtK), "≥ 85%", metrics.hitAtK >= TARGETS.hitAtK),
    metricRow(
      "Acerto",
      formatPercent(metrics.accuracy),
      "≥ 80%",
      metrics.accuracy >= TARGETS.accuracy,
    ),
    metricRow(
      "Recusa correta",
      formatPercent(metrics.correctRefusal),
      "≥ 92%",
      metrics.correctRefusal >= TARGETS.correctRefusal,
    ),
    metricRow(
      "Falsa recusa",
      formatPercent(metrics.falseRefusal),
      "≤ 10%",
      metrics.falseRefusal <= TARGETS.falseRefusal,
    ),
    metricRow("Latência p50", `${metrics.latencyP50Ms} ms`, "registrar", null),
    metricRow("Latência p95", `${metrics.latencyP95Ms} ms`, "registrar", null),
    metricRow(
      "Chamadas e tokens",
      `${usage.calls} chamadas, ${usage.inputTokens} de entrada, ${usage.outputTokens} de saída`,
      "registrar",
      null,
    ),
  ]
  if (metrics.judgeAvg !== undefined) {
    const judge = metrics.judgeAvg
    lines.push(
      metricRow(
        "Juiz (média corretude/fidelidade)",
        judge === null
          ? "sem notas válidas"
          : `${formatScore(judge.corretude)} / ${formatScore(judge.fidelidade)}`,
        "registrar",
        null,
      ),
    )
  }
  return lines
}

function statusLabel(result: QuestionResult): string {
  if (result.reply === null) return `erro (${result.error ?? "desconhecido"})`
  return result.reply.status
}

// "Correto": no escopo, resposta certa; fora do escopo e bloqueio, recusa certa.
function passed(score: QuestionScore): boolean | null {
  return score.inScope ? score.correct : score.refusedCorrectly
}

function renderQuestions(run: EvalRun): string[] {
  const withJudge = run.results.some((result) => result.judge !== undefined)
  const header = ["Id", "Tipo", "Status", "Hit", "Correto", "Latência", "Fontes"]
  if (withJudge) header.push("Juiz (corretude/fidelidade)")
  const lines = [
    "## Por pergunta",
    "",
    "Fora do escopo e bloqueio: “Correto” indica recusa correta.",
    "",
    `| ${header.join(" | ")} |`,
    `|${header.map(() => "---").join("|")}|`,
  ]
  run.results.forEach((result, index) => {
    const score = run.scores[index]
    const sources = result.reply?.sources ?? []
    const columns = [
      String(result.question.id),
      result.question.tipo,
      statusLabel(result),
      check(score?.hit ?? null),
      check(score ? passed(score) : null),
      `${result.latencyMs} ms`,
      sources.length === 0 ? EMPTY : sources.join(", "),
    ]
    if (withJudge) {
      columns.push(result.judge ? `${result.judge.corretude}/${result.judge.fidelidade}` : EMPTY)
    }
    lines.push(`| ${columns.map(cell).join(" | ")} |`)
  })
  return lines
}

// Motivo da falha, ou null se a pergunta passou. Recusa de tipo diferente do esperado também
// é listada, embora conte como recusa correta na métrica (nunca no adversarial, que aceita
// qualquer recusa).
function failureReason(result: QuestionResult, score: QuestionScore): string | null {
  if (result.reply === null) return `erro (${result.error ?? "desconhecido"})`
  // Campo ausente em resultados gravados antes do nao_deve_conter.
  const forbidden = score.forbiddenFound ?? []
  const status = result.reply.status
  if (score.inScope) {
    if (score.falseRefusal) return `falsa recusa (status ${status})`
    if (forbidden.length > 0) return `resposta com termo proibido (${forbidden.join(", ")})`
    if (!score.correct) return "resposta sem todos os termos de deve_conter"
    return null
  }
  if (!REFUSAL_STATUSES.has(status)) return `não recusou (status ${status})`
  if (forbidden.length > 0) return `recusa com termo proibido (${forbidden.join(", ")})`
  if (result.question.tipo !== "adversarial" && !score.refusalTypeMatches) {
    return `recusa de tipo diferente (status ${status})`
  }
  return null
}

function expectedText(result: QuestionResult): string {
  const { question } = result
  const parts: string[] = [question.esperado]
  if (question.tipo === "bloqueio") parts.push("(blocked_input)")
  else if (question.tipo === "adversarial") parts.push("(fallback ou bloqueio)")
  if (question.deve_conter?.length) parts.push(`com ${question.deve_conter.join(", ")}`)
  if (question.nao_deve_conter?.length) parts.push(`sem ${question.nao_deve_conter.join(", ")}`)
  if (question.fonte_esperada?.length) parts.push(`de ${question.fonte_esperada.join(", ")}`)
  return parts.join(" ")
}

function renderFailures(run: EvalRun): string[] {
  const lines = ["## Falhas", ""]
  let count = 0
  run.results.forEach((result, index) => {
    const score = run.scores[index]
    if (score === undefined) return
    const reason = failureReason(result, score)
    if (reason === null) return
    count++
    const messages = questionMessages(result.question).map(oneLine)
    lines.push(`### Pergunta ${result.question.id} (${result.question.tipo})`, "")
    lines.push(`- Pergunta: ${messages.join(" → ")}`)
    lines.push(`- Esperado: ${expectedText(result)}`)
    lines.push(`- Motivo: ${reason}`)
    if (result.reply !== null) {
      lines.push(`- Resposta: ${truncate(oneLine(result.reply.answer), ANSWER_PREVIEW_CHARS)}`)
      if (result.reply.searchQuery !== "") {
        lines.push(`- Busca: ${oneLine(result.reply.searchQuery)}`)
      }
      const retrieved = result.reply.retrieved
      lines.push(`- Trechos recuperados (${retrieved.length}) [score | sem | kw]:`)
      for (const chunk of retrieved) {
        const location = chunk.section === "" ? chunk.source : `${chunk.source} › ${chunk.section}`
        const scores = [chunk.score, chunk.semantic, chunk.keyword].map(formatScore).join(" | ")
        lines.push(`  - ${oneLine(location)} [${scores}]`)
      }
    }
    lines.push("")
  })
  if (count === 0) lines.push("Nenhuma falha.", "")
  return lines
}

export function renderReport(run: EvalRun): string {
  const lines = [
    `# Avaliação: ${run.label}`,
    "",
    `Data: ${run.date} · Commit: \`${run.commit}\``,
    "",
    ...renderConfig(run),
    "",
    ...renderMetrics(run.metrics),
    "",
    ...renderQuestions(run),
    "",
    ...renderFailures(run),
  ]
  return `${lines.join("\n").trimEnd()}\n`
}
