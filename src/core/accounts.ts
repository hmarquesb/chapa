import "server-only"
import type { AppConfig } from "@/config"
import { windowStarts } from "@/core/request-limits"
import type { AccountRecord, AccountRepository, RateLimitRepository } from "@/core/types"
import type { RestaurantProfile } from "@/lib/types"

// Perfil de exemplo de toda conta demo. Cada demo recebe uma cópia (`{ ...DEMO_PROFILE }`).
export const DEMO_PROFILE: Readonly<Required<RestaurantProfile>> = Object.freeze({
  version: 2,
  name: "Marmitaria Boa Panela",
  plan: "misto",
  cuisine: Object.freeze({ id: "marmita" }),
  location: Object.freeze({ uf: "RJ", cityCode: 3304557 }),
  hours: "11h às 15h e 18h às 23h",
})

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
  profile: RestaurantProfile
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
