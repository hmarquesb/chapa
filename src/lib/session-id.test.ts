import { describe, expect, it } from "vitest"
import { isUuid } from "@/lib/session-id"

const A = "3f1c2b8e-9a4d-4c1e-8f7a-1b2c3d4e5f60"

describe("isUuid", () => {
  it("accepts canonical UUIDs in any case", () => {
    expect(isUuid(A)).toBe(true)
    expect(isUuid(A.toUpperCase())).toBe(true)
  })

  it("rejects anything that is not a UUID", () => {
    expect(isUuid("")).toBe(false)
    expect(isUuid("abc")).toBe(false)
    expect(isUuid(`${A}x`)).toBe(false)
    expect(isUuid(` ${A}`)).toBe(false)
    expect(isUuid(A.replaceAll("-", ""))).toBe(false)
    expect(isUuid("3f1c2b8e-9a4d-4c1e-8f7a-1b2c3d4e5fzz")).toBe(false)
  })
})
