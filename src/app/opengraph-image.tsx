import { readFile } from "node:fs/promises"
import { join } from "node:path"
import { ImageResponse } from "next/og"
import { CHAPA_ICON } from "@/lib/chapa-icon"
import { PALETTE } from "@/lib/palette"

// Static: generated at build time, with the fonts read from assets/fonts/.
export const alt = "Chapa, o assistente de parceiros da Rango"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const colors = PALETTE.light

function font(file: string): Promise<Buffer> {
  return readFile(join(process.cwd(), "assets", "fonts", file))
}

export default async function OpenGraphImage() {
  const [bricolage, figtreeRegular] = await Promise.all([
    font("BricolageGrotesque-ExtraBold.ttf"),
    font("Figtree-Regular.ttf"),
  ])

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: colors.background,
        color: colors.foreground,
        fontFamily: "Figtree",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div
          style={{
            display: "flex",
            fontFamily: "Bricolage",
            fontWeight: 800,
            fontSize: 150,
            letterSpacing: -4,
            color: colors.primary,
          }}
        >
          <span>rango</span>
          <span style={{ color: colors.cinnamon }}>.</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 220,
            height: 220,
            borderRadius: 110,
            background: colors.cinnamon,
          }}
        >
          <svg
            width={124}
            height={124}
            viewBox={CHAPA_ICON.viewBox}
            fill="none"
            stroke={colors["cinnamon-foreground"]}
            strokeWidth={CHAPA_ICON.strokeWidth}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <g transform={CHAPA_ICON.transform}>
              {CHAPA_ICON.paths.map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
          </svg>
        </div>
      </div>
      <div
        style={{
          display: "flex",
          fontFamily: "Bricolage",
          fontWeight: 800,
          fontSize: 72,
          lineHeight: 1.1,
          maxWidth: 900,
        }}
      >
        Chapa, o assistente de parceiros da Rango
      </div>
      <div style={{ display: "flex", fontSize: 30, color: colors["muted-foreground"] }}>
        Projeto de estudo · empresa fictícia
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Bricolage", data: bricolage, weight: 800, style: "normal" },
        { name: "Figtree", data: figtreeRegular, weight: 400, style: "normal" },
      ],
    },
  )
}
