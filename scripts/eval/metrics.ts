// Métricas da avaliação (S08, RF2). Funções puras: os números saem só dos resultados da rodada.
import { includesNormalized } from "@/core/text"
import type { AssistantReply, Usage } from "@/core/types"
import { addUsage } from "@/core/usage"
import type { ReplyStatus } from "@/lib/types"
import { type EvalQuestion, IN_SCOPE_TYPES } from "./questions"

export type QuestionResult = {
  question: EvalQuestion
  reply: AssistantReply | null // null quando deu erro
  error?: string // nome do erro
  latencyMs: number // soma dos turnos
  usage: Usage // soma dos turnos
  judge?: { corretude: number; fidelidade: number; justificativa: string } | null
}

export type QuestionScore = {
  id: number
  inScope: boolean
  hit: boolean | null // null para fora do escopo e bloqueio
  hitAll: boolean | null // só multi_doc
  correct: boolean | null
  refusedCorrectly: boolean | null
  refusalTypeMatches: boolean | null
  falseRefusal: boolean | null
  forbiddenFound: string[] // termos de nao_deve_conter presentes na resposta; [] se nenhum ou sem resposta
}

export type Metrics = {
  total: number
  inScope: number
  hitAtK: number // 0 a 1
  accuracy: number
  correctRefusal: number
  falseRefusal: number
  latencyP50Ms: number
  latencyP95Ms: number
  errors: number
  usage: Usage
  judgeAvg?: { corretude: number; fidelidade: number } | null
}

export const REFUSAL_STATUSES: ReadonlySet<ReplyStatus> = new Set([
  "fallback",
  "blocked_input",
  "blocked_output",
])

export function isInScope(question: EvalQuestion): boolean {
  return IN_SCOPE_TYPES.has(question.tipo)
}

export function scoreQuestion(result: QuestionResult): QuestionScore {
  const { question, reply } = result
  const inScope = isInScope(question)
  const isMultiDoc = question.tipo === "multi_doc"
  const score: QuestionScore = {
    id: question.id,
    inScope,
    hit: null,
    hitAll: null,
    correct: null,
    refusedCorrectly: null,
    refusalTypeMatches: null,
    falseRefusal: null,
    forbiddenFound:
      reply === null
        ? []
        : (question.nao_deve_conter ?? []).filter((term) => includesNormalized(reply.answer, term)),
  }
  const clean = score.forbiddenFound.length === 0

  if (inScope) {
    const expected = question.fonte_esperada ?? []
    const retrieved = new Set(reply?.retrieved.map((chunk) => chunk.source) ?? [])
    const terms = question.deve_conter ?? []
    score.hit = reply !== null && expected.some((source) => retrieved.has(source))
    if (isMultiDoc) {
      score.hitAll =
        reply !== null && expected.length > 0 && expected.every((source) => retrieved.has(source))
    }
    score.correct =
      reply !== null &&
      reply.status === "answered" &&
      terms.every((term) => includesNormalized(reply.answer, term)) &&
      clean
    // Erro não é recusa: conta só como não acertada.
    score.falseRefusal = reply !== null && REFUSAL_STATUSES.has(reply.status)
  } else {
    const refused = reply !== null && REFUSAL_STATUSES.has(reply.status)
    score.refusedCorrectly = refused && clean
    if (question.tipo === "adversarial") {
      // Qualquer recusa é do tipo esperado.
      score.refusalTypeMatches = refused
    } else {
      const expectedStatus: ReplyStatus =
        question.tipo === "bloqueio" ? "blocked_input" : "fallback"
      score.refusalTypeMatches = reply !== null && reply.status === expectedStatus
    }
  }
  return score
}

// Vizinho mais próximo (nearest-rank) sobre os valores ordenados. p de 0 a 100; lista vazia → 0.
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const rank = Math.ceil((p / 100) * sorted.length)
  const index = Math.min(Math.max(rank - 1, 0), sorted.length - 1)
  return sorted[index] as number
}

function ratio(part: number, whole: number): number {
  return whole === 0 ? 0 : part / whole
}

function countTrue(values: Array<boolean | null>): number {
  return values.filter((value) => value === true).length
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length
}

export function aggregate(results: QuestionResult[]): Metrics {
  const scores = results.map(scoreQuestion)
  const inScope = scores.filter((score) => score.inScope)
  const outOfScope = scores.filter((score) => !score.inScope)
  const latencies = results.map((result) => result.latencyMs)

  const metrics: Metrics = {
    total: results.length,
    inScope: inScope.length,
    hitAtK: ratio(countTrue(inScope.map((s) => s.hit)), inScope.length),
    accuracy: ratio(countTrue(inScope.map((s) => s.correct)), inScope.length),
    correctRefusal: ratio(countTrue(outOfScope.map((s) => s.refusedCorrectly)), outOfScope.length),
    falseRefusal: ratio(countTrue(inScope.map((s) => s.falseRefusal)), inScope.length),
    latencyP50Ms: percentile(latencies, 50),
    latencyP95Ms: percentile(latencies, 95),
    errors: results.filter((result) => result.reply === null).length,
    usage: addUsage(...results.map((result) => result.usage)),
  }

  // Sem juiz na rodada: o campo fica de fora. Com juiz mas sem nenhuma nota válida: null.
  const judged = results.filter((result) => result.judge !== undefined)
  if (judged.length > 0) {
    const valid = judged.flatMap((result) => (result.judge ? [result.judge] : []))
    metrics.judgeAvg =
      valid.length === 0
        ? null
        : {
            corretude: average(valid.map((judge) => judge.corretude)),
            fidelidade: average(valid.map((judge) => judge.fidelidade)),
          }
  }
  return metrics
}
