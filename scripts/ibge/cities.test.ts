import { describe, expect, it } from "vitest"
import { buildCityModules } from "./cities"

const SAMPLE = [
  { id: 3304557, nome: "Rio de Janeiro" },
  { id: 3303302, nome: "Niterói" },
  { id: 3300100, nome: "Angra dos Reis" },
  { id: 3509502, nome: "Campinas" },
  { id: 3550308, nome: "São Paulo" },
]

describe("buildCityModules", () => {
  const modules = buildCityModules(SAMPLE, "2026-11-11")

  it("creates one module per UF that has cities, plus the index", () => {
    expect([...modules.keys()].sort()).toEqual([
      "src/lib/profile/cities/index.ts",
      "src/lib/profile/cities/rj.ts",
      "src/lib/profile/cities/sp.ts",
    ])
  })

  it("takes the UF from the code prefix and sorts names in pt-BR", () => {
    const rj = modules.get("src/lib/profile/cities/rj.ts") ?? ""
    expect(rj.indexOf("Angra dos Reis")).toBeLessThan(rj.indexOf("Niterói"))
    expect(rj.indexOf("Niterói")).toBeLessThan(rj.indexOf("Rio de Janeiro"))
    expect(rj).toContain('[3304557, "Rio de Janeiro"]')
    expect(rj).not.toContain("Campinas")
    const sp = modules.get("src/lib/profile/cities/sp.ts") ?? ""
    expect(sp).toContain('[3509502, "Campinas"]')
  })

  it("writes the count and the date in the index", () => {
    const index = modules.get("src/lib/profile/cities/index.ts") ?? ""
    expect(index).toContain("export const CITY_COUNT = 5")
    expect(index).toContain('export const CITIES_EXTRACTED_AT = "2026-11-11"')
    expect(index).toContain('RJ: () => import("./rj")')
  })

  it("rejects a malformed response", () => {
    expect(() => buildCityModules({}, "2026-11-11")).toThrow()
    expect(() => buildCityModules([{ id: "x", nome: 1 }], "2026-11-11")).toThrow()
  })

  it("rejects a code with an unknown UF prefix", () => {
    expect(() => buildCityModules([{ id: 9900001, nome: "Nowhere" }], "2026-11-11")).toThrow()
  })
})
