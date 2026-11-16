import { describe, expect, it } from "vitest"
import { progressLabel } from "@/lib/progress-steps"

describe("progressLabel", () => {
  it("names the first three steps", () => {
    expect(progressLabel({ step: "history" })).toBe("Lendo a conversa")
    expect(progressLabel({ step: "understanding" })).toBe("Entendendo a pergunta")
    expect(progressLabel({ step: "searching" })).toBe("Buscando na base de conhecimento")
  })

  it("counts the documents of the writing step, in the plural", () => {
    expect(progressLabel({ step: "writing", documents: 2 })).toBe(
      "Escrevendo a resposta com base em 2 documentos",
    )
    expect(progressLabel({ step: "writing", documents: 0 })).toBe(
      "Escrevendo a resposta com base em 0 documentos",
    )
  })

  it("uses the singular with one document", () => {
    expect(progressLabel({ step: "writing", documents: 1 })).toBe(
      "Escrevendo a resposta com base em 1 documento",
    )
  })
})
