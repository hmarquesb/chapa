import { describe, expect, it } from "vitest"
import { formatSourceLabel, formatTime } from "@/lib/format"

describe("formatTime", () => {
  it("formats hours and minutes in pt-BR with two digits", () => {
    expect(formatTime("2026-11-06T14:05:09Z", "UTC")).toBe("14:05")
    expect(formatTime("2026-11-06T09:03:00Z", "UTC")).toBe("09:03")
  })

  it("applies the given time zone", () => {
    expect(formatTime("2026-11-06T14:05:00Z", "America/Sao_Paulo")).toBe("11:05")
  })

  it("uses the 24-hour clock", () => {
    expect(formatTime("2026-11-06T23:59:00Z", "UTC")).toBe("23:59")
    expect(formatTime("2026-11-06T00:00:00Z", "UTC")).toBe("00:00")
  })

  it("returns an empty string for an invalid date", () => {
    expect(formatTime("not a date", "UTC")).toBe("")
    expect(formatTime("", "UTC")).toBe("")
  })
})

describe("formatSourceLabel", () => {
  it("drops the extension and the numeric prefix and turns dashes into spaces", () => {
    expect(formatSourceLabel("02-repasse-financeiro.md")).toBe("repasse financeiro")
  })

  it("handles names without prefix or extension", () => {
    expect(formatSourceLabel("cancelamentos.md")).toBe("cancelamentos")
    expect(formatSourceLabel("10-horarios")).toBe("horarios")
    expect(formatSourceLabel("avaliacoes_e_notas.md")).toBe("avaliacoes e notas")
  })

  it("ignores any directory in the path", () => {
    expect(formatSourceLabel("knowledge-base/03-cardapio.md")).toBe("cardapio")
  })

  it("falls back to the original name when nothing is left", () => {
    expect(formatSourceLabel("01.md")).toBe("01.md")
  })
})
