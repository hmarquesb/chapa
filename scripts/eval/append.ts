// Rodada em blocos (--append): junta as perguntas rodadas agora ao eval/resultados/<label>.json
// existente e recalcula as métricas. Funções puras: quem lê e grava os arquivos é scripts/eval.ts.
import { aggregate, type QuestionResult, scoreQuestion } from "./metrics"
import type { EvalQuestion } from "./questions"
import { type EvalRun, routerMaxWords } from "./report"

const COMMIT_SEPARATOR = ", "

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isStoredResult(value: unknown): boolean {
  return isRecord(value) && isRecord(value.question) && Number.isInteger(value.question.id)
}

// Checa a forma mínima do .json gravado: label, preset, date, commit, config e results[].
// Scores e métricas não são conferidos, porque a junção recalcula os dois.
export function parseStoredRun(data: unknown): EvalRun | null {
  if (!isRecord(data)) return null
  const { label, preset, date, commit, config, results } = data
  if (typeof label !== "string" || typeof preset !== "string") return null
  if (typeof date !== "string" || typeof commit !== "string") return null
  if (!isRecord(config) || !isRecord(config.models) || !isRecord(config.rag)) return null
  if (!Array.isArray(results) || !results.every(isStoredResult)) return null
  return data as EvalRun
}

// Igualdade campo a campo, sem depender da ordem das chaves. Campos com undefined contam como
// ausentes, como no JSON gravado.
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false
    return a.every((item, index) => deepEqual(item, b[index]))
  }
  if (!isRecord(a) || !isRecord(b)) return false
  const keysA = Object.keys(a).filter((key) => a[key] !== undefined)
  const keysB = Object.keys(b).filter((key) => b[key] !== undefined)
  if (keysA.length !== keysB.length) return false
  return keysA.every((key) => Object.hasOwn(b, key) && deepEqual(a[key], b[key]))
}

export function sameRunConfig(
  a: Pick<EvalRun, "preset" | "config">,
  b: Pick<EvalRun, "preset" | "config">,
): boolean {
  return (
    a.preset === b.preset &&
    deepEqual(a.config.models, b.config.models) &&
    deepEqual(a.config.rag, b.config.rag) &&
    deepEqual(a.config.router, b.config.router)
  )
}

function mergeCommits(previous: string, current: string): string {
  const commits: string[] = []
  for (const part of [...previous.split(COMMIT_SEPARATOR), ...current.split(COMMIT_SEPARATOR)]) {
    const commit = part.trim()
    if (commit !== "" && !commits.includes(commit)) commits.push(commit)
  }
  return commits.join(COMMIT_SEPARATOR)
}

export function mergeRuns(
  previous: EvalRun,
  current: EvalRun,
  questions: EvalQuestion[], // o perguntas.json validado, na ordem do arquivo
): { run: EvalRun; discarded: number[]; pending: number[] } {
  const questionsById = new Map(questions.map((question) => [question.id, question]))
  const currentById = new Map(current.results.map((result) => [result.question.id, result]))
  const kept = new Map<number, QuestionResult>()
  const discarded: number[] = []

  for (const result of previous.results) {
    const id = result.question.id
    if (currentById.has(id)) continue // substituída pelo bloco atual
    const question = questionsById.get(id)
    if (question === undefined || !deepEqual(question, result.question)) {
      discarded.push(id)
      continue
    }
    kept.set(id, result)
  }
  for (const [id, result] of currentById) kept.set(id, result)

  const results = questions.flatMap((question) => {
    const result = kept.get(question.id)
    return result === undefined ? [] : [result]
  })
  const pending = questions.filter((question) => !kept.has(question.id)).map((q) => q.id)

  const run: EvalRun = {
    ...current,
    date: current.date,
    commit: mergeCommits(previous.commit, current.commit),
    results,
    scores: results.map(scoreQuestion),
    metrics: aggregate(results, routerMaxWords(current)),
  }
  return { run, discarded, pending }
}
