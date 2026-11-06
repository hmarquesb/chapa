import { describe, expect, it } from "vitest"
import {
  hasProfileData,
  PROFILE_STORAGE_KEY,
  parseStoredProfile,
  sanitizeProfile,
} from "@/lib/profile-storage"

describe("PROFILE_STORAGE_KEY", () => {
  it("is the documented key", () => {
    expect(PROFILE_STORAGE_KEY).toBe("chapa:perfil")
  })
})

describe("sanitizeProfile", () => {
  it("keeps only known string fields, trimmed and capped at 60 chars", () => {
    expect(
      sanitizeProfile({ name: "  Bella ", plan: 3, extra: "x", city: "a".repeat(80) }),
    ).toEqual({ name: "Bella", city: "a".repeat(60) })
  })

  it("keeps all five fields when valid", () => {
    const full = {
      name: "Pizzaria Bella",
      plan: "Básico",
      cuisine: "italiana",
      city: "Campinas",
      hours: "18h às 23h",
    }
    expect(sanitizeProfile(full)).toEqual(full)
  })

  it("drops empty and whitespace-only fields", () => {
    expect(sanitizeProfile({ name: "", city: "   ", cuisine: "árabe" })).toEqual({
      cuisine: "árabe",
    })
  })

  it("trims again after cutting so no trailing space is left", () => {
    expect(sanitizeProfile({ name: `${"a".repeat(59)} b` })).toEqual({ name: "a".repeat(59) })
  })

  it("returns an empty profile for non-objects", () => {
    expect(sanitizeProfile(null)).toEqual({})
    expect(sanitizeProfile(undefined)).toEqual({})
    expect(sanitizeProfile("Bella")).toEqual({})
    expect(sanitizeProfile(42)).toEqual({})
    expect(sanitizeProfile(["Bella"])).toEqual({})
  })
})

describe("hasProfileData", () => {
  it("is true when at least one field survives sanitizing", () => {
    expect(hasProfileData({ city: "Recife" })).toBe(true)
  })

  it("is false for empty or blank profiles", () => {
    expect(hasProfileData({})).toBe(false)
    expect(hasProfileData({ name: "  " })).toBe(false)
  })
})

describe("parseStoredProfile", () => {
  it("parses and sanitizes the stored JSON", () => {
    expect(parseStoredProfile(JSON.stringify({ name: " Bella ", foo: "bar" }))).toEqual({
      name: "Bella",
    })
  })

  it("returns an empty profile for missing or broken values", () => {
    expect(parseStoredProfile(null)).toEqual({})
    expect(parseStoredProfile("")).toEqual({})
    expect(parseStoredProfile("{not json")).toEqual({})
  })
})
