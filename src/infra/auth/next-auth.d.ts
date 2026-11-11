import "server-only"
import type { AccountKind } from "@/core/types"

// Only the account id and kind travel in the session and in the JWT (src/infra/auth/callbacks.ts).
declare module "next-auth" {
  interface Session {
    accountId?: string
    kind?: AccountKind
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accountId?: string
    kind?: AccountKind
  }
}
