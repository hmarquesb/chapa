import { describe, expect, it } from "vitest"
import { findCitiesByName, findCity, loadCities } from "@/lib/profile/cities"
import { CITY_COUNT, CITY_LOADERS } from "@/lib/profile/cities/index"
import { UFS } from "@/lib/profile/states"

describe("loadCities", () => {
  it("returns the cities of a UF in alphabetical order", async () => {
    const cities = await loadCities("RJ")
    expect(cities).toContainEqual({ code: 3304557, name: "Rio de Janeiro", uf: "RJ" })
    const names = cities.map((c) => c.name)
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "pt-BR")))
  })

  it("sums to CITY_COUNT across all UFs", async () => {
    const all = await Promise.all(UFS.map((uf) => loadCities(uf)))
    expect(all.reduce((sum, list) => sum + list.length, 0)).toBe(CITY_COUNT)
    expect(Object.keys(CITY_LOADERS)).toHaveLength(27)
  })
})

describe("findCity", () => {
  it("finds Rio de Janeiro in RJ", async () => {
    expect(await findCity("RJ", 3304557)).toEqual({
      code: 3304557,
      name: "Rio de Janeiro",
      uf: "RJ",
    })
  })

  it("returns null for a code from another UF or an unknown code", async () => {
    expect(await findCity("SP", 3304557)).toBeNull()
    expect(await findCity("RJ", 1)).toBeNull()
  })
})

describe("findCitiesByName", () => {
  it("returns more than one city for an ambiguous name", async () => {
    const found = await findCitiesByName("Bom Jesus")
    expect(found.length).toBeGreaterThan(1)
    expect(found.every((c) => c.name === "Bom Jesus")).toBe(true)
  })

  it("ignores accents and case", async () => {
    const found = await findCitiesByName("niteroi")
    expect(found).toEqual([{ code: 3303302, name: "Niterói", uf: "RJ" }])
  })

  it("returns an empty list when nothing matches", async () => {
    expect(await findCitiesByName("Cidade Inexistente")).toEqual([])
    expect(await findCitiesByName("  ")).toEqual([])
  })
})
