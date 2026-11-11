import { describe, expect, it } from "vitest"
import { buildShotPlan, parseScreenshotArgs, SHOT_IDS } from "./shots"

describe("buildShotPlan", () => {
  it("planeja 7 ids x 2 temas x 2 viewports", () => {
    const plan = buildShotPlan()
    expect(plan).toHaveLength(28)
    expect(new Set(plan.map((shot) => shot.file)).size).toBe(28)
  })

  it("nomeia o arquivo como id-tema-viewport.png", () => {
    expect(buildShotPlan(["chat"])).toContainEqual({
      id: "chat",
      theme: "dark",
      viewport: "mobile",
      file: "chat-dark-mobile.png",
    })
  })

  it("filtra por --only", () => {
    expect(buildShotPlan(["chat", "menu"])).toHaveLength(8)
  })

  it("rejeita um id desconhecido listando os válidos", () => {
    expect(() => buildShotPlan(["foo"])).toThrow(new RegExp(SHOT_IDS.join(", ")))
  })
})

describe("parseScreenshotArgs", () => {
  it("exige --url", () => {
    expect(() => parseScreenshotArgs([])).toThrow(/--url/)
  })

  it("usa .screenshots como saída padrão", () => {
    const args = parseScreenshotArgs(["--url", "http://localhost:3000"])
    expect(args).toEqual({ url: "http://localhost:3000", out: ".screenshots", only: undefined })
  })

  it("lê --out e --only", () => {
    const args = parseScreenshotArgs([
      "--url",
      "http://localhost:3000",
      "--out",
      "x",
      "--only",
      "chat,menu",
    ])
    expect(args).toEqual({ url: "http://localhost:3000", out: "x", only: ["chat", "menu"] })
  })
})
