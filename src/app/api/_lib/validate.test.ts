import { describe, expect, it } from "vitest"
import { isUuid, parseChatRequest } from "@/app/api/_lib/validate"

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
  it("accepts a request without profile", () => {
    expect(parseChatRequest({ sessionId: SESSION_ID, message: "Quando cai o repasse?" })).toEqual({
      ok: true,
      value: { sessionId: SESSION_ID, message: "Quando cai o repasse?" },
    })
  })

  it("accepts a profile with known string fields", () => {
    const profile = { name: "Pizzaria Bella", plan: "Básico", city: "" }
    expect(parseChatRequest({ sessionId: SESSION_ID, message: "oi", profile })).toEqual({
      ok: true,
      value: { sessionId: SESSION_ID, message: "oi", profile },
    })
  })

  it("leaves message length and content to the assistant guardrail", () => {
    const message = "x".repeat(5000)
    expect(parseChatRequest({ sessionId: SESSION_ID, message: "" }).ok).toBe(true)
    expect(parseChatRequest({ sessionId: SESSION_ID, message }).ok).toBe(true)
  })

  it("does not keep a reference to the caller's profile object", () => {
    const profile = { name: "Pizzaria Bella" }
    const result = parseChatRequest({ sessionId: SESSION_ID, message: "oi", profile })
    if (!result.ok) throw new Error("expected ok")
    expect(result.value.profile).not.toBe(profile)
  })

  it.each([
    ["a non-object body", "texto"],
    ["null", null],
    ["an array", [SESSION_ID, "oi"]],
    ["a missing sessionId", { message: "oi" }],
    ["an invalid sessionId", { sessionId: "abc", message: "oi" }],
    ["a numeric sessionId", { sessionId: 1, message: "oi" }],
    ["a missing message", { sessionId: SESSION_ID }],
    ["a non-string message", { sessionId: SESSION_ID, message: 42 }],
    ["an unknown top-level key", { sessionId: SESSION_ID, message: "oi", extra: true }],
    ["a null profile", { sessionId: SESSION_ID, message: "oi", profile: null }],
    ["an array profile", { sessionId: SESSION_ID, message: "oi", profile: ["Bella"] }],
    ["a string profile", { sessionId: SESSION_ID, message: "oi", profile: "Bella" }],
    [
      "an unknown profile key",
      { sessionId: SESSION_ID, message: "oi", profile: { name: "Bella", cpf: "x" } },
    ],
    [
      "a non-string profile value",
      { sessionId: SESSION_ID, message: "oi", profile: { name: 123 } },
    ],
    [
      "a profile value longer than 60 chars",
      { sessionId: SESSION_ID, message: "oi", profile: { name: "x".repeat(61) } },
    ],
  ])("rejects %s", (_label, body) => {
    const result = parseChatRequest(body)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toMatch(/\S/)
  })

  it("accepts a profile value with exactly 60 chars", () => {
    const profile = { name: "x".repeat(60) }
    expect(parseChatRequest({ sessionId: SESSION_ID, message: "oi", profile }).ok).toBe(true)
  })
})
