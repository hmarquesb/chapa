// Writes the brand files from PALETTE, CHAPA_ICON and the Bricolage Grotesque font outlines.
// No network, no database. Run it after changing a tone, then commit the result:
//   npm run brand:export
import { mkdir, readFile, writeFile } from "node:fs/promises"
import { join } from "node:path"
import { type Font, parse } from "opentype.js"
import { CHAPA_ICON } from "../src/lib/chapa-icon"
import { PALETTE } from "../src/lib/palette"
import { avatarSvg, brandReadme, faviconSvg, type GlyphOutline, logoSvg } from "./brand/svg"

const FONT_FILE = join("assets", "fonts", "BricolageGrotesque-ExtraBold.ttf")
const BRAND_DIR = join("public", "brand")
const ICON_FILE = join("src", "app", "icon.svg")
const LOGO_SIZE = 200
const FAVICON_FRAME = 64
const FAVICON_CONTENT_WIDTH = 40

// font.getPath(text) runs the GSUB shaper, which throws on this font (lookup type 6). The words here
// are short and plain, so the glyphs are laid out one by one, with the font's kerning pairs.
function layout(font: Font, text: string, x: number, y: number, size: number) {
  const scale = size / font.unitsPerEm
  const paths: ReturnType<Font["getPath"]>[] = []
  let cursor = x
  let previous: ReturnType<Font["charToGlyph"]> | undefined
  for (const char of text) {
    const glyph = font.charToGlyph(char)
    if (previous !== undefined) cursor += font.getKerningValue(previous, glyph) * scale
    paths.push(glyph.getPath(cursor, y, size))
    cursor += (glyph.advanceWidth ?? 0) * scale
    previous = glyph
  }
  return { paths, advance: cursor - x }
}

function outline(font: Font, text: string, x: number, y: number, size: number): GlyphOutline {
  const { paths, advance } = layout(font, text, x, y, size)
  return { d: paths.map((path) => path.toPathData(2)).join(""), advance }
}

function bounds(font: Font, text: string, x: number, size: number) {
  const { paths } = layout(font, text, x, 0, size)
  const boxes = paths.map((path) => path.getBoundingBox())
  return {
    x1: Math.min(...boxes.map((b) => b.x1)),
    y1: Math.min(...boxes.map((b) => b.y1)),
    x2: Math.max(...boxes.map((b) => b.x2)),
    y2: Math.max(...boxes.map((b) => b.y2)),
  }
}

function logoOutlines(font: Font): { word: GlyphOutline; dot: GlyphOutline } {
  const baseline = LOGO_SIZE
  const word = outline(font, "rango", 0, baseline, LOGO_SIZE)
  const dot = outline(font, ".", word.advance, baseline, LOGO_SIZE)
  return { word, dot }
}

/** The letter "r" and the dot, scaled to a fixed width and centered in the favicon square. */
function faviconOutlines(font: Font): { letter: GlyphOutline; dot: GlyphOutline } {
  const probe = 100
  const probeLetter = bounds(font, "r", 0, probe)
  const probeDot = bounds(font, ".", layout(font, "r", 0, 0, probe).advance, probe)
  const size = (probe * FAVICON_CONTENT_WIDTH) / (probeDot.x2 - probeLetter.x1)
  const k = size / probe
  const minX = probeLetter.x1 * k
  const maxX = probeDot.x2 * k
  const minY = Math.min(probeLetter.y1, probeDot.y1) * k
  const maxY = Math.max(probeLetter.y2, probeDot.y2) * k
  const x = (FAVICON_FRAME - (maxX - minX)) / 2 - minX
  const y = (FAVICON_FRAME - (maxY - minY)) / 2 - minY
  return {
    letter: outline(font, "r", x, y, size),
    dot: outline(font, ".", x + layout(font, "r", 0, 0, size).advance, y, size),
  }
}

async function main(): Promise<void> {
  const file = await readFile(FONT_FILE)
  const font = parse(file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength))
  const { light, dark } = PALETTE
  const logo = logoOutlines(font)
  const favicon = faviconOutlines(font)

  const outputs: ReadonlyArray<readonly [string, string]> = [
    [
      join(BRAND_DIR, "rango-logo.svg"),
      logoSvg({ ...logo, colors: { word: light.primary, dot: light.cinnamon }, title: "Rango" }),
    ],
    [
      join(BRAND_DIR, "rango-logo-dark.svg"),
      logoSvg({ ...logo, colors: { word: dark.primary, dot: dark.cinnamon }, title: "Rango" }),
    ],
    [
      join(BRAND_DIR, "rango-logo-mono.svg"),
      logoSvg({
        ...logo,
        colors: { word: light.foreground, dot: light.foreground },
        title: "Rango",
      }),
    ],
    [
      join(BRAND_DIR, "chapa-avatar.svg"),
      avatarSvg({
        icon: CHAPA_ICON,
        colors: { circle: light.cinnamon, icon: light["cinnamon-foreground"] },
        title: "Chapa",
      }),
    ],
    [join(BRAND_DIR, "README.md"), brandReadme({ palette: PALETTE })],
    [
      ICON_FILE,
      faviconSvg({
        ...favicon,
        colors: { background: light.background, letter: light.primary, dot: light.cinnamon },
      }),
    ],
  ]

  await mkdir(BRAND_DIR, { recursive: true })
  for (const [path, content] of outputs) {
    await writeFile(path, content)
    console.log(`ok  ${path}`)
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Erro inesperado.")
  process.exit(1)
})
