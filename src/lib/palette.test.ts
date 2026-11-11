import { readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { contrastRatio, hueDistance } from "@/lib/contrast"
import { COLOR_TOKENS, CONTRAST_PAIRS, PALETTE, type ThemeName } from "@/lib/palette"

const CSS_PATH = join(dirname(fileURLToPath(import.meta.url)), "..", "app", "globals.css")
const css = readFileSync(CSS_PATH, "utf8")

function blockBody(selector: string): string {
  const start = css.search(new RegExp(`(^|\\n)${selector.replace(".", "\\.")}\\s*\\{`))
  if (start === -1) return ""
  const open = css.indexOf("{", start)
  const close = css.indexOf("\n}", open)
  return css.slice(open + 1, close === -1 ? undefined : close)
}

function cssTokens(selector: string): Map<string, string> {
  const tokens = new Map<string, string>()
  for (const match of blockBody(selector).matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]+)\s*;/g)) {
    tokens.set(match[1] as string, (match[2] as string).toUpperCase())
  }
  return tokens
}

const BLOCKS: Record<ThemeName, string> = { light: ":root", dark: ".dark" }
const THEMES = Object.keys(BLOCKS) as ThemeName[]

describe("palette in sync with globals.css", () => {
  for (const theme of THEMES) {
    it(`${theme}: every token exists in ${BLOCKS[theme]} with the same value`, () => {
      const tokens = cssTokens(BLOCKS[theme])
      const problems: string[] = []
      for (const token of COLOR_TOKENS) {
        const expected = PALETTE[theme][token].toUpperCase()
        const actual = tokens.get(token)
        if (actual !== expected) {
          problems.push(`${theme}: --${token} = ${actual ?? "(missing)"}, palette.ts = ${expected}`)
        }
      }
      expect(problems.join("\n")).toBe("")
    })
  }
})

describe("contrast pairs", () => {
  it("every pair passes in both themes", () => {
    const failures: string[] = []
    for (const theme of THEMES) {
      for (const pair of CONTRAST_PAIRS) {
        const ratio = contrastRatio(
          PALETTE[theme][pair.foreground],
          PALETTE[theme][pair.background],
        )
        if (ratio < pair.min) {
          failures.push(
            `${theme}: ${pair.foreground}/${pair.background} → ${ratio.toFixed(2)} (min ${pair.min})`,
          )
        }
      }
    }
    expect(failures.join("\n")).toBe("")
  })

  it("destructive stays at least 20° of hue away from primary", () => {
    for (const theme of THEMES) {
      const distance = hueDistance(PALETTE[theme].destructive, PALETTE[theme].primary)
      expect(
        distance,
        `${theme}: destructive/primary → ${distance.toFixed(1)}°`,
      ).toBeGreaterThanOrEqual(20)
    }
  })
})
