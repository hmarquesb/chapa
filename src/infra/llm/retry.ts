import "server-only"
import { LlmQuotaError, LlmRequestError, LlmUnavailableError } from "@/core/errors"

export type RetryOptions = {
  retries: number // tentativas no total, incluindo a primeira
  baseDelayMs: number
  sleep?: (ms: number) => Promise<void>
}

type ErrorKind = "quota" | "unavailable" | "request"

const NETWORK_CODES = ["ECONNRESET", "ETIMEDOUT", "ENOTFOUND"] as const
const TIMEOUT_NAMES = new Set(["AbortError", "TimeoutError"])
const MAX_CAUSE_DEPTH = 5

function numericCode(value: unknown): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && /^\d{3}$/.test(value)) return Number(value)
  return undefined
}

function classifyOne(error: unknown): ErrorKind {
  if (typeof error !== "object" || error === null) return "request"
  const { status, code, name, message } = error as {
    status?: unknown
    code?: unknown
    name?: unknown
    message?: unknown
  }
  const text = typeof message === "string" ? message : ""
  const statusNumber = numericCode(status)
  const codeNumber = numericCode(code)

  if (statusNumber === 429 || codeNumber === 429 || text.includes("RESOURCE_EXHAUSTED")) {
    return "quota"
  }
  if (statusNumber !== undefined && statusNumber >= 500) return "unavailable"
  if (typeof name === "string" && TIMEOUT_NAMES.has(name)) return "unavailable"
  if (typeof code === "string" && (NETWORK_CODES as readonly string[]).includes(code)) {
    return "unavailable"
  }
  if (text.includes("fetch failed") || NETWORK_CODES.some((c) => text.includes(c))) {
    return "unavailable"
  }
  return "request"
}

// Classifica o erro e, se ele não disser nada, olha a cadeia de `cause` (o fetch do Node põe o
// código de rede em `cause`).
export function classifyError(error: unknown): ErrorKind {
  let current: unknown = error
  for (let depth = 0; depth < MAX_CAUSE_DEPTH && current != null; depth += 1) {
    const kind = classifyOne(current)
    if (kind !== "request") return kind
    current = typeof current === "object" ? (current as { cause?: unknown }).cause : undefined
  }
  return "request"
}

function httpStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined
  return numericCode((error as { status?: unknown }).status)
}

// Mensagens genéricas: nunca copiam a mensagem original, que pode trazer trechos do prompt.
function translate(error: unknown, kind: ErrorKind): Error {
  if (kind === "quota") {
    return new LlmQuotaError("Cota do provedor de LLM esgotada. Tente de novo mais tarde.")
  }
  if (kind === "unavailable") {
    return new LlmUnavailableError("O provedor de LLM está indisponível no momento.")
  }
  const status = httpStatus(error)
  return new LlmRequestError(
    status === undefined
      ? "O provedor de LLM recusou a requisição."
      : `O provedor de LLM recusou a requisição (status ${status}).`,
  )
}

const realSleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// Executa `fn` até `retries` vezes no total. Só tenta de novo em erro de cota ou indisponibilidade,
// esperando baseDelayMs * 2^(tentativa - 1) entre as tentativas.
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions): Promise<T> {
  const attempts = Math.max(1, Math.floor(opts.retries))
  const sleep = opts.sleep ?? realSleep
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await fn()
    } catch (error) {
      const kind = classifyError(error)
      if (kind === "request" || attempt >= attempts) throw translate(error, kind)
      await sleep(opts.baseDelayMs * 2 ** (attempt - 1))
    }
  }
}
