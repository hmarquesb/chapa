import { windowStarts } from "@/core/request-limits"
import type { AccountKind, RateLimitRepository } from "@/core/types"

const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS

function secondsUntil(end: number, now: Date): number {
  return Math.max(1, Math.ceil((end - now.getTime()) / 1000))
}

// Fixed windows in Postgres: every request (allowed or not) counts in both buckets.
export async function checkRateLimit(input: {
  ipHash: string
  now: Date
  repo: RateLimitRepository
  perMinute: number
  perDay: number
}): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const { minute, day } = windowStarts(input.now)
  const minuteCount = await input.repo.hit({
    key: input.ipHash,
    bucket: "minute",
    windowStart: minute,
  })
  const dayCount = await input.repo.hit({ key: input.ipHash, bucket: "day", windowStart: day })

  if (minuteCount > input.perMinute) {
    return {
      allowed: false,
      retryAfterSeconds: secondsUntil(minute.getTime() + MINUTE_MS, input.now),
    }
  }
  if (dayCount > input.perDay) {
    return { allowed: false, retryAfterSeconds: secondsUntil(day.getTime() + DAY_MS, input.now) }
  }
  return { allowed: true }
}

// Daily cap per account (UTC day), counted after the IP limit lets the request through.
export async function checkAccountDailyLimit(input: {
  accountId: string
  kind: AccountKind
  now: Date
  repo: RateLimitRepository
  limits: { google: number; demo: number }
}): Promise<{ allowed: true } | { allowed: false; retryAfterSeconds: number }> {
  const { day } = windowStarts(input.now)
  const count = await input.repo.hit({
    key: input.accountId,
    bucket: "account_day",
    windowStart: day,
  })
  if (count > input.limits[input.kind]) {
    return { allowed: false, retryAfterSeconds: secondsUntil(day.getTime() + DAY_MS, input.now) }
  }
  return { allowed: true }
}
