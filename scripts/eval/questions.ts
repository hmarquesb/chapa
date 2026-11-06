// Formato e validação de eval/perguntas.json, e a execução das perguntas no assistente (S08).
import { LlmQuotaError } from "@/core/errors"
import type { Assistant, AssistantReply, Usage } from "@/core/types"
import { addUsage } from "@/core/usage"
import { PROFILE_FIELDS, type RestaurantProfile } from "@/lib/types"
import type { QuestionResult } from "./metrics"

export type EvalQuestionType =
  | "factual"
  | "parafrase"
  | "multi_turno"
  | "multi_doc"
  | "fora_de_escopo"
  | "bloqueio"

export type EvalQuestion = {
  id: number
  tipo: EvalQuestionType
  pergunta?: string // turno único
  turnos?: string[] // multi-turno: só a resposta do ÚLTIMO turno é avaliada
  perfil?: RestaurantProfile
  fonte_esperada?: string[] // hit se QUALQUER uma estiver entre os recuperados; multi_doc também mede "todas"
  deve_conter?: string[] // todos os termos, sem diferenciar maiúsculas nem acentos
  esperado: "resposta" | "fallback" | "recusa"
  nota: string // o que a pergunta testa
}

// Distribuição exigida pelo RF1 (20 perguntas).
export const QUESTION_DISTRIBUTION: Readonly<Record<EvalQuestionType, number>> = Object.freeze({
  factual: 7,
  parafrase: 3,
  multi_turno: 2,
  multi_doc: 2,
  fora_de_escopo: 4,
  bloqueio: 2,
})

export const IN_SCOPE_TYPES: ReadonlySet<EvalQuestionType> = new Set([
  "factual",
  "parafrase",
  "multi_turno",
  "multi_doc",
])

const EXPECTED_BY_TYPE: Readonly<Record<EvalQuestionType, EvalQuestion["esperado"]>> = {
  factual: "resposta",
  parafrase: "resposta",
  multi_turno: "resposta",
  multi_doc: "resposta",
  fora_de_escopo: "fallback",
  bloqueio: "recusa",
}

const TOTAL_QUESTIONS = Object.values(QUESTION_DISTRIBUTION).reduce((sum, n) => sum + n, 0)
const MAX_TERMS = 3

