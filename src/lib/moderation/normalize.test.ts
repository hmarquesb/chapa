import { describe, expect, it } from "vitest"
import { normalizeForModeration } from "@/lib/moderation/normalize"

describe("normalizeForModeration", () => {
  it("lowercases and strips diacritics", () => {
    expect(normalizeForModeration("Pastéis Ângela")).toEqual(["pasteis", "angela"])
    expect(normalizeForModeration("AÇAÍ")).toEqual(["acai"])
  })

  it.each([
    ["4", "a"],
    ["@", "a"],
    ["3", "e"],
    ["1", "i"],
    ["!", "i"],
    ["0", "o"],
    ["5", "s"],
    ["$", "s"],
    ["7", "t"],
  ])("replaces leetspeak %s with %s", (symbol, letter) => {
    expect(normalizeForModeration(`b${symbol}b`)).toEqual([`b${letter}b`])
  })

  it("handles a full leetspeak word", () => {
    expect(normalizeForModeration("P4st3l")).toEqual(["pastel"])
  })

  it("reduces repeated letters to one", () => {
    expect(normalizeForModeration("pasteeeel")).toEqual(["pastel"])
    expect(normalizeForModeration("Pizzaria")).toEqual(["pizaria"])
  })

  it("joins runs of three or more single letters separated by space, dot or hyphen", () => {
    expect(normalizeForModeration("p a s t e l")).toEqual(["pastel"])
    expect(normalizeForModeration("p.a.s.t.e.l")).toEqual(["pastel"])
    expect(normalizeForModeration("p-a-s-t-e-l")).toEqual(["pastel"])
    expect(normalizeForModeration("p . a - s t")).toEqual(["past"])
  })

  it("keeps runs of fewer than three single letters apart", () => {
    expect(normalizeForModeration("a b casa")).toEqual(["a", "b", "casa"])
  })

  it("turns allowed signs into token separators", () => {
    expect(normalizeForModeration("D'Ângelo & Filhos (Centro) - Pizzas, Massas.")).toEqual([
      "d",
      "angelo",
      "filhos",
      "centro",
      "pizas",
      "masas",
    ])
  })

  it("returns no tokens for an empty text", () => {
    expect(normalizeForModeration("")).toEqual([])
    expect(normalizeForModeration("  ")).toEqual([])
  })
})
