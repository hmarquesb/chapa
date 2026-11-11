import { describe, expect, it } from "vitest"
import { isUuid, parseChatRequest, parseProfileUpdate } from "@/app/api/_lib/validate"

const SESSION_ID = "0b7c9a52-3f0e-4d4f-9a55-2a1f3c1d9e10"

describe("isUuid", () => {
  it("accepts UUIDs in either case", () => {
    expect(isUuid(SESSION_ID)).toBe(true)
    expect(isUuid(SESSION_ID.toUpperCase())).toBe(true)
  })

  it("rejects anything else", () => {
    expect(isUuid("not-a-uuid")).toBe(false)
    expect(isUuid(`${SESSION_ID} `)).toBe(false)
    expect(isUuid("")).toBe(false)
    expect(isUuid(42)).toBe(false)
    expect(isUuid(null)).toBe(false)
    expect(isUuid(undefined)).toBe(false)
  })
})

describe("parseChatRequest", () => {
  it("accepts a request without sessionId (new conversation)", () => {
    expect(parseChatRequest({ message: "oi" })).toEqual({ ok: true, value: { message: "oi" } })
  })

  it("accepts a request with sessionId and message", () => {
    expect(parseChatRequest({ sessionId: SESSION_ID, message: "Quando cai o repasse?" })).toEqual({
      ok: true,
      value: { sessionId: SESSION_ID, message: "Quando cai o repasse?" },
    })
  })

  it("refuses a malformed sessionId with the fixed text", () => {
    expect(parseChatRequest({ sessionId: "abc", message: "oi" })).toEqual({
      ok: false,
      error: "O identificador da conversa é inválido.",
    })
  })

  it("refuses any profile with the profileInAccount text", () => {
    const error = "O perfil agora fica salvo na conta. Recarregue a página."
    expect(parseChatRequest({ message: "oi", profile: { plan: "misto" } })).toEqual({
      ok: false,
      error,
    })
    expect(parseChatRequest({ message: "oi", profile: { city: "x".repeat(61) } })).toEqual({
      ok: false,
      error,
    })
    expect(parseChatRequest({ sessionId: SESSION_ID, message: "oi", profile: null })).toEqual({
      ok: false,
      error,
    })
  })

  it("leaves message length and content to the assistant guardrail", () => {
    const message = "x".repeat(5000)
    expect(parseChatRequest({ sessionId: SESSION_ID, message: "" }).ok).toBe(true)
    expect(parseChatRequest({ sessionId: SESSION_ID, message }).ok).toBe(true)
  })

  it.each([
    ["a non-object body", "texto"],
    ["null", null],
    ["an array", [SESSION_ID, "oi"]],
    ["an invalid sessionId", { sessionId: "abc", message: "oi" }],
    ["a numeric sessionId", { sessionId: 1, message: "oi" }],
    ["a missing message", { sessionId: SESSION_ID }],
    ["a non-string message", { sessionId: SESSION_ID, message: 42 }],
    ["an unknown top-level key", { sessionId: SESSION_ID, message: "oi", extra: true }],
  ])("rejects %s", (_label, body) => {
    const result = parseChatRequest(body)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/\S/)
  })
})

// The v2 format and its order of checks are tested in src/lib/profile/parse.test.ts; here only
// what the PUT adds: the plan is required and the result has the type of the request.
describe("parseProfileUpdate", () => {
  const PLAN_ERROR = "Escolha o plano: Próprio, Entrega ou Misto."

  it("trims values, drops empty fields and keeps the v2 shape", async () => {
    expect(
      await parseProfileUpdate({
        version: 2,
        name: "  Pizzaria Bella ",
        plan: "entrega",
        cuisine: { id: "pizza" },
        location: { uf: "RJ", cityCode: 3303302 },
        hours: "",
      }),
    ).toEqual({
      ok: true,
      value: {
        version: 2,
        name: "Pizzaria Bella",
        plan: "entrega",
        cuisine: { id: "pizza" },
        location: { uf: "RJ", cityCode: 3303302 },
      },
    })
  })

  it.each([
    ["a missing plan", { version: 2, name: "Bella" }],
    ["an unknown plan", { version: 2, plan: "premium" }],
  ])("refuses %s with the plan text", async (_label, body) => {
    expect(await parseProfileUpdate(body)).toEqual({ ok: false, error: PLAN_ERROR })
  })

  it("refuses the old format with the version text", async () => {
    expect(await parseProfileUpdate({ plan: "misto", name: "Bella" })).toEqual({
      ok: false,
      error: "O formulário do perfil mudou. Recarregue a página.",
    })
  })

  it("refuses an invalid cuisine and a city of another state with the field", async () => {
    expect(
      await parseProfileUpdate({ version: 2, plan: "misto", cuisine: { id: "tailandesa" } }),
    ).toMatchObject({ ok: false, field: "cuisine" })
    expect(
      await parseProfileUpdate({
        version: 2,
        plan: "misto",
        location: { uf: "SP", cityCode: 3304557 },
      }),
    ).toMatchObject({
      ok: false,
      error: "Escolha o estado e a cidade da lista.",
      field: "location",
    })
  })

  it("refuses a disguised term in the name with the field and the reason", async () => {
    expect(await parseProfileUpdate({ version: 2, plan: "misto", name: "M3rd@ Burguer" })).toEqual({
      ok: false,
      error: "Esse nome tem um termo que não é permitido. Escolha outro.",
      field: "name",
      rejection: "termo_inadequado",
    })
  })

  it("refuses a body that is not an object", async () => {
    expect(await parseProfileUpdate(null)).toEqual({
      ok: false,
      error: "O pedido precisa ser um objeto JSON.",
    })
  })
})
