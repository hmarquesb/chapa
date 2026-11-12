import { describe, expect, it } from "vitest"
import {
  BLOCKED_INPUT_MESSAGES,
  BLOCKED_OUTPUT_MESSAGE,
  FALLBACK_MESSAGE,
  greetingReply,
} from "@/core/messages"
import type { GreetingKind } from "@/core/router/greeting"

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

describe("greetingReply", () => {
  const openings: Array<[GreetingKind, string]> = [
    ["bom_dia", "Bom dia"],
    ["boa_tarde", "Boa tarde"],
    ["boa_noite", "Boa noite"],
    ["neutro", "Olá"],
  ]

  it.each(openings)("greets with the name for %s", (kind, opening) => {
    expect(greetingReply({ kind, asksHowAreYou: false }, "Marmitaria Boa Panela")).toBe(
      `${opening}, Marmitaria Boa Panela! Em que posso ajudar?`,
    )
  })

  it.each(openings)("greets without the name for %s", (kind, opening) => {
    expect(greetingReply({ kind, asksHowAreYou: false }, undefined)).toBe(
      `${opening}! Em que posso ajudar?`,
    )
  })

  it("adds the well-being sentence only when asked, with and without the name", () => {
    expect(greetingReply({ kind: "neutro", asksHowAreYou: true }, "Cantina da Nonna")).toBe(
      "Olá, Cantina da Nonna! Tudo certo por aqui. Em que posso ajudar?",
    )
    expect(greetingReply({ kind: "boa_noite", asksHowAreYou: true }, undefined)).toBe(
      "Boa noite! Tudo certo por aqui. Em que posso ajudar?",
    )
  })

  it("ignores a blank name", () => {
    expect(greetingReply({ kind: "bom_dia", asksHowAreYou: false }, "  ")).toBe(
      "Bom dia! Em que posso ajudar?",
    )
  })
})
