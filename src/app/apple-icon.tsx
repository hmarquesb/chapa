import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"
import { PALETTE } from "@/lib/palette"

// Static: generated at build time, with the font read from assets/fonts/.
export const size = { width: 180, height: 180 }
export const contentType = "image/png"

const colors = PALETTE.light

export default async function AppleIcon() {
  const bricolage = await readFile(
    join(process.cwd(), "assets", "fonts", "BricolageGrotesque-ExtraBold.ttf"),
  )

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: colors.background,
        fontFamily: "Bricolage",
        fontWeight: 800,
        fontSize: 150,
        lineHeight: 1,
        color: colors.primary,
      }}
    >
      <span>r</span>
      <span style={{ color: colors.cinnamon }}>.</span>
    </div>,
    { ...size, fonts: [{ name: "Bricolage", data: bricolage, weight: 800, style: "normal" }] },
  )
}
