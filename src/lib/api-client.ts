import {
  InvalidStreamError,
  isChatResponse,
  isReplyStatus,
  parseStreamEvent,
  splitLines,
} from "@/lib/chat-stream"
import { DAY_IDS } from "@/lib/profile/types"
import {
  CHAT_STREAM_CONTENT_TYPE,
  type ChatRequest,
  type ChatResponse,
  type ConversationListItem,
  type HistoryMessage,
  type ProfileErrorField,
  type ProfileResponse,
  type ProfileUpdateRequest,
  type ProgressEvent,
  type SessionHistoryResponse,
  type SessionListResponse,
} from "@/lib/types"

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; field?: ProfileErrorField }

export const NETWORK_ERROR_MESSAGE = "Não consegui falar com o servidor. Confira sua conexão."
const GENERIC_ERROR_MESSAGE = "Algo deu errado do nosso lado. Tente de novo em instantes."
const INVALID_RESPONSE_MESSAGE = "O servidor mandou uma resposta inesperada. Tente de novo."

// A thin arrow keeps `this` right when the global fetch is passed around as a value.
const defaultFetch: typeof fetch = (input, init) => fetch(input, init)

function isProfileErrorField(value: unknown): value is ProfileErrorField {
  return (
    value === "name" ||
    value === "cuisine" ||
    value === "location" ||
    value === "hours" ||
    (typeof value === "string" &&
      value.startsWith("hours.") &&
      (DAY_IDS as readonly string[]).includes(value.slice("hours.".length)))
  )
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string")
}

function isHistoryMessage(value: unknown): value is HistoryMessage {
  return (
    isRecord(value) &&
    typeof value.id === "number" &&
    (value.role === "user" || value.role === "assistant") &&
    typeof value.content === "string" &&
    (value.status === null || isReplyStatus(value.status)) &&
    isStringArray(value.sources) &&
    typeof value.createdAt === "string"
  )
}

function isSessionHistory(value: unknown): value is SessionHistoryResponse {
  return (
    isRecord(value) &&
    typeof value.sessionId === "string" &&
    Array.isArray(value.messages) &&
    value.messages.every(isHistoryMessage)
  )
}

function isProfileResponse(value: unknown): value is ProfileResponse {
  return isRecord(value) && isRecord(value.profile) && typeof value.needsReview === "boolean"
}

function isConversationListItem(value: unknown): value is ConversationListItem {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.title === "string" &&
    typeof value.lastActivityAt === "string"
  )
}

function isSessionList(value: unknown): value is SessionListResponse {
  return (
    isRecord(value) && Array.isArray(value.sessions) && value.sessions.every(isConversationListItem)
  )
}

async function readJson(response: Response): Promise<unknown> {
  try {
    return await response.json()
  } catch {
    return undefined
  }
}

async function request<T>(
  url: string,
  init: RequestInit,
  isValid: (body: unknown) => body is T,
  fetchFn: typeof fetch,
): Promise<ApiResult<T>> {
  let response: Response
  try {
    response = await fetchFn(url, init)
  } catch {
    return { ok: false, status: 0, error: NETWORK_ERROR_MESSAGE }
  }
  return readResponse(response, isValid)
}

async function readResponse<T>(
  response: Response,
  isValid: (body: unknown) => body is T,
): Promise<ApiResult<T>> {
  const body = await readJson(response)
  if (!response.ok) {
    const error =
      isRecord(body) && typeof body.error === "string" && body.error.trim() !== ""
        ? body.error
        : GENERIC_ERROR_MESSAGE
    const field = isRecord(body) && isProfileErrorField(body.field) ? body.field : undefined
    return { ok: false, status: response.status, error, ...(field ? { field } : {}) }
  }
  if (!isValid(body)) {
    return { ok: false, status: response.status, error: INVALID_RESPONSE_MESSAGE }
  }
  return { ok: true, data: body }
}

export function listSessions(
  fetchFn: typeof fetch = defaultFetch,
): Promise<ApiResult<SessionListResponse>> {
  return request("/api/sessions", { method: "GET", cache: "no-store" }, isSessionList, fetchFn)
}

// DELETE answers 204 with no body: any 2xx other than 204 is an unexpected reply.
export function deleteSession(
  id: string,
  fetchFn: typeof fetch = defaultFetch,
): Promise<ApiResult<null>> {
  return emptyRequest("DELETE", `/api/sessions/${encodeURIComponent(id)}`, fetchFn)
}

