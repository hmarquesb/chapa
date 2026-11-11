import { ERROR_MESSAGES } from "@/app/api/_lib/errors"
import type { ProfileErrorField } from "@/lib/types"

// Error with an HTTP status and a message that is safe to show to the user.
export class HttpError extends Error {
  override name = "HttpError"
  readonly status: number
  readonly publicMessage: string
  // Profile field the message is about, when the refusal belongs to one field.
  readonly field?: ProfileErrorField

  constructor(status: number, publicMessage: string, field?: ProfileErrorField) {
    super(publicMessage)
    this.status = status
    this.publicMessage = publicMessage
    if (field !== undefined) this.field = field
  }
}

function tooLarge(): HttpError {
  return new HttpError(413, ERROR_MESSAGES.bodyTooLarge)
}

function invalidJson(): HttpError {
  return new HttpError(400, ERROR_MESSAGES.invalidJson)
}

// Reads at most maxBytes from the body. A declared Content-Length over the limit is refused
// before reading; otherwise the stream is counted chunk by chunk and cancelled as soon as it
// passes the limit, so an oversized body is never fully buffered.
export async function readJsonBody(req: Request, maxBytes: number): Promise<unknown> {
  const declared = Number(req.headers.get("content-length"))
  if (Number.isFinite(declared) && declared > maxBytes) throw tooLarge()
  if (req.body === null) throw invalidJson()

  const reader = req.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined)
      throw tooLarge()
    }
    chunks.push(value)
  }

  const bytes = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes))
  } catch {
    throw invalidJson()
  }
}

// JSON response that is never cached: answers and histories are private to the session.
export function json(body: unknown, init?: ResponseInit): Response {
  const headers = new Headers(init?.headers)
  if (!headers.has("cache-control")) headers.set("cache-control", "no-store")
  return Response.json(body, { ...init, headers })
}
