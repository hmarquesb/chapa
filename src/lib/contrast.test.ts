import { describe, expect, it } from "vitest"
import { contrastRatio, hueDistance, relativeLuminance } from "@/lib/contrast"

describe("relativeLuminance", () => {
  it("is 1 for white and 0 for black", () => {
    expect(relativeLuminance("#FFFFFF")).toBeCloseTo(1, 5)
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5)
  })
})

describe("contrastRatio", () => {
  it("is 21 between black and white, in either order", () => {
    expect(contrastRatio("#000000", "#FFFFFF")).toBeCloseTo(21, 5)
    expect(contrastRatio("#FFFFFF", "#000000")).toBeCloseTo(21, 5)
  })

  it("is 1 for equal colors", () => {
    expect(contrastRatio("#7A2E3B", "#7A2E3B")).toBeCloseTo(1, 5)
  })

  it("treats #FFF like #FFFFFF", () => {
    expect(contrastRatio("#FFF", "#000")).toBeCloseTo(contrastRatio("#FFFFFF", "#000000"), 5)
  })

  it("is about 8.5 between wine and linen", () => {
    expect(contrastRatio("#7A2E3B", "#FAF5F0")).toBeCloseTo(8.5, 0)
  })

  it("throws on a hex with alpha", () => {
    expect(() => contrastRatio("#2A1E2266", "#FFFFFF")).toThrow()
    expect(() => relativeLuminance("#FFFF")).toThrow()
  })
})

describe("hueDistance", () => {
  it("is 20 between hues 350 and 10", () => {
    // hsl(350 100% 50%) and hsl(10 100% 50%)
    expect(hueDistance("#FF002B", "#FF2B00")).toBeCloseTo(20, 0)
  })

  it("is 0 for equal colors and 180 for opposite hues", () => {
    expect(hueDistance("#FF0000", "#FF0000")).toBe(0)
    expect(hueDistance("#FF0000", "#00FFFF")).toBeCloseTo(180, 5)
  })
})
