import { createHmac } from "node:crypto"
import type { RateLimitRepository } from "@/core/types"

const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS

function firstValue(raw: string | null): string {
  return raw?.split(",")[0]?.trim() ?? ""
}

// On Vercel both headers are set by the platform. Locally they are usually absent, so every
// request shares the "unknown" bucket.
export function getClientIp(headers: Headers): string {
  const forwarded = firstValue(headers.get("x-forwarded-for"))
  if (forwarded !== "") return forwarded
  const real = firstValue(headers.get("x-real-ip"))
  return real !== "" ? real : "unknown"
}

// The IP is only ever stored as this HMAC, never in clear text.
export function hashIp(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(ip).digest("hex")
}

export function windowStarts(now: Date): { minute: Date; day: Date } {
  const ms = now.getTime()
  return {
    minute: new Date(ms - (ms % MINUTE_MS)),
    day: new Date(ms - (ms % DAY_MS)),
  }
}

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
    ipHash: input.ipHash,
    bucket: "minute",
    windowStart: minute,
  })
  const dayCount = await input.repo.hit({ ipHash: input.ipHash, bucket: "day", windowStart: day })

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
