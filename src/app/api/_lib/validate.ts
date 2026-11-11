import type { ProfileTextRejection } from "@/lib/moderation/profile-text"
import { parseProfileInput } from "@/lib/profile/parse"
import { isUuid as isUuidString } from "@/lib/session-id"
import type { ChatRequest, ProfileErrorField, ProfileUpdateRequest } from "@/lib/types"
import { VALIDATION_MESSAGES } from "@/lib/validation-messages"

const CHAT_REQUEST_FIELDS: readonly string[] = ["sessionId", "message"]

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

export type ProfileUpdateResult =
  | { ok: true; value: ProfileUpdateRequest }
  | { ok: false; error: string; field?: ProfileErrorField; rejection?: ProfileTextRejection }

// PUT /api/profile: the plan is required. The v2 format and its order of checks live in the
// shared parser (src/lib/profile/parse.ts), which the CLI and the eval also use.
export async function parseProfileUpdate(body: unknown): Promise<ProfileUpdateResult> {
  const result = await parseProfileInput(body, { requirePlan: true })
  if (!result.ok) return result
  const { plan } = result.value
  // requirePlan guarantees the plan; the check narrows the type.
  if (plan === undefined) return { ok: false, error: VALIDATION_MESSAGES.plan }
  return { ok: true, value: { ...result.value, plan } }
}
