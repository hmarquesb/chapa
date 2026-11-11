import { describe, expect, it } from "vitest"
import { loadConfig } from "@/config"
import { conversationTitle, sessionCleanupCutoffs } from "@/core/conversations"

describe("conversationTitle", () => {
  it("keeps short text intact", () => {
    expect(conversationTitle("Como funciona o repasse?", 60)).toBe("Como funciona o repasse?")
  })

  it("trims and collapses whitespace", () => {
    expect(conversationTitle("  Qual \n  a   taxa\t do plano? ", 60)).toBe("Qual a taxa do plano?")
  })

  it("cuts long text at maxChars with an ellipsis and no space before it", () => {
    const text = `${"palavra ".repeat(11)}fim`
    const title = conversationTitle(text, 60)
    expect(title.endsWith("…")).toBe(true)
    expect(title).not.toMatch(/\s…$/)
    expect(title.length).toBeLessThanOrEqual(61)
    expect(title).toBe(`${text.slice(0, 60).trimEnd()}…`)
  })

  it("cuts 80 characters down to 60 plus the ellipsis", () => {
    const title = conversationTitle("a".repeat(80), 60)
    expect(title).toBe(`${"a".repeat(60)}…`)
  })

  it("does not cut text of exactly maxChars", () => {
    expect(conversationTitle("a".repeat(60), 60)).toBe("a".repeat(60))
  })

  it("turns empty text into the placeholder", () => {
    expect(conversationTitle("", 60)).toBe("Conversa sem título")
    expect(conversationTitle("  \n ", 60)).toBe("Conversa sem título")
  })
})

describe("sessionCleanupCutoffs", () => {
  it("uses 30 days for web and 7 for the other channels", () => {
    const now = new Date("2026-11-11T12:00:00.000Z")
    const { webBefore, otherBefore } = sessionCleanupCutoffs(now, loadConfig({}))
    expect(webBefore.toISOString()).toBe("2026-10-12T12:00:00.000Z")
    expect(otherBefore.toISOString()).toBe("2026-11-04T12:00:00.000Z")
  })
})
