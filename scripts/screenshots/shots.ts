// Pure planning of the screenshots: argument parsing and the list of shots.
import { parseArgs } from "../lib/args"

export const SHOT_IDS = ["entrada", "chat", "demo", "menu", "perfil", "avisos", "marca"] as const
export type ShotId = (typeof SHOT_IDS)[number]
export type ShotTheme = "light" | "dark"
export type ShotViewport = "desktop" | "mobile"

export const VIEWPORTS: Record<ShotViewport, { width: number; height: number }> = {
  desktop: { width: 1280, height: 800 },
  mobile: { width: 390, height: 844 },
}

export type Shot = { id: ShotId; theme: ShotTheme; viewport: ShotViewport; file: string }

const THEMES: readonly ShotTheme[] = ["light", "dark"]
const VIEWPORT_NAMES: readonly ShotViewport[] = ["desktop", "mobile"]

export function buildShotPlan(only?: readonly string[]): Shot[] {
  const unknown = (only ?? []).filter((id) => !(SHOT_IDS as readonly string[]).includes(id))
  if (unknown.length > 0) {
    throw new Error(`Id desconhecido: ${unknown.join(", ")}. Válidos: ${SHOT_IDS.join(", ")}.`)
  }
  const ids = SHOT_IDS.filter((id) => only === undefined || only.includes(id))
  return ids.flatMap((id) =>
    THEMES.flatMap((theme) =>
      VIEWPORT_NAMES.map((viewport) => ({
        id,
        theme,
        viewport,
        file: `${id}-${theme}-${viewport}.png`,
      })),
    ),
  )
}

export function parseScreenshotArgs(argv: string[]): {
  url: string
  out: string
  only: string[] | undefined
} {
  const { flags } = parseArgs(argv)
  const url = flags.url
  if (typeof url !== "string") throw new Error("Informe --url (ex.: --url http://localhost:3000).")
  const out = typeof flags.out === "string" ? flags.out : ".screenshots"
  const only = typeof flags.only === "string" ? flags.only.split(",").filter(Boolean) : undefined
  return { url, out, only }
}
