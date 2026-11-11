import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { parse } from "yaml"
import { isPlanId, parsePlanId, profileSummary } from "@/lib/plans"
import { PLAN_IDS, PLAN_LABELS } from "@/lib/types"

describe("PLAN_LABELS", () => {
  it("matches nomes.plano_* in knowledge-base/regras.yaml", () => {
    const regras = parse(readFileSync("knowledge-base/regras.yaml", "utf8")) as {
      nomes: Record<string, string>
    }
    expect(PLAN_LABELS).toEqual({
      proprio: regras.nomes.plano_proprio,
      entrega: regras.nomes.plano_entrega,
      misto: regras.nomes.plano_misto,
    })
    expect(Object.keys(PLAN_LABELS)).toEqual([...PLAN_IDS])
  })
})

describe("isPlanId", () => {
  it("accepts only the three ids", () => {
    for (const id of PLAN_IDS) expect(isPlanId(id)).toBe(true)
    expect(isPlanId("Plano Misto")).toBe(false)
    expect(isPlanId("premium")).toBe(false)
    expect(isPlanId(3)).toBe(false)
    expect(isPlanId(undefined)).toBe(false)
  })
})

describe("parsePlanId", () => {
  it("accepts the id and the name", () => {
    expect(parsePlanId("misto")).toBe("misto")
    expect(parsePlanId("Plano Entrega")).toBe("entrega")
  })

  it("ignores case, accents and the Plano prefix", () => {
    expect(parsePlanId("Misto")).toBe("misto")
    expect(parsePlanId("plano próprio")).toBe("proprio")
    expect(parsePlanId("PLANO PROPRIO")).toBe("proprio")
    expect(parsePlanId("  Próprio ")).toBe("proprio")
  })

  it("returns null for anything else", () => {
    expect(parsePlanId("premium")).toBeNull()
    expect(parsePlanId("")).toBeNull()
    expect(parsePlanId("plano")).toBeNull()
  })
})

describe("profileSummary", () => {
  it("joins name and plan", () => {
    expect(profileSummary({ name: "Marmitaria Boa Panela", plan: "misto" })).toBe(
      "Marmitaria Boa Panela · Plano Misto",
    )
  })

  it("shows only the plan or only the name", () => {
    expect(profileSummary({ plan: "proprio" })).toBe("Plano Próprio")
    expect(profileSummary({ name: "Bella" })).toBe("Bella")
  })

  it("returns an empty string for an empty profile", () => {
    expect(profileSummary({})).toBe("")
    expect(profileSummary({ name: "  " })).toBe("")
  })
})