export function deleteAccount(fetchFn: typeof fetch = defaultFetch): Promise<ApiResult<null>> {
  return emptyRequest("DELETE", "/api/account", fetchFn)
}

export function markWelcomeSeen(fetchFn: typeof fetch = defaultFetch): Promise<ApiResult<null>> {
  return emptyRequest("POST", "/api/account/welcome", fetchFn)
}

export function saveProfile(
  profile: ProfileUpdateRequest,
  fetchFn: typeof fetch = defaultFetch,
): Promise<ApiResult<ProfileResponse>> {
  return request(
    "/api/profile",
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
      cache: "no-store",
    },
    isProfileResponse,
    fetchFn,
  )
}

async function emptyRequest(
  method: "DELETE" | "POST",
  url: string,
  fetchFn: typeof fetch,
): Promise<ApiResult<null>> {
  let response: Response
  try {
    response = await fetchFn(url, { method, cache: "no-store" })
  } catch {
    return { ok: false, status: 0, error: NETWORK_ERROR_MESSAGE }
  }
  if (response.status === 204) return { ok: true, data: null }
  if (response.ok) return { ok: false, status: response.status, error: INVALID_RESPONSE_MESSAGE }
  const body = await readJson(response)
  const error =
    isRecord(body) && typeof body.error === "string" && body.error.trim() !== ""
      ? body.error
      : GENERIC_ERROR_MESSAGE
  return { ok: false, status: response.status, error }
}

function isNdjson(response: Response): boolean {
  const type = response.headers.get("Content-Type") ?? ""
  return type.split(";")[0]?.trim().toLowerCase() === CHAT_STREAM_CONTENT_TYPE
}

// Lê o corpo NDJSON de POST /api/chat: avisa cada etapa e termina no reply ou no error.
// Linha inválida ou corpo sem final dão a resposta inesperada.
async function readChatStream(
  body: ReadableStream<Uint8Array>,
  onProgress: ((event: ProgressEvent) => void) | undefined,
): Promise<ApiResult<ChatResponse>> {
  const invalid = { ok: false, status: 200, error: INVALID_RESPONSE_MESSAGE } as const
  const reader = body.getReader()
  const decoder = new TextDecoder()
  let rest = ""
  try {
    for (;;) {
      const { done, value } = await reader.read()
      const split = done
        ? { lines: [rest + decoder.decode()], rest: "" }
        : splitLines(rest, decoder.decode(value, { stream: true }))
      rest = split.rest
      for (const line of split.lines) {
        const event = parseStreamEvent(line)
        if (event === null) continue
        if (event.type === "step") {
          const { type: _type, ...step } = event
          onProgress?.(step)
        } else if (event.type === "reply") {
          const { type: _type, ...data } = event
          await reader.cancel().catch(() => undefined)
          return { ok: true, data }
        } else {
          await reader.cancel().catch(() => undefined)
          const error = event.error.trim() === "" ? GENERIC_ERROR_MESSAGE : event.error
          return { ok: false, status: 500, error }
        }
      }
      if (done) return invalid
    }
  } catch (error) {
    await reader.cancel().catch(() => undefined)
    // Linha inválida: resposta inesperada. Conexão caída no meio do corpo: erro de rede.
    if (error instanceof InvalidStreamError) return invalid
    return { ok: false, status: 0, error: NETWORK_ERROR_MESSAGE }
  }
}

// Pede as etapas do turno em NDJSON; uma resposta em JSON (erros antes do turno) segue o
// caminho de sempre.
export async function sendMessage(
  req: ChatRequest,
  options: { onProgress?: (event: ProgressEvent) => void } = {},
  fetchFn: typeof fetch = defaultFetch,
): Promise<ApiResult<ChatResponse>> {
  let response: Response
  try {
    response = await fetchFn("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: CHAT_STREAM_CONTENT_TYPE },
      body: JSON.stringify(req),
      cache: "no-store",
    })
  } catch {
    return { ok: false, status: 0, error: NETWORK_ERROR_MESSAGE }
  }
  if (response.ok && response.body !== null && isNdjson(response)) {
    return readChatStream(response.body, options.onProgress)
  }
  return readResponse(response, isChatResponse)
}

export function fetchHistory(
  sessionId: string,
  fetchFn: typeof fetch = defaultFetch,
): Promise<ApiResult<SessionHistoryResponse>> {
  return request(
    `/api/sessions/${encodeURIComponent(sessionId)}/messages`,
    { method: "GET", cache: "no-store" },
    isSessionHistory,
    fetchFn,
  )
}
