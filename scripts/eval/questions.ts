// Formato e validação de eval/perguntas.json, e a execução das perguntas no assistente (S08).
import { LlmQuotaError } from "@/core/errors"
import type { Assistant, AssistantReply, Usage } from "@/core/types"
import { addUsage } from "@/core/usage"
import { isPlanId } from "@/lib/plans"
import { parseProfileInput } from "@/lib/profile/parse"
import type { RestaurantProfile } from "@/lib/types"
import { missingContextTerms, type QuestionResult } from "./metrics"

export type EvalQuestionType =
  | "factual"
  | "parafrase"
  | "perfil"
  | "multi_turno"
  | "multi_doc"
  | "aberta"
  | "fora_de_escopo"
  | "adversarial"
  | "bloqueio"
  | "cumprimento"
  | "conversa"
  | "misto"

export type ExpectedRoute = "cumprimento" | "conversa" | "rag"

export type EvalQuestion = {
  id: number
  tipo: EvalQuestionType
  pergunta?: string // turno único
  turnos?: string[] // multi-turno: só a resposta do ÚLTIMO turno é avaliada
  perfil?: RestaurantProfile
  fonte_esperada?: string[] // hit se QUALQUER uma estiver entre os recuperados; multi_doc também mede "todas"
  deve_conter?: string[] // todos os termos, sem diferenciar maiúsculas nem acentos
  nao_deve_conter?: string[] // 1 a 5 termos; nenhum pode aparecer na resposta
  esperado: "resposta" | "fallback" | "recusa" | "conversa"
  rota_esperada: ExpectedRoute // rota que a pergunta deve tomar (ADR 0025)
  nota: string // o que a pergunta testa
}

// Distribuição exigida (74 perguntas: 46 no escopo, 16 de recusa e 12 de conversa).
export const QUESTION_DISTRIBUTION: Readonly<Record<EvalQuestionType, number>> = Object.freeze({
  factual: 15,
  parafrase: 11,
  perfil: 6,
  multi_turno: 5,
  multi_doc: 5,
  aberta: 4,
  fora_de_escopo: 9,
  adversarial: 4,
  bloqueio: 3,
  cumprimento: 4,
  conversa: 4,
  misto: 4,
})

export const IN_SCOPE_TYPES: ReadonlySet<EvalQuestionType> = new Set([
  "factual",
  "parafrase",
  "perfil",
  "multi_turno",
  "multi_doc",
  "aberta",
])

// Tipos de conversa: não entram nas métricas de escopo nem de recusa.
export const CONVERSATION_TYPES: ReadonlySet<EvalQuestionType> = new Set([
  "cumprimento",
  "conversa",
  "misto",
])

const EXPECTED_ROUTE_BY_TYPE = (tipo: EvalQuestionType): ExpectedRoute =>
  tipo === "cumprimento" ? "cumprimento" : tipo === "conversa" ? "conversa" : "rag"

const EXPECTED_BY_TYPE: Readonly<Record<EvalQuestionType, EvalQuestion["esperado"]>> = {
  factual: "resposta",
  parafrase: "resposta",
  perfil: "resposta",
  multi_turno: "resposta",
  multi_doc: "resposta",
  aberta: "resposta",
  fora_de_escopo: "fallback",
  adversarial: "recusa",
  bloqueio: "recusa",
  cumprimento: "conversa",
  conversa: "conversa",
  misto: "resposta",
}

const TOTAL_QUESTIONS = Object.values(QUESTION_DISTRIBUTION).reduce((sum, n) => sum + n, 0)
const MAX_TERMS = 3
const MAX_FORBIDDEN_TERMS = 5

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
async function validateItem(
  item: unknown,
  index: number,
  knowledgeFiles: Set<string>,
): Promise<string[]> {
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

  // rota_esperada coerente com o tipo
  const expectedRoute = EXPECTED_ROUTE_BY_TYPE(tipo)
  if (item.rota_esperada === undefined) add("falta rota_esperada.")
  else if (item.rota_esperada !== expectedRoute) {
    add(`tipo ${tipo} precisa de rota_esperada "${expectedRoute}".`)
  }

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
  if (
    (inScope || tipo === "cumprimento" || tipo === "misto" || terms !== undefined) &&
    !validTerms
  ) {
    add(`deve_conter precisa ter de 1 a ${MAX_TERMS} termos não vazios.`)
  }

  // nao_deve_conter: opcional em qualquer tipo
  const forbidden = item.nao_deve_conter
  if (
    forbidden !== undefined &&
    !(
      isStringList(forbidden) &&
      forbidden.length >= 1 &&
      forbidden.length <= MAX_FORBIDDEN_TERMS &&
      forbidden.every(isNonEmptyString)
    )
  ) {
    add(`nao_deve_conter precisa ter de 1 a ${MAX_FORBIDDEN_TERMS} termos não vazios.`)
  }

  // perfil
  if (tipo === "perfil" && !(isRecord(item.perfil) && isNonEmptyString(item.perfil.plan))) {
    add("perfil precisa de perfil.plan preenchido.")
  }
  if (tipo === "cumprimento" && !(isRecord(item.perfil) && isNonEmptyString(item.perfil.name))) {
    add("cumprimento precisa de perfil.name preenchido.")
  }
  if (item.perfil !== undefined) {
    if (!isRecord(item.perfil)) {
      add("perfil precisa ser um objeto.")
    } else if (item.perfil.plan !== undefined && !isPlanId(item.perfil.plan)) {
      add('perfil.plan precisa ser "proprio", "entrega" ou "misto".')
    } else {
      // Mesmo parser do PUT /api/profile, do CLI e da conversão; o plano só é exigido acima.
      const parsed = await parseProfileInput(item.perfil, { requirePlan: false })
      if (!parsed.ok) add(`perfil inválido: ${parsed.error}`)
    }
  }

  if (!isNonEmptyString(item.nota)) add("falta a nota.")
  return errors
}

export async function validateQuestions(
  data: unknown,
  knowledgeFiles: string[],
): Promise<{ ok: true; questions: EvalQuestion[] } | { ok: false; errors: string[] }> {
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
  const factualSources = new Set<unknown>()
  for (const [index, item] of data.entries()) {
    errors.push(...(await validateItem(item, index, files)))
    if (!isRecord(item)) continue
    if (seenIds.has(item.id)) errors.push(`Pergunta ${String(item.id)}: id repetido.`)
    seenIds.add(item.id)
    if (isQuestionType(item.tipo)) counts.set(item.tipo, (counts.get(item.tipo) ?? 0) + 1)
    if (item.tipo === "factual" && Array.isArray(item.fonte_esperada)) {
      for (const source of item.fonte_esperada) factualSources.add(source)
    }
  }

  for (const [tipo, expected] of Object.entries(QUESTION_DISTRIBUTION)) {
    const count = counts.get(tipo as EvalQuestionType) ?? 0
    if (count !== expected) {
      errors.push(`Tipo "${tipo}": ${count} perguntas; precisam ser ${expected}.`)
    }
  }

  // Cobertura: todo documento da base tem pelo menos uma pergunta factual.
  for (const file of knowledgeFiles) {
    if (!factualSources.has(file)) errors.push(`Documento "${file}" sem pergunta factual.`)
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
          accountId: null,
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
    if (reply !== null && IN_SCOPE_TYPES.has(question.tipo)) {
      result.contextMissing = missingContextTerms(question.deve_conter ?? [], reply.context)
    }

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
