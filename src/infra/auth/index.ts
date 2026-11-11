import "server-only"
import NextAuth, { AuthError } from "next-auth"
import type { AccountRecord } from "@/core/types"
import { readClaims } from "@/infra/auth/callbacks"
import { buildAuthConfig, DemoLimitError } from "@/infra/auth/config"
import { readGoogleCredentials } from "@/infra/auth/env"
import { getContainer } from "@/infra/container"

// The only entry point to Auth.js: src/app imports this module, never next-auth itself.
export const { handlers, auth, signIn, signOut } = NextAuth(() => buildAuthConfig())

// Confirms on every call that the account still exists and, for a demo, has not expired, so a
// deleted or expired account stops working even with a valid cookie.
export async function getAuthenticatedAccount(): Promise<AccountRecord | null> {
  const session = await auth()
  const claims = readClaims(session)
  return claims ? getContainer().accounts.findActive(claims.accountId, new Date()) : null
}

export function isGoogleEnabled(): boolean {
  return readGoogleCredentials(process.env) !== null
}

export function isDemoLimitError(error: unknown): boolean {
  return error instanceof DemoLimitError
}

export function isAuthError(error: unknown): boolean {
  return error instanceof AuthError
}
