import { describe, expect, it } from "vitest"
import { addUsage, emptyUsage } from "@/core/usage"

describe("emptyUsage", () => {
  it("returns zeroed usage", () => {
    expect(emptyUsage()).toEqual({ calls: 0, inputTokens: 0, outputTokens: 0 })
  })

  it("returns a new object on each call", () => {
    const a = emptyUsage()
    a.calls = 5
    expect(emptyUsage().calls).toBe(0)
  })
})

describe("addUsage", () => {
  it("sums field by field", () => {
    expect(
      addUsage(
        { calls: 1, inputTokens: 10, outputTokens: 5 },
        { calls: 2, inputTokens: 1, outputTokens: 1 },
      ),
    ).toEqual({ calls: 3, inputTokens: 11, outputTokens: 6 })
  })

  it("returns empty usage when called without arguments", () => {
    expect(addUsage()).toEqual({ calls: 0, inputTokens: 0, outputTokens: 0 })
  })

  it("does not mutate its arguments", () => {
    const a = { calls: 1, inputTokens: 2, outputTokens: 3 }
    addUsage(a, a)
    expect(a).toEqual({ calls: 1, inputTokens: 2, outputTokens: 3 })
  })
})
