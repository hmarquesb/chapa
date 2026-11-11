// WCAG 2.x contrast and HSL hue helpers. Pure functions, used by the brand tests and /marca.

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i

function parseHex(hex: string): [number, number, number] {
  if (!HEX_PATTERN.test(hex)) {
    throw new Error(`Cor inválida (use #RGB ou #RRGGBB, sem alfa): ${hex}`)
  }
  let digits = hex.slice(1)
  if (digits.length === 3) {
    digits = digits
      .split("")
      .map((c) => c + c)
      .join("")
  }
  const n = Number.parseInt(digits, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((channel) => {
    const c = channel / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Contrast ratio from 1 to 21. Rounding is left to the caller (messages only). */
export function contrastRatio(a: string, b: string): number {
  const la = relativeLuminance(a)
  const lb = relativeLuminance(b)
  const [light, dark] = la >= lb ? [la, lb] : [lb, la]
  return (light + 0.05) / (dark + 0.05)
}

function hue(hex: string): number {
  const [r, g, b] = parseHex(hex).map((c) => c / 255) as [number, number, number]
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  if (delta === 0) return 0
  let h: number
  if (max === r) h = ((g - b) / delta) % 6
  else if (max === g) h = (b - r) / delta + 2
  else h = (r - g) / delta + 4
  return (h * 60 + 360) % 360
}

/** Distance between two HSL hues in degrees, from 0 to 180. */
export function hueDistance(a: string, b: string): number {
  const diff = Math.abs(hue(a) - hue(b))
  return diff > 180 ? 360 - diff : diff
}
