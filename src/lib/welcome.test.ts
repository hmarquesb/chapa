import { describe, expect, it } from "vitest"
import { shouldOpenWelcome, WELCOME_TOPICS } from "./welcome"

describe("shouldOpenWelcome", () => {
  it("always opens for a demo account", () => {
    expect(shouldOpenWelcome({ isDemo: true, welcomeSeenAt: null })).toBe(true)
    expect(shouldOpenWelcome({ isDemo: true, welcomeSeenAt: new Date() })).toBe(true)
  })

  it("opens for a Google account that never closed it", () => {
    expect(shouldOpenWelcome({ isDemo: false, welcomeSeenAt: null })).toBe(true)
  })

  it("does not open for a Google account that already closed it", () => {
    expect(shouldOpenWelcome({ isDemo: false, welcomeSeenAt: new Date() })).toBe(false)
  })
})

describe("WELCOME_TOPICS", () => {
  it("lists the six topics", () => {
    expect(WELCOME_TOPICS).toHaveLength(6)
  })
})
