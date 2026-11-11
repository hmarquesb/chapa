// Pure SVG generation for the brand files (no fs, no fonts). scripts/export-brand.ts turns the
// font into outlines and writes the results. Colors come from PALETTE, the icon from CHAPA_ICON.
import { SWATCHES } from "../../src/lib/brand-guide"
import type { CHAPA_ICON } from "../../src/lib/chapa-icon"
import type { PALETTE } from "../../src/lib/palette"

/** One path per text, already positioned in the final coordinate space. */
export type GlyphOutline = { d: string; advance: number }

function num(value: number): string {
  return String(Math.round(value * 100) / 100)
}

/** Bounding box of the points of an absolute path (M, L, Q, C, Z): control points included. */
export function pathBounds(d: string): { minX: number; minY: number; maxX: number; maxY: number } {
  const numbers = (d.match(/-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? []).map(Number)
  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    const x = numbers[i] as number
    const y = numbers[i + 1] as number
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
    minY = Math.min(minY, y)
    maxY = Math.max(maxY, y)
  }
  return { minX, minY, maxX, maxY }
}

export function logoSvg(input: {
  word: GlyphOutline
  dot: GlyphOutline
  colors: { word: string; dot: string }
  title: string
}): string {
  const a = pathBounds(input.word.d)
  const b = pathBounds(input.dot.d)
  const minX = Math.min(a.minX, b.minX)
  const minY = Math.min(a.minY, b.minY)
  const width = Math.max(a.maxX, b.maxX) - minX
  const height = Math.max(a.maxY, b.maxY) - minY
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${num(minX)} ${num(minY)} ${num(width)} ${num(height)}" role="img">`,
    `<title>${input.title}</title>`,
    `<path fill="${input.colors.word}" d="${input.word.d}"/>`,
    `<path fill="${input.colors.dot}" d="${input.dot.d}"/>`,
    "</svg>",
    "",
  ].join("\n")
}

export function avatarSvg(input: {
  icon: typeof CHAPA_ICON
  colors: { circle: string; icon: string }
  title: string
}): string {
  const size = 96
  const scale = 2.3
  const offset = num((size - 24 * scale) / 2)
  const paths = input.icon.paths.map((d) => `<path d="${d}"/>`).join("")
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img">`,
    `<title>${input.title}</title>`,
    `<circle cx="${size / 2}" cy="${size / 2}" r="${size / 2}" fill="${input.colors.circle}"/>`,
    `<g transform="translate(${offset} ${offset}) scale(${scale})" fill="none" stroke="${input.colors.icon}" stroke-width="${input.icon.strokeWidth}" stroke-linecap="round" stroke-linejoin="round"><g transform="${input.icon.transform}">${paths}</g></g>`,
    "</svg>",
    "",
  ].join("\n")
}

export function faviconSvg(input: {
  letter: GlyphOutline
  dot: GlyphOutline
  colors: { background: string; letter: string; dot: string }
}): string {
  const size = 64
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" role="img">`,
    "<title>Rango</title>",
    `<rect width="${size}" height="${size}" rx="${num(size * 0.22)}" fill="${input.colors.background}"/>`,
    `<path fill="${input.colors.letter}" d="${input.letter.d}"/>`,
    `<path fill="${input.colors.dot}" d="${input.dot.d}"/>`,
    "</svg>",
    "",
  ].join("\n")
}

export const BRAND_FILES = [
  ["rango-logo.svg", "Logo em vinho e canela, para fundos claros."],
  ["rango-logo-dark.svg", "Logo nos tons do tema escuro, para fundos escuros."],
  ["rango-logo-mono.svg", "Logo numa cor só (ameixa), para impressão e fundos que não combinam."],
  ["chapa-avatar.svg", "Avatar do Chapa: a espátula em canela."],
  ["og.png", "Imagem de compartilhamento (1200 × 630), cópia da rota /opengraph-image."],
] as const

export function brandReadme(input: { palette: typeof PALETTE }): string {
  const { light, dark } = input.palette
  const rows = SWATCHES.map(
    (s) => `| ${s.name} | \`${s.token}\` | ${light[s.token]} | ${dark[s.token]} |`,
  )
  const files = BRAND_FILES.map(([name, what]) => `- \`${name}\`: ${what}`)
  return [
    "# Marca Rango",
    "",
    "> Gerado por `npm run brand:export`. Não edite à mão: mude os tokens em `src/app/globals.css` e `src/lib/palette.ts`, rode o comando e commite.",
    "",
    "Projeto de estudo: a Rango é uma empresa fictícia, sem afiliação com nenhuma empresa real.",
    "",
    "## Paleta",
    "",
    "| Papel | Token | Claro | Escuro |",
    "| --- | --- | --- | --- |",
    ...rows,
    "",
    "## Fontes",
    "",
    "- Bricolage Grotesque ExtraBold (800): logo e títulos.",
    "- Figtree Regular (400) e SemiBold (600): texto de interface.",
    "",
    "As duas fontes são livres, sob a licença OFL 1.1 (cópias em `assets/fonts/`).",
    "",
    "## Arquivos",
    "",
    ...files,
    "",
    "## Regras de uso",
    "",
    "- O logo nunca é redesenhado: use os arquivos desta pasta, sem esticar, girar nem trocar a fonte.",
    "- O ponto do logo é sempre canela (exceto na versão numa cor só).",
    "- A canela nunca é texto no claro: para texto em canela, use a canela escura.",
    "- Os logos são contornos, sem texto: não dependem da fonte instalada.",
    "",
  ].join("\n")
}
