import "server-only"
import type { AccountKind } from "@/core/types"
import { isUuid } from "@/lib/session-id"

// Pure helpers for the Auth.js callbacks. They do not import next-auth, so Vitest covers them.

export type SessionClaims = { accountId: string; kind: AccountKind }

const KEPT_TOKEN_FIELDS = ["iat", "exp", "jti"] as const

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

function isAccountKind(value: unknown): value is AccountKind {
  return value === "google" || value === "demo"
}

// Only with profile.email (non-empty string) and profile.email_verified === true.
// googleSub = providerAccountId. Name, picture and the rest of the profile are dropped.
export function googleIdentity(input: {
  providerAccountId: string
  profile: unknown
}): { googleSub: string; email: string } | null {
  const profile = asRecord(input.profile)
  if (profile === null || input.providerAccountId === "") return null
  const { email, email_verified: verified } = profile
  if (typeof email !== "string" || email === "" || verified !== true) return null
  return { googleSub: input.providerAccountId, email }
}

// Keeps only iat, exp and jti of the token, sets sub = accountId and adds accountId and kind.
// Never carries name, email nor picture.
export function sessionToken(
  token: Record<string, unknown>,
  claims: SessionClaims,
): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of KEPT_TOKEN_FIELDS) {
    if (token[field] !== undefined) result[field] = token[field]
  }
  result.sub = claims.accountId
  result.accountId = claims.accountId
  result.kind = claims.kind
  return result
}

// Reads accountId (UUID) and kind ("google" | "demo") from a token or a session.
export function readClaims(value: unknown): SessionClaims | null {
  const record = asRecord(value)
  if (record === null) return null
  const { accountId, kind } = record
  if (typeof accountId !== "string" || !isUuid(accountId) || !isAccountKind(kind)) return null
  return { accountId, kind }
}
