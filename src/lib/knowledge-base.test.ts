import { describe, expect, it } from "vitest"
import {
  documentHref,
  documentSlug,
  isKnowledgeDocument,
  KNOWLEDGE_BASE_PATH,
  KNOWLEDGE_FILE_PATTERN,
} from "./knowledge-base"

describe("KNOWLEDGE_FILE_PATTERN", () => {
  it("accepts only the numbered markdown documents", () => {
    expect(KNOWLEDGE_FILE_PATTERN.test("02-repasse-financeiro.md")).toBe(true)
    expect(KNOWLEDGE_FILE_PATTERN.test("README.md")).toBe(false)
    expect(KNOWLEDGE_FILE_PATTERN.test("regras.yaml")).toBe(false)
    expect(KNOWLEDGE_FILE_PATTERN.test("02-repasse.txt")).toBe(false)
    expect(KNOWLEDGE_FILE_PATTERN.test("2-repasse.md")).toBe(false)
  })
})

describe("isKnowledgeDocument", () => {
  it("follows the same rule as the pattern", () => {
    expect(isKnowledgeDocument("01-planos-e-taxas.md")).toBe(true)
    expect(isKnowledgeDocument("README.md")).toBe(false)
    expect(isKnowledgeDocument("regras.yaml")).toBe(false)
  })
})

describe("documentSlug", () => {
  it("drops the extension from a file name", () => {
    expect(documentSlug("01-planos-e-taxas.md")).toBe("01-planos-e-taxas")
  })

  it("drops the folder from a path", () => {
    expect(documentSlug("knowledge-base/02-repasse-financeiro.md")).toBe("02-repasse-financeiro")
  })
})

describe("documentHref", () => {
  it("points to the document page", () => {
    expect(KNOWLEDGE_BASE_PATH).toBe("/base")
    expect(documentHref("01-planos-e-taxas.md")).toBe("/base/01-planos-e-taxas")
    expect(documentHref("knowledge-base/01-planos-e-taxas.md")).toBe("/base/01-planos-e-taxas")
  })
})
