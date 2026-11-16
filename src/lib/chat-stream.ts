import type { ChatResponse, ChatStreamEvent, ProgressStep, ReplyStatus } from "@/lib/types"

// Linha do corpo NDJSON de POST /api/chat que não é um evento conhecido.
export class InvalidStreamError extends Error {
  override name = "InvalidStreamError"
}

const REPLY_STATUSES: readonly ReplyStatus[] = [
  "answered",
  "small_talk",
  "fallback",
  "blocked_input",
  "blocked_output",
]

const PLAIN_STEPS: readonly ProgressStep[] = ["history", "understanding", "searching"]

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function isReplyStatus(value: unknown): value is ReplyStatus {
  return typeof value === "string" && (REPLY_STATUSES as readonly string[]).includes(value)
}

export function isChatResponse(value: unknown): value is ChatResponse {
  return (
    isRecord(value) &&
    isReplyStatus(value.status) &&
    typeof value.answer === "string" &&
    Array.isArray(value.sources) &&
    value.sources.every((source) => typeof source === "string") &&
    (value.sessionId === null || typeof value.sessionId === "string")
  )
}

// Junta o resto anterior ao pedaço novo e devolve as linhas completas e o novo resto.
export function splitLines(rest: string, chunk: string): { lines: string[]; rest: string } {
  const parts = (rest + chunk).split("\n")
  const tail = parts.pop() ?? ""
  return {
    lines: parts.map((line) => (line.endsWith("\r") ? line.slice(0, -1) : line)),
    rest: tail,
  }
}

// null para linha vazia; erro (InvalidStreamError) para JSON inválido ou evento desconhecido.
// Só os campos conhecidos passam adiante.
export function parseStreamEvent(line: string): ChatStreamEvent | null {
  if (line.trim() === "") return null
  let value: unknown
  try {
    value = JSON.parse(line)
  } catch {
    throw new InvalidStreamError("invalid JSON line")
  }
  if (!isRecord(value)) throw new InvalidStreamError("not an object")

  if (value.type === "step") {
    const { step } = value
    if (typeof step === "string" && (PLAIN_STEPS as readonly string[]).includes(step)) {
      return { type: "step", step: step as "history" | "understanding" | "searching" }
    }
    const { documents } = value
    if (
      step === "writing" &&
      typeof documents === "number" &&
      Number.isInteger(documents) &&
      documents >= 0
    ) {
      return { type: "step", step: "writing", documents }
    }
    throw new InvalidStreamError("unknown step")
  }
  if (value.type === "reply") {
    const { type: _type, ...body } = value
    if (!isChatResponse(body)) throw new InvalidStreamError("invalid reply")
    const { status, answer, sources, sessionId } = body
    return { type: "reply", status, answer, sources, sessionId }
  }
  if (value.type === "error" && typeof value.error === "string") {
    return { type: "error", error: value.error }
  }
  throw new InvalidStreamError("unknown event")
}
