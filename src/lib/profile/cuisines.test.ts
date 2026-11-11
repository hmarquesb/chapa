import { describe, expect, it } from "vitest"
import { CUISINE_IDS, CUISINES, cuisineLabel, matchCuisine } from "@/lib/profile/cuisines"

describe("CUISINES", () => {
  it("has the 18 options in order, with unique ids", () => {
    expect(CUISINES.map((c) => c.id)).toEqual([
      "brasileira",
      "marmita",
      "lanches",
      "pizza",
      "japonesa",
      "chinesa",
      "italiana",
      "arabe",
      "nordestina",
      "churrasco",
      "pastel",
      "frutos-do-mar",
      "saudavel",
      "vegetariana",
      "doces",
      "acai",
      "padaria",
      "mexicana",
    ])
    expect([...CUISINE_IDS]).toEqual(CUISINES.map((c) => c.id))
    expect(new Set(CUISINES.map((c) => c.label)).size).toBe(18)
  })

  it("never lets a synonym point to two cuisines", () => {
    const seen = new Map<string, string>()
    for (const c of CUISINES) {
      for (const s of [c.label, ...c.synonyms]) {
        const key = s.toLowerCase()
        expect(seen.get(key) ?? c.id).toBe(c.id)
        seen.set(key, c.id)
      }
    }
  })
})

describe("cuisineLabel", () => {
  it("returns the list label for an id", () => {
    expect(cuisineLabel({ id: "marmita" })).toBe("Marmita e comida caseira")
  })

  it("returns the free text for Outro", () => {
    expect(cuisineLabel({ id: "outro", text: "Tailandesa" })).toBe("Tailandesa")
  })
})

describe("matchCuisine", () => {
  it("matches the label", () => {
    expect(matchCuisine("Marmita e comida caseira")).toBe("marmita")
  })

  it("matches a synonym", () => {
    expect(matchCuisine("Pizzaria")).toBe("pizza")
    expect(matchCuisine("hamburgueria")).toBe("lanches")
    expect(matchCuisine("sushi")).toBe("japonesa")
    expect(matchCuisine("marmitaria")).toBe("marmita")
  })

  it("ignores accents, case and extra spaces", () => {
    expect(matchCuisine("  ARABE ")).toBe("arabe")
    expect(matchCuisine("Açaí")).toBe("acai")
  })

  it("returns null when nothing matches", () => {
    expect(matchCuisine("Tailandesa")).toBeNull()
    expect(matchCuisine("")).toBeNull()
  })
})
