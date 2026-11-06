import { describe, expect, it } from "vitest"
import { includesNormalized, normalize } from "@/core/text"

describe("normalize", () => {
  it("lowercases, strips accents and collapses whitespace", () => {
    expect(normalize("  Comissão   do\tPLANO\nBásico  ")).toBe("comissao do plano basico")
  })

  it("keeps digits and punctuation", () => {
    expect(normalize("CPF 123.456.789-09?")).toBe("cpf 123.456.789-09?")
  })

  it("handles cedilla and tilde", () => {
    expect(normalize("Ação, Informação, Horário")).toBe("acao, informacao, horario")
  })

  it("returns an empty string for blank input", () => {
    expect(normalize("   \n\t ")).toBe("")
  })
})

describe("includesNormalized", () => {
  it("ignores case, accents and extra spaces", () => {
    expect(includesNormalized("Olá!  NÃO   encontrei essa info.", "nao encontrei essa")).toBe(true)
  })

  it("returns false when the needle is absent", () => {
    expect(includesNormalized("O repasse cai na conta.", "cancelamento")).toBe(false)
  })

  it("returns false for an empty needle", () => {
    expect(includesNormalized("qualquer texto", "   ")).toBe(false)
  })
})
