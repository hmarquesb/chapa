import { describe, expect, it } from "vitest"
import { matchesSearch, normalizeSearch } from "@/lib/profile/search"

describe("normalizeSearch", () => {
  it("removes accents, lowers case and collapses spaces", () => {
    expect(normalizeSearch("  Açaí   NA  Tigela ")).toBe("acai na tigela")
  })

  it("returns an empty string for blank text", () => {
    expect(normalizeSearch("   ")).toBe("")
  })
})

describe("matchesSearch", () => {
  it("ignores accents and case", () => {
    expect(matchesSearch("Árabe", "arabe")).toBe(true)
    expect(matchesSearch("Pizza", "PIZ")).toBe(true)
  })

  it("matches a substring anywhere in the label", () => {
    expect(matchesSearch("Marmita e comida caseira", "comida")).toBe(true)
  })

  it("accepts an empty query", () => {
    expect(matchesSearch("Pizza", "  ")).toBe(true)
  })

  it("rejects a query that is not in the label", () => {
    expect(matchesSearch("Pizza", "sushi")).toBe(false)
  })
})
