import { describe, expect, it } from "vitest"
import { config } from "@/config"
import { createDemoAccount, DEMO_PROFILE } from "@/core/accounts"
import type { AccountRecord, RateLimitBucket } from "@/core/types"
import { findCity } from "@/lib/profile/cities"
import { parseProfileInput } from "@/lib/profile/parse"
import type { RestaurantProfile } from "@/lib/types"

const NOW = new Date("2026-11-06T21:30:00.000Z")
const IP_HASH = "a".repeat(64)

class FakeAccounts {
  created: Array<{ expiresAt: Date; profile: object }> = []

  async createDemo(input: { expiresAt: Date; profile: object }): Promise<AccountRecord> {
    this.created.push(input)
    return {
      id: `00000000-0000-4000-8000-00000000000${this.created.length}`,
      kind: "demo",
      email: null,
      profile: { version: 2 },
      profileNeedsReview: false,
      createdAt: NOW,
      lastSeenAt: NOW,
      expiresAt: input.expiresAt,
    }
  }
}

class FakeRateLimits {
  calls: Array<{ key: string; bucket: RateLimitBucket; windowStart: Date }> = []
  counts = new Map<string, number>()

  async hit(input: { key: string; bucket: RateLimitBucket; windowStart: Date }) {
    this.calls.push(input)
    const id = `${input.key}|${input.bucket}|${input.windowStart.toISOString()}`
    const count = (this.counts.get(id) ?? 0) + 1
    this.counts.set(id, count)
    return count
  }
}

function setup(profile: RestaurantProfile = { version: 2 }) {
  const accounts = new FakeAccounts()
  const rateLimits = new FakeRateLimits()
  const run = (now = NOW, ipHash = IP_HASH) =>
    createDemoAccount({
      ipHash,
      now,
      accounts,
      rateLimits,
      limits: config.accounts,
      profile,
    })
  return { accounts, rateLimits, run }
}

describe("createDemoAccount", () => {
  it("creates up to 5 accounts and refuses the 6th without calling createDemo", async () => {
    const { accounts, run } = setup()
    for (let i = 1; i <= 5; i += 1) {
      const result = await run()
      expect(result.ok).toBe(true)
    }
    expect(await run()).toEqual({ ok: false, reason: "demo_limit" })
    expect(accounts.created).toHaveLength(5)
  })

  it("sets expiresAt to now + 7 days and passes the profile", async () => {
    const { accounts, run } = setup()
    const result = await run()
    expect(result.ok && result.account.expiresAt).toEqual(new Date("2026-11-13T21:30:00.000Z"))
    expect(accounts.created).toEqual([
      { expiresAt: new Date("2026-11-13T21:30:00.000Z"), profile: { version: 2 } },
    ])
  })

  it("stores a copy of DEMO_PROFILE, not the frozen object", async () => {
    const { accounts, run } = setup({ ...DEMO_PROFILE })
    await run()
    const stored = accounts.created[0]?.profile as Record<string, string>
    expect(stored).toEqual(DEMO_PROFILE)
    expect(stored).not.toBe(DEMO_PROFILE)
    expect(Object.isFrozen(stored)).toBe(false)
    stored.name = "Outra"
    expect(DEMO_PROFILE.name).toBe("Marmitaria Boa Panela")
  })

  it("DEMO_PROFILE is frozen and has the plan misto", () => {
    expect(Object.isFrozen(DEMO_PROFILE)).toBe(true)
    expect(DEMO_PROFILE.plan).toBe("misto")
  })

  it("DEMO_PROFILE is a valid v2 profile with the Marmita cuisine and the Rio de Janeiro city", async () => {
    expect(await parseProfileInput(DEMO_PROFILE, { requirePlan: true })).toEqual({
      ok: true,
      value: DEMO_PROFILE,
    })
    expect(DEMO_PROFILE.cuisine).toEqual({ id: "marmita" })
    expect(DEMO_PROFILE.location).toEqual({ uf: "RJ", cityCode: 3304557 })
    expect((await findCity("RJ", 3304557))?.name).toBe("Rio de Janeiro")
  })

  it("counts in the demo_day bucket, keyed by the IP hash, in the UTC day window", async () => {
    const { rateLimits, run } = setup()
    await run()
    expect(rateLimits.calls).toEqual([
      { key: IP_HASH, bucket: "demo_day", windowStart: new Date("2026-11-06T00:00:00.000Z") },
    ])
  })

  it("starts a new count on the next UTC day and keeps IPs independent", async () => {
    const { run } = setup()
    for (let i = 0; i < 6; i += 1) await run()
    expect((await run()).ok).toBe(false)
    expect((await run(NOW, "b".repeat(64))).ok).toBe(true)
    expect((await run(new Date("2026-11-07T00:00:00.000Z"))).ok).toBe(true)
  })
})