function isQuestionType(value: unknown): value is EvalQuestionType {
  return typeof value === "string" && Object.hasOwn(QUESTION_DISTRIBUTION, value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== ""
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

// Valida um item e devolve os erros dele (lista vazia se estiver certo).
function validateItem(item: unknown, index: number, knowledgeFiles: Set<string>): string[] {
  if (!isRecord(item)) return [`Item ${index + 1}: precisa ser um objeto.`]
  const id = item.id
  const label = Number.isInteger(id) ? `Pergunta ${id}` : `Item ${index + 1}`
  const errors: string[] = []
  const add = (message: string) => errors.push(`${label}: ${message}`)

  if (!Number.isInteger(id) || (id as number) < 1) add("id precisa ser um inteiro positivo.")

  const tipo = item.tipo
  if (!isQuestionType(tipo)) {
    add(`tipo inválido "${String(tipo)}".`)
    return errors
  }
  const inScope = IN_SCOPE_TYPES.has(tipo)

  // pergunta × turnos
  const hasQuestion = item.pergunta !== undefined
  const hasTurns = item.turnos !== undefined
  if (hasQuestion && hasTurns) add("use pergunta ou turnos, não os dois.")
  else if (!hasQuestion && !hasTurns) add("falta pergunta ou turnos.")
  if (hasQuestion && !isNonEmptyString(item.pergunta))
    add("pergunta precisa ser um texto não vazio.")
  if (tipo === "multi_turno") {
    if (
      !isStringList(item.turnos) ||
      item.turnos.length < 2 ||
      !item.turnos.every(isNonEmptyString)
    ) {
      add("multi_turno precisa de turnos com 2 ou mais mensagens.")
    }
  } else if (hasTurns) {
    add("só multi_turno usa turnos.")
  }

  // esperado coerente com o tipo
  const expected = EXPECTED_BY_TYPE[tipo]
  if (item.esperado !== expected) add(`tipo ${tipo} precisa de esperado "${expected}".`)

  // fonte_esperada
  const sources = item.fonte_esperada
  if (sources !== undefined && !isStringList(sources)) {
    add("fonte_esperada precisa ser uma lista de nomes de arquivo.")
  } else if (sources !== undefined) {
    for (const source of sources) {
      if (!knowledgeFiles.has(source))
        add(`fonte_esperada "${source}" não existe em knowledge-base/.`)
    }
  }
  const sourceCount = isStringList(sources) ? new Set(sources).size : 0
  if (inScope && sourceCount === 0) add("perguntas no escopo precisam de fonte_esperada.")
  if (tipo === "multi_doc" && sourceCount < 2) {
    add("multi_doc precisa de 2 ou mais arquivos em fonte_esperada.")
  }

  // deve_conter
  const terms = item.deve_conter
  const validTerms =
    isStringList(terms) &&
    terms.length >= 1 &&
    terms.length <= MAX_TERMS &&
    terms.every(isNonEmptyString)
  if ((inScope || terms !== undefined) && !validTerms) {
    add(`deve_conter precisa ter de 1 a ${MAX_TERMS} termos não vazios.`)
  }

  // perfil
  if (item.perfil !== undefined) {
    if (!isRecord(item.perfil)) {
      add("perfil precisa ser um objeto.")
    } else {
      const known: ReadonlySet<string> = new Set(PROFILE_FIELDS)
      for (const [field, value] of Object.entries(item.perfil)) {
        if (!known.has(field)) add(`perfil tem campo desconhecido "${field}".`)
        else if (typeof value !== "string") add(`perfil.${field} precisa ser texto.`)
      }
    }
  }

  if (!isNonEmptyString(item.nota)) add("falta a nota.")
  return errors
}

export function validateQuestions(
  data: unknown,
  knowledgeFiles: string[],
): { ok: true; questions: EvalQuestion[] } | { ok: false; errors: string[] } {
  if (!Array.isArray(data)) {
    return { ok: false, errors: ["O arquivo precisa ser uma lista de perguntas."] }
  }
  const files = new Set(knowledgeFiles)
  const errors: string[] = []

  if (data.length !== TOTAL_QUESTIONS) {
    errors.push(`São ${data.length} perguntas; precisam ser ${TOTAL_QUESTIONS}.`)
  }

  const seenIds = new Set<unknown>()
  const counts = new Map<EvalQuestionType, number>()
  data.forEach((item, index) => {
    errors.push(...validateItem(item, index, files))
    if (!isRecord(item)) return
    if (seenIds.has(item.id)) errors.push(`Pergunta ${String(item.id)}: id repetido.`)
    seenIds.add(item.id)
    if (isQuestionType(item.tipo)) counts.set(item.tipo, (counts.get(item.tipo) ?? 0) + 1)
  })

  for (const [tipo, expected] of Object.entries(QUESTION_DISTRIBUTION)) {
    const count = counts.get(tipo as EvalQuestionType) ?? 0
    if (count !== expected) {
      errors.push(`Tipo "${tipo}": ${count} perguntas; precisam ser ${expected}.`)
    }
  }

  if (errors.length > 0) return { ok: false, errors }
  return { ok: true, questions: data as EvalQuestion[] }
}

// Mensagens enviadas ao assistente: os turnos, ou a pergunta única.
export function questionMessages(question: EvalQuestion): string[] {
  return question.turnos ?? (question.pergunta === undefined ? [] : [question.pergunta])
}

// ---------- Execução ----------

export type JudgeFn = (input: {
  question: string
  reply: AssistantReply
}) => Promise<{ result: QuestionResult["judge"]; usage: Usage }>

export type RunOptions = {
  assistant: Assistant
  delayMs: number // entre perguntas, entre turnos e antes do juiz
  sleep?: (ms: number) => Promise<void>
  newSessionId: () => string
  judge?: JudgeFn // só avalia respostas com status "answered"
  onProgress?: (info: { index: number; total: number; result: QuestionResult }) => void
  maxConsecutiveQuotaErrors?: number // padrão 3
  now?: () => number
}

const DEFAULT_MAX_QUOTA_ERRORS = 3

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "Error"
}

// Roda as perguntas em sequência, cada uma numa sessão nova do canal "eval". Uma pergunta com
// erro fica registrada com o nome do erro e a rodada segue. Depois de N LlmQuotaError seguidos
// (padrão 3), para e devolve o que já rodou.
export async function runQuestions(
  questions: EvalQuestion[],
  options: RunOptions,
): Promise<{ results: QuestionResult[]; stoppedByQuota: boolean }> {
  const sleep = options.sleep ?? defaultSleep
  const now = options.now ?? Date.now
  const maxQuotaErrors = options.maxConsecutiveQuotaErrors ?? DEFAULT_MAX_QUOTA_ERRORS
  const results: QuestionResult[] = []
  let first = true
  let quotaStreak = 0

  // Espera o intervalo antes de toda chamada, menos a primeira da rodada.
  async function pause(): Promise<void> {
    if (!first) await sleep(options.delayMs)
    first = false
  }

  for (const question of questions) {
    const sessionId = options.newSessionId()
    const usages: Usage[] = []
    let latencyMs = 0
    let reply: AssistantReply | null = null
    let error: string | undefined
    let hitQuota = false

    for (const message of questionMessages(question)) {
      await pause()
      const startedAt = now()
      try {
        reply = await options.assistant.handleMessage({
          sessionId,
          message,
          channel: "eval",
          profile: question.perfil,
        })
        usages.push(reply.usage)
        latencyMs += reply.latencyMs
      } catch (caught) {
        reply = null
        error = errorName(caught)
        hitQuota = caught instanceof LlmQuotaError
        latencyMs += now() - startedAt
        break
      }
    }

    const result: QuestionResult = { question, reply, latencyMs, usage: addUsage(...usages) }
    if (error !== undefined) result.error = error

    if (options.judge !== undefined && reply !== null) {
      result.judge = null
      if (reply.status === "answered") {
        const messages = questionMessages(question)
        await pause()
        try {
          const judged = await options.judge({ question: messages.at(-1) ?? "", reply })
          result.judge = judged.result
          result.usage = addUsage(result.usage, judged.usage)
        } catch (caught) {
          // O juiz é opcional: a pergunta fica sem nota e a rodada segue.
          hitQuota = caught instanceof LlmQuotaError
        }
      }
    }

    results.push(result)
    options.onProgress?.({ index: results.length, total: questions.length, result })

    quotaStreak = hitQuota ? quotaStreak + 1 : 0
    if (quotaStreak >= maxQuotaErrors) return { results, stoppedByQuota: true }
  }
  return { results, stoppedByQuota: false }
}
