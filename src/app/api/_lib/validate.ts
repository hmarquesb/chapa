import { VALIDATION_MESSAGES } from "@/app/api/_lib/errors"
import {
  checkProfileText,
  type ProfileTextField,
  type ProfileTextRejection,
  profileTextMessage,
} from "@/lib/moderation/profile-text"
import { isPlanId } from "@/lib/plans"
import { isUuid as isUuidString } from "@/lib/session-id"
import {
  type ChatRequest,
  PROFILE_FIELD_MAX_CHARS,
  PROFILE_FIELDS,
  type ProfileUpdateRequest,
} from "@/lib/types"

const CHAT_REQUEST_FIELDS: readonly string[] = ["sessionId", "message"]
const PROFILE_FIELD_SET: ReadonlySet<string> = new Set(PROFILE_FIELDS)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

// Same UUID pattern as the UI (src/lib/session-id.ts), so the regex lives in one place.
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && isUuidString(value)
}

// Validates only the shape. Message length and content are the assistant guardrail's job,
// which answers with blocked_input instead of an HTTP error.
export function parseChatRequest(
  body: unknown,
): { ok: true; value: ChatRequest } | { ok: false; error: string } {
  if (!isRecord(body)) return { ok: false, error: VALIDATION_MESSAGES.notObject }
  // The profile lives in the account now: any profile in the body is refused.
  if ("profile" in body) return { ok: false, error: VALIDATION_MESSAGES.profileInAccount }
  if (Object.keys(body).some((key) => !CHAT_REQUEST_FIELDS.includes(key))) {
    return { ok: false, error: VALIDATION_MESSAGES.unknownField }
  }
  const { message } = body
  // Absent sessionId: a new conversation (the server generates the id).
  let sessionId: string | undefined
  if ("sessionId" in body) {
    if (!isUuid(body.sessionId)) return { ok: false, error: VALIDATION_MESSAGES.sessionId }
    sessionId = body.sessionId
  }
  if (typeof message !== "string") return { ok: false, error: VALIDATION_MESSAGES.message }
  return { ok: true, value: sessionId === undefined ? { message } : { sessionId, message } }
}

const FILTERED_FIELDS: readonly ProfileTextField[] = ["name", "cuisine"]

export type ProfileUpdateResult =
  | { ok: true; value: ProfileUpdateRequest }
  | { ok: false; error: string; field?: ProfileTextField; rejection?: ProfileTextRejection }

// PUT /api/profile. Order: object, unknown field, plan, type and size of the fields, and only
// then the text filter on name and cuisine.
export function parseProfileUpdate(body: unknown): ProfileUpdateResult {
  if (!isRecord(body)) return { ok: false, error: VALIDATION_MESSAGES.notObject }
  if (Object.keys(body).some((key) => !PROFILE_FIELD_SET.has(key))) {
    return { ok: false, error: VALIDATION_MESSAGES.unknownField }
  }
  const { plan } = body
  if (!isPlanId(plan)) return { ok: false, error: VALIDATION_MESSAGES.plan }

  const value: ProfileUpdateRequest = { plan }
  for (const field of PROFILE_FIELDS) {
    if (field === "plan" || !(field in body)) continue
    const raw = body[field]
    if (typeof raw !== "string" || raw.length > PROFILE_FIELD_MAX_CHARS) {
      return { ok: false, error: VALIDATION_MESSAGES.profile }
    }
    const trimmed = raw.trim()
    if (trimmed !== "") value[field] = trimmed
  }
  for (const field of FILTERED_FIELDS) {
    const text = value[field]
    if (text === undefined) continue
    const check = checkProfileText(field, text)
    if (!check.ok) {
      return {
        ok: false,
        error: profileTextMessage(field, check.reason),
        field,
        rejection: check.reason,
      }
    }
  }
  return { ok: true, value }
}
