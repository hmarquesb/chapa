import { describe, expect, it } from "vitest"
import { FALLBACK_MESSAGE } from "@/core/messages"
import {
  buildRagPrompt,
  buildSystemInstruction,
  formatProfile,
  formatTranscript,
  REWRITE_PROMPT,
  SUMMARY_PROMPT,
  SYSTEM_PROMPT,
} from "@/core/prompts"
import type { RetrievedChunk } from "@/core/types"

function chunk(id: number, source: string, section: string, content: string): RetrievedChunk {
  return { id, source, section, content, semantic: 0.8, keyword: 0.5, score: 0.71 }
}

const RESULTS = [
  chunk(1, "02-repasse-financeiro.md", "Ciclo de repasse", "O repasse segue um ciclo."),
  chunk(2, "01-planos-e-taxas.md", "", "Os planos têm taxas diferentes."),
]

describe("SYSTEM_PROMPT", () => {
  it("contains the exact fallback message and the key rules", () => {
    expect(SYSTEM_PROMPT).toContain(FALLBACK_MESSAGE)
    expect(SYSTEM_PROMPT).toMatch(/já são parceiros/)
    expect(SYSTEM_PROMPT).toMatch(/150 palavras/)
    expect(SYSTEM_PROMPT).toMatch(/CPF/)
  })
})

describe("formatProfile", () => {
  it("returns one line per filled field", () => {
    const text = formatProfile({ name: "X", city: "SP" })
    expect(text.split("\n")).toEqual(["Nome: X", "Cidade: SP"])
  })

  it("uses every label in the PROFILE_FIELDS order", () => {
    const text = formatProfile({
      hours: "18h às 23h",
      cuisine: "Pizza",
      plan: "Plano Básico",
      city: "São Paulo",
      name: "Pizzaria Bella",
    })
    expect(text).toBe(
      [
        "Nome: Pizzaria Bella",
        "Plano: Plano Básico",
        "Cozinha: Pizza",
        "Cidade: São Paulo",
        "Horário: 18h às 23h",
      ].join("\n"),
    )
  })

  it("returns an empty string for an empty profile or blank values", () => {
    expect(formatProfile({})).toBe("")
    expect(formatProfile({ name: "   ", city: "" })).toBe("")
  })

  it("trims values", () => {
    expect(formatProfile({ name: "  Bella  " })).toBe("Nome: Bella")
  })
})

describe("buildSystemInstruction", () => {
  it("equals SYSTEM_PROMPT without profile and summary", () => {
    expect(buildSystemInstruction({ profile: {}, summary: null })).toBe(SYSTEM_PROMPT)
    expect(buildSystemInstruction({ profile: { name: " " }, summary: "  " })).toBe(SYSTEM_PROMPT)
  })

  it("appends the profile and summary blocks", () => {
    const text = buildSystemInstruction({
      profile: { name: "Pizzaria Bella", plan: "Plano Básico" },
      summary: "O parceiro perguntou sobre repasse.",
    })
    expect(text.startsWith(SYSTEM_PROMPT)).toBe(true)
    expect(text).toContain("Perfil do restaurante:\nNome: Pizzaria Bella\nPlano: Plano Básico")
    expect(text).toContain("Resumo da conversa até aqui:\nO parceiro perguntou sobre repasse.")
    expect(text.indexOf("Perfil do restaurante:")).toBeLessThan(
      text.indexOf("Resumo da conversa até aqui:"),
    )
  })

  it("only adds the summary when there is no profile", () => {
    const text = buildSystemInstruction({ profile: {}, summary: "Resumo." })
    expect(text).not.toContain("Perfil do restaurante")
    expect(text).toContain("Resumo da conversa até aqui:\nResumo.")
  })
})

describe("buildRagPrompt", () => {
  const prompt = buildRagPrompt("Quando cai o repasse?", RESULTS)

  it("labels every chunk, with or without section", () => {
    expect(prompt).toContain("[Fonte: 02-repasse-financeiro.md › Ciclo de repasse]")
    expect(prompt).toContain("[Fonte: 01-planos-e-taxas.md]")
    expect(prompt).toContain("O repasse segue um ciclo.")
    expect(prompt).toContain("Os planos têm taxas diferentes.")
  })

  it("separates the chunks with ---", () => {
    const first = prompt.indexOf("[Fonte: 02-repasse-financeiro.md")
    const second = prompt.indexOf("[Fonte: 01-planos-e-taxas.md]")
    expect(prompt.slice(first, second)).toContain("\n---\n")
  })

  it("contains the exact fallback message and ends with the question", () => {
    expect(prompt).toContain(FALLBACK_MESSAGE)
    expect(prompt.trimEnd().endsWith("Quando cai o repasse?")).toBe(true)
  })

  it("includes two few-shot examples", () => {
    expect(prompt).toMatch(/Exemplo 1/)
    expect(prompt).toMatch(/Exemplo 2/)
  })
})

describe("REWRITE_PROMPT and SUMMARY_PROMPT", () => {
  it("asks for a standalone question only", () => {
    expect(REWRITE_PROMPT).toMatch(/autossuficiente/)
    expect(REWRITE_PROMPT).toMatch(/só a pergunta/i)
  })

  it("asks for a paragraph of at most 120 words without sensitive data", () => {
    expect(SUMMARY_PROMPT).toMatch(/120 palavras/)
    expect(SUMMARY_PROMPT).toMatch(/sensíve/)
  })
})

describe("formatTranscript", () => {
  it("labels partner and assistant messages", () => {
    expect(
      formatTranscript([
        { role: "user", content: "Oi" },
        { role: "assistant", content: "Olá!" },
      ]),
    ).toBe("Parceiro: Oi\nAssistente: Olá!")
  })
})
