import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"
import { CHAPA_ICON } from "../../src/lib/chapa-icon"
import { PALETTE } from "../../src/lib/palette"
import { avatarSvg, brandReadme, faviconSvg, type GlyphOutline, logoSvg } from "./svg"

const WORD: GlyphOutline = { d: "M0 0L100 0L100 40L0 40Z", advance: 100 }
const DOT: GlyphOutline = { d: "M104 30L114 30L114 40L104 40Z", advance: 12 }
const LETTER: GlyphOutline = { d: "M10 10L30 10L30 50L10 50Z", advance: 30 }

const light = PALETTE.light
const dark = PALETTE.dark

function logo(colors: { word: string; dot: string }) {
  return logoSvg({ word: WORD, dot: DOT, colors, title: "Rango" })
}

function hexes(svg: string): string[] {
  return [...new Set(svg.match(/#[0-9A-Fa-f]{6}\b/g) ?? [])].sort()
}

function expectBasics(svg: string, title: string) {
  expect(svg).toMatch(/viewBox="[^"]+"/)
  expect(svg).toContain(`<title>${title}</title>`)
  expect(svg).toContain('role="img"')
  expect(svg).not.toContain("<text")
}

describe("logoSvg", () => {
  it("tem viewBox, title, role e nenhum <text>", () => {
    expectBasics(logo({ word: light.primary, dot: light.cinnamon }), "Rango")
  })

  it("usa o viewBox justo ao redor dos contornos", () => {
    expect(logo({ word: "#000000", dot: "#111111" })).toContain('viewBox="0 0 114 40"')
  })

  it("pinta a palavra e o ponto com as cores recebidas", () => {
    const svg = logo({ word: light.primary, dot: light.cinnamon })
    expect(hexes(svg)).toEqual([light.cinnamon, light.primary].sort())
  })

  it("versão escura e mono usam os tokens da decisão 2", () => {
    expect(hexes(logo({ word: dark.primary, dot: dark.cinnamon }))).toEqual(
      [dark.cinnamon, dark.primary].sort(),
    )
    expect(hexes(logo({ word: light.foreground, dot: light.foreground }))).toEqual([
      light.foreground,
    ])
  })
})

describe("avatarSvg", () => {
  const svg = avatarSvg({
    icon: CHAPA_ICON,
    colors: { circle: light.cinnamon, icon: light["cinnamon-foreground"] },
    title: "Chapa",
  })

  it("tem viewBox, title, role e nenhum <text>", () => {
    expectBasics(svg, "Chapa")
  })

  it("repete os cinco paths do ícone com o transform", () => {
    for (const d of CHAPA_ICON.paths) expect(svg).toContain(`d="${d}"`)
    expect(CHAPA_ICON.paths).toHaveLength(5)
    expect(svg).toContain(`transform="${CHAPA_ICON.transform}"`)
  })

  it("usa canela e canela-foreground", () => {
    expect(hexes(svg)).toEqual([light.cinnamon, light["cinnamon-foreground"]].sort())
  })
})

describe("faviconSvg", () => {
  const svg = faviconSvg({
    letter: LETTER,
    dot: DOT,
    colors: { background: light.background, letter: light.primary, dot: light.cinnamon },
  })

  it("tem viewBox, role e nenhum <text>", () => {
    expect(svg).toMatch(/viewBox="[^"]+"/)
    expect(svg).toContain('role="img"')
    expect(svg).not.toContain("<text")
  })

  it("é um quadrado de cantos arredondados de 22% do lado", () => {
    expect(svg).toMatch(/viewBox="0 0 64 64"/)
    expect(svg).toContain('rx="14.08"')
  })

  it("usa fundo, vinho e canela", () => {
    expect(hexes(svg)).toEqual([light.background, light.cinnamon, light.primary].sort())
  })
})

describe("brandReadme", () => {
  const readme = brandReadme({ palette: PALETTE })

  it("avisa que é gerado pelo brand:export", () => {
    expect(readme).toContain("npm run brand:export")
  })

  it("tem os hex dos dois temas de cada papel da paleta", () => {
    const rows = readme.split("\n").filter((line) => line.startsWith("| ") && line.includes("`"))
    expect(rows.length).toBeGreaterThanOrEqual(8)
    for (const row of rows) {
      const token = /`([a-z-]+)`/.exec(row)?.[1] as keyof typeof light
      expect(row).toContain(light[token])
      expect(row).toContain(dark[token])
    }
  })

  it("cita as fontes, a licença e as regras de uso", () => {
    expect(readme).toContain("Bricolage Grotesque")
    expect(readme).toContain("Figtree")
    expect(readme).toContain("OFL")
    expect(readme).toMatch(/nunca é redesenhado/i)
    expect(readme).toMatch(/canela nunca é texto no claro/i)
  })
})

describe("arquivos commitados", () => {
  const dir = join(__dirname, "..", "..", "public", "brand")
  const read = (name: string) => readFileSync(join(dir, name), "utf8")
  const hint = "rode `npm run brand:export`"

  it("o README é igual ao gerado da paleta", () => {
    expect(read("README.md"), hint).toBe(brandReadme({ palette: PALETTE }))
  })

  it("os logos têm as cores da paleta", () => {
    expect(hexes(read("rango-logo.svg")), hint).toEqual(
      hexes(logo({ word: light.primary, dot: light.cinnamon })),
    )
    expect(hexes(read("rango-logo-dark.svg")), hint).toEqual(
      hexes(logo({ word: dark.primary, dot: dark.cinnamon })),
    )
    expect(hexes(read("rango-logo-mono.svg")), hint).toEqual([light.foreground])
  })

  it("o avatar e o ícone têm as cores da paleta", () => {
    expect(hexes(read("chapa-avatar.svg")), hint).toEqual(
      [light.cinnamon, light["cinnamon-foreground"]].sort(),
    )
    const icon = readFileSync(join(dir, "..", "..", "src", "app", "icon.svg"), "utf8")
    expect(hexes(icon), hint).toEqual([light.background, light.cinnamon, light.primary].sort())
  })

  it("nenhum arquivo tem <text>", () => {
    for (const name of [
      "rango-logo.svg",
      "rango-logo-dark.svg",
      "rango-logo-mono.svg",
      "chapa-avatar.svg",
    ]) {
      expect(read(name)).not.toContain("<text")
    }
  })
})
