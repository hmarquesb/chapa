import { readdirSync, readFileSync } from "node:fs"
import { dirname, join, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

// No fixed colors in src/components and src/app: every color is a token from globals.css.
// Each violation reads "<file>:<line>: <snippet>" so a failing run points at the culprit.

const SRC = dirname(fileURLToPath(import.meta.url))
const ROOT = join(SRC, "..")
const SCANNED_DIRS = ["components", "app"]
const SCANNED_FILE = /\.(ts|tsx|css)$/
const TEST_FILE = /\.test\.tsx?$/

const COLOR_NAMES =
  "slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white"
const UTILITY_PREFIXES =
  "bg|text|border|ring|fill|stroke|from|to|via|outline|shadow|divide|placeholder|caret|decoration|accent"

const PATTERNS: readonly RegExp[] = [
  // hex colors with 3, 4, 6 or 8 digits (not "#conteudo" or "#/path")
  /(?<![\w&])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{3,4})(?![\w-])/g,
  // color functions
  /\b(?:rgba?|hsla?|oklch|oklab)\(/g,
  // Tailwind default palette, with an optional shade and an optional /opacity
  new RegExp(
    `(?<![\\w-])(?:${UTILITY_PREFIXES})-(?:${COLOR_NAMES})(?:-\\d{2,3})?(?:/[\\w.%[\\]]+)?(?![\\w-])`,
    "g",
  ),
]

function findFixedColors(source: string): string[] {
  const found: string[] = []
  source.split("\n").forEach((text, index) => {
    for (const pattern of PATTERNS) {
      for (const match of text.matchAll(pattern)) {
        found.push(`${index + 1}: ${match[0]}`)
      }
    }
  })
  return found
}

function walk(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(path))
    else if (SCANNED_FILE.test(entry.name) && !TEST_FILE.test(entry.name)) files.push(path)
  }
  return files
}

describe("findFixedColors", () => {
  it("catches palette classes, hex and color functions", () => {
    expect(findFixedColors("text-neutral-600")).toHaveLength(1)
    expect(findFixedColors("bg-black/10")).toHaveLength(1)
    expect(findFixedColors("border-red-500/50")).toHaveLength(1)
    expect(findFixedColors("bg-[#fff]")).toHaveLength(1)
    expect(findFixedColors("color: #fff")).toHaveLength(1)
    expect(findFixedColors("color: #2A1E2266")).toHaveLength(1)
    expect(findFixedColors("rgb(0 0 0)")).toHaveLength(1)
    expect(findFixedColors("a: oklch(0.5 0 0)")).toHaveLength(1)
  })

  it("lets tokens, anchors and ordinary words through", () => {
    expect(findFixedColors('href="#conteudo"')).toEqual([])
    expect(findFixedColors("text-muted-foreground")).toEqual([])
    expect(findFixedColors("bg-overlay border-border shadow-soft")).toEqual([])
    expect(findFixedColors("bg-primary/90 text-cinnamon-text")).toEqual([])
  })
})

describe("fixed colors", () => {
  it("none in src/components and src/app (except globals.css)", () => {
    const violations: string[] = []
    for (const dir of SCANNED_DIRS) {
      for (const file of walk(join(SRC, dir))) {
        if (file.endsWith(`${sep}globals.css`)) continue
        for (const hit of findFixedColors(readFileSync(file, "utf8"))) {
          const [line, snippet] = hit.split(": ")
          violations.push(`${relative(ROOT, file)}:${line}: ${snippet}`)
        }
      }
    }
    expect(violations.join("\n")).toBe("")
  })
})
