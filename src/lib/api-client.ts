import { DAY_IDS } from "@/lib/profile/types"
import type {
  ChatRequest,
  ChatResponse,
  ConversationListItem,
  HistoryMessage,
  ProfileErrorField,
  ProfileResponse,
  ProfileUpdateRequest,
  ReplyStatus,
  SessionHistoryResponse,
  SessionListResponse,
} from "@/lib/types"

export type ApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string; field?: ProfileErrorField }

export const NETWORK_ERROR_MESSAGE = "Não consegui falar com o servidor. Confira sua conexão."
const GENERIC_ERROR_MESSAGE = "Algo deu errado do nosso lado. Tente de novo em instantes."
const INVALID_RESPONSE_MESSAGE = "O servidor mandou uma resposta inesperada. Tente de novo."

const REPLY_STATUSES: readonly ReplyStatus[] = [
  "answered",
  "fallback",
  "blocked_input",
  "blocked_output",
]

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

function isReplyStatus(value: unknown): value is ReplyStatus {
  return typeof value === "string" && (REPLY_STATUSES as readonly string[]).includes(value)
}

function isChatResponse(value: unknown): value is ChatResponse {
  return (
    isRecord(value) &&
    isReplyStatus(value.status) &&
    typeof value.answer === "string" &&
    isStringArray(value.sources) &&
    (value.sessionId === null || typeof value.sessionId === "string")
  )
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
  return deleteRequest(`/api/sessions/${encodeURIComponent(id)}`, fetchFn)
}

export function deleteAccount(fetchFn: typeof fetch = defaultFetch): Promise<ApiResult<null>> {
  return deleteRequest("/api/account", fetchFn)
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

async function deleteRequest(url: string, fetchFn: typeof fetch): Promise<ApiResult<null>> {
  let response: Response
  try {
    response = await fetchFn(url, { method: "DELETE", cache: "no-store" })
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

export function sendMessage(
  req: ChatRequest,
  fetchFn: typeof fetch = defaultFetch,
): Promise<ApiResult<ChatResponse>> {
  return request(
    "/api/chat",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
      cache: "no-store",
    },
    isChatResponse,
    fetchFn,
  )
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
