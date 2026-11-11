import { describe, expect, it } from "vitest"
import { isUf, STATES } from "@/lib/profile/states"

describe("STATES", () => {
  it("has the 27 federative units with unique abbreviations and IBGE codes", () => {
    expect(STATES).toHaveLength(27)
    expect(new Set(STATES.map((s) => s.uf)).size).toBe(27)
    expect(new Set(STATES.map((s) => s.ibgeCode)).size).toBe(27)
  })

  it("uses two uppercase letters and the IBGE code of Rio de Janeiro", () => {
    for (const s of STATES) expect(s.uf).toMatch(/^[A-Z]{2}$/)
    expect(STATES.find((s) => s.uf === "RJ")?.ibgeCode).toBe(33)
  })
})

describe("isUf", () => {
  it("accepts known abbreviations only", () => {
    expect(isUf("SP")).toBe(true)
    expect(isUf("sp")).toBe(false)
    expect(isUf("XX")).toBe(false)
    expect(isUf(35)).toBe(false)
    expect(isUf(undefined)).toBe(false)
  })
})
