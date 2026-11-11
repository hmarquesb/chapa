import { describe, expect, it } from "vitest"
import { getClientIp, hashIp, windowStarts } from "@/core/request-limits"

describe("getClientIp", () => {
  it("uses the first x-forwarded-for value, trimmed", () => {
    const headers = new Headers({
      "x-forwarded-for": " 203.0.113.7 , 10.0.0.1",
      "x-real-ip": "1.1.1.1",
    })
    expect(getClientIp(headers)).toBe("203.0.113.7")
  })

  it("falls back to x-real-ip, then to unknown", () => {
    expect(getClientIp(new Headers({ "x-real-ip": " 198.51.100.2 " }))).toBe("198.51.100.2")
    expect(
      getClientIp(new Headers({ "x-forwarded-for": " , ", "x-real-ip": "198.51.100.2" })),
    ).toBe("198.51.100.2")
    expect(getClientIp(new Headers())).toBe("unknown")
  })
})

describe("hashIp", () => {
  it("is a deterministic HMAC-SHA256 in hex that depends on the secret", () => {
    const a = hashIp("1.2.3.4", "s")
    expect(a).toBe(hashIp("1.2.3.4", "s"))
    expect(a).toMatch(/^[0-9a-f]{64}$/)
    expect(a).not.toBe(hashIp("1.2.3.4", "t"))
    expect(a).not.toBe(hashIp("1.2.3.5", "s"))
    expect(a).not.toContain("1.2.3.4")
  })
})

describe("windowStarts", () => {
  it("truncates to the UTC minute and the UTC day", () => {
    const { minute, day } = windowStarts(new Date("2026-11-06T23:59:42.123Z"))
    expect(minute.toISOString()).toBe("2026-11-06T23:59:00.000Z")
    expect(day.toISOString()).toBe("2026-11-06T00:00:00.000Z")
  })
})
