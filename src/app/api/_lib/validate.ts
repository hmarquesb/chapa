import { VALIDATION_MESSAGES } from "@/app/api/_lib/errors"
import { isUuid as isUuidString } from "@/lib/session-id"
import {
  type ChatRequest,
  PROFILE_FIELD_MAX_CHARS,
  PROFILE_FIELDS,
  type RestaurantProfile,
} from "@/lib/types"

const CHAT_REQUEST_FIELDS: readonly string[] = ["sessionId", "message", "profile"]
const PROFILE_FIELD_SET: ReadonlySet<string> = new Set(PROFILE_FIELDS)

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

// Same UUID pattern as the UI (src/lib/session-id.ts), so the regex lives in one place.
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && isUuidString(value)
}

function parseProfile(value: unknown): RestaurantProfile | null {
  if (!isRecord(value)) return null
  const profile: RestaurantProfile = {}
  for (const [key, field] of Object.entries(value)) {
    if (!PROFILE_FIELD_SET.has(key)) return null
    if (typeof field !== "string" || field.length > PROFILE_FIELD_MAX_CHARS) return null
    profile[key as keyof RestaurantProfile] = field
  }
  return profile
}

// Validates only the shape. Message length and content are the assistant guardrail's job,
// which answers with blocked_input instead of an HTTP error.
export function parseChatRequest(
  body: unknown,
): { ok: true; value: ChatRequest } | { ok: false; error: string } {
  if (!isRecord(body)) return { ok: false, error: VALIDATION_MESSAGES.notObject }
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
  const base = sessionId === undefined ? { message } : { sessionId, message }
  if (!("profile" in body)) return { ok: true, value: base }

  const profile = parseProfile(body.profile)
  if (profile === null) return { ok: false, error: VALIDATION_MESSAGES.profile }
  return { ok: true, value: { ...base, profile } }
}
