import "server-only"
import type { AppConfig } from "@/config"
import { windowStarts } from "@/core/request-limits"
import type { AccountRecord, AccountRepository, RateLimitRepository } from "@/core/types"
import type { RestaurantProfile } from "@/lib/types"

const DAY_MS = 24 * 60 * 60 * 1000

export type DemoAccountResult =
  | { ok: true; account: AccountRecord }
  | { ok: false; reason: "demo_limit" }

// Counts the attempt in the demo_day bucket (UTC day window), refused ones included, and only
// creates the account while the count stays within limits.demoAccountsPerIpPerDay.
// expiresAt = now + limits.demoTtlDays.
export async function createDemoAccount(input: {
  ipHash: string
  now: Date
  accounts: Pick<AccountRepository, "createDemo">
  rateLimits: Pick<RateLimitRepository, "hit">
  limits: AppConfig["accounts"]
  profile: RestaurantProfile // {} nesta change; o perfil de exemplo entra na change 3
}): Promise<DemoAccountResult> {
  const { day } = windowStarts(input.now)
  const count = await input.rateLimits.hit({
    key: input.ipHash,
    bucket: "demo_day",
    windowStart: day,
  })
  if (count > input.limits.demoAccountsPerIpPerDay) return { ok: false, reason: "demo_limit" }

  const account = await input.accounts.createDemo({
    expiresAt: new Date(input.now.getTime() + input.limits.demoTtlDays * DAY_MS),
    profile: input.profile,
  })
  return { ok: true, account }
}
