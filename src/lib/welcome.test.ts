import { describe, expect, it } from "vitest"
import {
  shouldOpenWelcome,
  WELCOME_KNOWLEDGE_BASE,
  WELCOME_PARAGRAPHS,
  WELCOME_TOPICS,
} from "./welcome"

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

describe("WELCOME_PARAGRAPHS", () => {
  it("names the RAG technique in the second paragraph", () => {
    expect(WELCOME_PARAGRAPHS[1]).toBe(
      "O Chapa é o assistente desses parceiros. Ele tira dúvidas sobre a operação do restaurante com base nas regras da Rango e mostra de onde tirou cada resposta, usando a técnica de RAG: antes de responder, ele busca os trechos certos na base de conhecimento.",
    )
  })
})

describe("WELCOME_KNOWLEDGE_BASE", () => {
  it("reads as the last line of the card", () => {
    const { before, link, after } = WELCOME_KNOWLEDGE_BASE
    expect(link).toBe("Base de conhecimento")
    expect(`${before}${link}${after}`).toBe(
      "Quer ver o que ele consulta? Abra a Base de conhecimento.",
    )
  })
})
