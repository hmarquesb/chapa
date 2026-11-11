import "server-only"
import { CredentialsSignin, type NextAuthConfig } from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Google from "next-auth/providers/google"
import { config } from "@/config"
import { createDemoAccount, DEMO_PROFILE } from "@/core/accounts"
import { getClientIp, hashIp } from "@/core/request-limits"
import { googleIdentity, readClaims, sessionToken } from "@/infra/auth/callbacks"
import { readGoogleCredentials } from "@/infra/auth/env"
import { getContainer } from "@/infra/container"
import { requireEnv } from "@/infra/env"

const DAY_SECONDS = 24 * 60 * 60

// Auth.js redirects a refused direct callback to /entrar?error=CredentialsSignin&code=demo_limit.
export class DemoLimitError extends CredentialsSignin {
  code = "demo_limit"
}

// Called on the first use of auth(), signIn(), signOut() or the route handlers, never at import
// or build time: only then are AUTH_SECRET, AUTH_GOOGLE_* and the database read.
export function buildAuthConfig(): NextAuthConfig {
  const google = readGoogleCredentials(process.env)

  return {
    secret: requireEnv("AUTH_SECRET"),
    trustHost: true, // behind Vercel or on localhost
    session: { strategy: "jwt", maxAge: config.accounts.sessionMaxAgeDays * DAY_SECONDS },
    pages: { signIn: "/entrar", error: "/entrar" },
    providers: [
      ...(google ? [Google({ clientId: google.clientId, clientSecret: google.clientSecret })] : []),
      Credentials({
        id: "demo",
        name: "Demo",
        credentials: {},
        async authorize(_credentials, request) {
          const { accounts, rateLimits } = getContainer()
          const ipHash = hashIp(getClientIp(request.headers), requireEnv("IP_HASH_SECRET"))
          const result = await createDemoAccount({
            ipHash,
            now: new Date(),
            accounts,
            rateLimits,
            limits: config.accounts,
            profile: { ...DEMO_PROFILE },
          })
          if (!result.ok) throw new DemoLimitError()
          return { id: result.account.id }
        },
      }),
    ],
    callbacks: {
      signIn({ account, profile }) {
        if (account?.provider !== "google") return true
        // Unverified or missing email: Auth.js sends the person to /entrar?error=AccessDenied.
        return googleIdentity({ providerAccountId: account.providerAccountId, profile }) !== null
      },
      async jwt({ token, user, account, profile }) {
        if (account?.provider === "google") {
          const identity = googleIdentity({ providerAccountId: account.providerAccountId, profile })
          if (identity === null) return null
          const record = await getContainer().accounts.upsertGoogle(identity)
          return sessionToken(token, { accountId: record.id, kind: "google" })
        }
        if (account?.provider === "demo" && typeof user?.id === "string") {
          return sessionToken(token, { accountId: user.id, kind: "demo" })
        }
        return token
      },
      session({ session, token }) {
        const claims = readClaims(token)
        // Only the expiry, the account id and the kind: never the name, the email nor the image.
        return {
          expires: session.expires,
          accountId: claims?.accountId,
          kind: claims?.kind,
        }
      },
    },
  }
}
