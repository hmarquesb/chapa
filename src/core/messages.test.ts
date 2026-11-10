import { describe, expect, it } from "vitest"
import { BLOCKED_INPUT_MESSAGES, BLOCKED_OUTPUT_MESSAGE, FALLBACK_MESSAGE } from "@/core/messages"

describe("fixed messages", () => {
  it("point the partner to the Painel Rango", () => {
    expect(FALLBACK_MESSAGE.endsWith("Painel Rango.")).toBe(true)
    expect(BLOCKED_INPUT_MESSAGES.credential_request.endsWith("Painel Rango.")).toBe(true)
    expect(BLOCKED_OUTPUT_MESSAGE.endsWith("Painel Rango.")).toBe(true)
  })

  it("never mention the old Portal do Parceiro", () => {
    const texts = [
      FALLBACK_MESSAGE,
      BLOCKED_OUTPUT_MESSAGE,
      ...Object.values(BLOCKED_INPUT_MESSAGES),
    ]
    for (const text of texts) {
      expect(text.toLowerCase()).not.toContain("portal do parceiro")
    }
  })
})
