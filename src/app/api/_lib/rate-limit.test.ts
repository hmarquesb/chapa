import { describe, expect, it } from "vitest"
import { checkRateLimit } from "@/app/api/_lib/rate-limit"
import type { RateLimitBucket, RateLimitRepository } from "@/core/types"

class MemoryRateLimits implements RateLimitRepository {
  counts = new Map<string, number>()
  hits = 0

  async hit(input: { key: string; bucket: RateLimitBucket; windowStart: Date }) {
    this.hits += 1
    const key = `${input.key}|${input.bucket}|${input.windowStart.toISOString()}`
    const count = (this.counts.get(key) ?? 0) + 1
    this.counts.set(key, count)
    return count
  }

  async deleteBefore(): Promise<number> {
    return 0
  }
}

describe("checkRateLimit", () => {
  const base = { perMinute: 10, perDay: 100 }

  it("allows 10 requests in a minute and denies the 11th until the next minute", async () => {
    const repo = new MemoryRateLimits()
    const now = new Date("2026-11-06T12:00:15.000Z")
    for (let i = 1; i <= 10; i += 1) {
      await expect(checkRateLimit({ ...base, ipHash: "a", now, repo })).resolves.toEqual({
        allowed: true,
      })
    }
    await expect(checkRateLimit({ ...base, ipHash: "a", now, repo })).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 45,
    })
    const nextMinute = new Date("2026-11-06T12:01:00.000Z")
    await expect(checkRateLimit({ ...base, ipHash: "a", now: nextMinute, repo })).resolves.toEqual({
      allowed: true,
    })
  })

  it("rounds Retry-After up and never returns less than 1 second", async () => {
    const repo = new MemoryRateLimits()
    const now = new Date("2026-11-06T12:00:59.600Z")
    for (let i = 1; i <= 10; i += 1) await checkRateLimit({ ...base, ipHash: "a", now, repo })
    await expect(checkRateLimit({ ...base, ipHash: "a", now, repo })).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 1,
    })
  })

  it("keeps different IPs independent", async () => {
    const repo = new MemoryRateLimits()
    const now = new Date("2026-11-06T12:00:00.000Z")
    for (let i = 1; i <= 10; i += 1) await checkRateLimit({ ...base, ipHash: "a", now, repo })
    expect((await checkRateLimit({ ...base, ipHash: "a", now, repo })).allowed).toBe(false)
    expect((await checkRateLimit({ ...base, ipHash: "b", now, repo })).allowed).toBe(true)
  })

  it("denies the 101st request of the day until midnight UTC", async () => {
    const repo = new MemoryRateLimits()
    const start = Date.parse("2026-11-06T20:00:00.000Z")
    for (let i = 0; i < 100; i += 1) {
      const now = new Date(start + Math.floor(i / 10) * 60_000)
      expect((await checkRateLimit({ ...base, ipHash: "a", now, repo })).allowed).toBe(true)
    }
    const now = new Date("2026-11-06T20:30:00.000Z")
    await expect(checkRateLimit({ ...base, ipHash: "a", now, repo })).resolves.toEqual({
      allowed: false,
      retryAfterSeconds: 3.5 * 3600,
    })
    const tomorrow = new Date("2026-11-07T00:00:00.000Z")
    expect((await checkRateLimit({ ...base, ipHash: "a", now: tomorrow, repo })).allowed).toBe(true)
  })

  it("hits both the minute and the day buckets", async () => {
    const repo = new MemoryRateLimits()
    await checkRateLimit({ ...base, ipHash: "a", now: new Date(), repo })
    expect(repo.hits).toBe(2)
  })
})
