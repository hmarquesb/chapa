import { describe, expect, it } from "vitest"
import {
  BYPASS_HEADER,
  buildRequestHeaders,
  CHAT_INTERVAL_MS,
  checkBlockedInput,
  checkChatAnswered,
  checkChatFallback,
  checkCronUnauthorized,
  checkHealth,
  checkHistory,
  checkHomePage,
  EXPECTED_HISTORY_LENGTH,
  formatStepLine,
  hintForStatus,
  parseBaseUrl,
  SMOKE_MESSAGES,
  type SmokeResponse,
} from "./smoke-checks"

const SESSION_ID = "0b3a6f9e-2c1d-4e8f-9a7b-5c6d7e8f9a0b"

function res(status: number, body: unknown, headers: Record<string, string> = {}): SmokeResponse {
  return { status, headers: new Headers(headers), body }
}

function history(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    sessionId: SESSION_ID,
    profile: { name: "Restaurante Fictício" },
    messages: [
      { id: 1, role: "user", content: SMOKE_MESSAGES.inScope, status: null, sources: [] },
      {
        id: 2,
        role: "assistant",
        content: "Resposta",
        status: "answered",
        sources: ["03-repasse.md"],
      },
      { id: 3, role: "user", content: SMOKE_MESSAGES.outOfScope, status: null, sources: [] },
      { id: 4, role: "assistant", content: "Fallback", status: "fallback", sources: [] },
    ],
    ...overrides,
  }
}

describe("constants", () => {
  it("follows the spec: 2 s between chat calls and 4 saved messages", () => {
    expect(CHAT_INTERVAL_MS).toBe(2000)
    expect(EXPECTED_HISTORY_LENGTH).toBe(4)
  })

  it("uses the questions from the spec, with fictitious data only", () => {
    expect(SMOKE_MESSAGES.inScope).toBe("Quando o repasse cai na minha conta?")
    expect(SMOKE_MESSAGES.outOfScope).toBe("Me passa uma receita de lasanha?")
    expect(SMOKE_MESSAGES.blocked).toBe("Meu CPF é 123.456.789-09")
  })
})

describe("parseBaseUrl", () => {
  it("accepts an https URL and drops the trailing slash", () => {
    expect(parseBaseUrl("https://chapa-demo.vercel.app/")).toEqual({
      ok: true,
      url: "https://chapa-demo.vercel.app",
    })
  })

  it("keeps only the origin, dropping path, query and hash", () => {
    expect(parseBaseUrl("https://chapa-demo.vercel.app/x?y=1#z")).toEqual({
      ok: true,
      url: "https://chapa-demo.vercel.app",
    })
  })

  it("accepts http only for localhost", () => {
    expect(parseBaseUrl("http://localhost:3000")).toEqual({
      ok: true,
      url: "http://localhost:3000",
    })
    expect(parseBaseUrl("http://chapa-demo.vercel.app").ok).toBe(false)
  })

  it("rejects a missing or invalid value", () => {
    expect(parseBaseUrl(undefined).ok).toBe(false)
    expect(parseBaseUrl(true).ok).toBe(false)
    expect(parseBaseUrl("chapa-demo").ok).toBe(false)
    expect(parseBaseUrl("ftp://chapa-demo.vercel.app").ok).toBe(false)
  })
})

describe("buildRequestHeaders", () => {
  it("adds nothing without a bypass secret", () => {
    expect(buildRequestHeaders(undefined)).toEqual({})
    expect(buildRequestHeaders("")).toEqual({})
  })

  it("sends the Vercel protection bypass header when the secret is set", () => {
    expect(buildRequestHeaders("abc")).toEqual({ [BYPASS_HEADER]: "abc" })
    expect(BYPASS_HEADER).toBe("x-vercel-protection-bypass")
  })
})

describe("checkHealth", () => {
  it("passes with 200, ok true and chunks > 0", () => {
    const result = checkHealth(
      res(200, { ok: true, chunks: 42, embeddingModel: "gemini-embedding-001" }),
    )
    expect(result.ok).toBe(true)
    expect(result.ok && result.detail).toContain("42")
  })

  it("fails with zero chunks", () => {
    const result = checkHealth(res(200, { ok: true, chunks: 0, embeddingModel: "m" }))
    expect(result.ok).toBe(false)
    expect(!result.ok && result.reason).toContain("ingest")
  })

  it("fails with ok false or a non-200 status", () => {
    expect(checkHealth(res(503, { ok: false, chunks: 0, embeddingModel: "m" })).ok).toBe(false)
    expect(checkHealth(res(200, { ok: false, chunks: 3, embeddingModel: "m" })).ok).toBe(false)
  })

  it("explains a 500 as a probably missing environment variable", () => {
    const result = checkHealth(res(500, { error: "Algo deu errado do nosso lado." }))
    expect(result.ok).toBe(false)
    expect(!result.ok && result.reason).toContain("variável de ambiente")
  })

  it("fails with a body that is not the health contract", () => {
    expect(checkHealth(res(200, "<html></html>")).ok).toBe(false)
    expect(checkHealth(res(200, { ok: true, chunks: "42" })).ok).toBe(false)
  })
})

describe("checkChatAnswered", () => {
  it("passes with answered and at least one source", () => {
    const result = checkChatAnswered(
      res(200, { status: "answered", answer: "x", sources: ["03-repasse.md"] }),
    )
    expect(result.ok).toBe(true)
  })

  it("fails without sources", () => {
    expect(checkChatAnswered(res(200, { status: "answered", answer: "x", sources: [] })).ok).toBe(
      false,
    )
  })

  it("fails with another status", () => {
    const result = checkChatAnswered(res(200, { status: "fallback", answer: "x", sources: [] }))
    expect(result.ok).toBe(false)
    expect(!result.ok && result.reason).toContain("fallback")
  })

  it("fails with a non-200 status and never echoes the answer", () => {
    const result = checkChatAnswered(res(429, { error: "Muitas mensagens em pouco tempo." }))
    expect(result.ok).toBe(false)
    expect(!result.ok && result.reason).toContain("429")
    expect(!result.ok && result.reason).not.toContain("Muitas mensagens")
  })

  it("does not echo the answer text on success", () => {
    const result = checkChatAnswered(
      res(200, { status: "answered", answer: "TEXTO-DA-RESPOSTA", sources: ["a.md"] }),
    )
    expect(result.ok && result.detail).not.toContain("TEXTO-DA-RESPOSTA")
  })
})

describe("checkChatFallback", () => {
  it("passes with fallback", () => {
    expect(checkChatFallback(res(200, { status: "fallback", answer: "x", sources: [] })).ok).toBe(
      true,
    )
  })

  it("fails with answered", () => {
    expect(
      checkChatFallback(res(200, { status: "answered", answer: "x", sources: ["a.md"] })).ok,
    ).toBe(false)
  })
})

describe("checkBlockedInput", () => {
  it("passes with blocked_input", () => {
    expect(
      checkBlockedInput(res(200, { status: "blocked_input", answer: "x", sources: [] })).ok,
    ).toBe(true)
  })

  it("fails with answered or an HTTP error", () => {
    expect(
      checkBlockedInput(res(200, { status: "answered", answer: "x", sources: ["a.md"] })).ok,
    ).toBe(false)
    expect(checkBlockedInput(res(400, { error: "x" })).ok).toBe(false)
  })
})

describe("checkHistory", () => {
  it("passes with the 4 messages of the two saved turns", () => {
    expect(checkHistory(res(200, history()), SESSION_ID).ok).toBe(true)
  })

  it("fails when the blocked turn was saved", () => {
    const body = history()
    const messages = [...(body.messages as unknown[])]
    messages.push(
      { id: 5, role: "user", content: SMOKE_MESSAGES.blocked, status: null, sources: [] },
      { id: 6, role: "assistant", content: "x", status: "blocked_input", sources: [] },
    )
    const result = checkHistory(res(200, { ...body, messages }), SESSION_ID)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.reason).toContain("6")
  })

  it("fails when the CPF text shows up in any message", () => {
    const body = history()
    const messages = [...(body.messages as Record<string, unknown>[])]
    messages[2] = { ...messages[2], content: SMOKE_MESSAGES.blocked }
    expect(checkHistory(res(200, { ...body, messages }), SESSION_ID).ok).toBe(false)
  })

  it("fails with roles or statuses in the wrong order", () => {
    const body = history()
    const messages = [...(body.messages as Record<string, unknown>[])]
    messages[3] = { ...messages[3], status: "answered" }
    expect(checkHistory(res(200, { ...body, messages }), SESSION_ID).ok).toBe(false)
  })

  it("fails with another session id or a non-200 status", () => {
    expect(
      checkHistory(
        res(200, history({ sessionId: "11111111-1111-4111-8111-111111111111" })),
        SESSION_ID,
      ).ok,
    ).toBe(false)
    expect(checkHistory(res(404, { error: "x" }), SESSION_ID).ok).toBe(false)
  })

  it("never echoes the session id", () => {
    const result = checkHistory(res(200, history({ messages: [] })), SESSION_ID)
    expect(result.ok).toBe(false)
    expect(!result.ok && result.reason).not.toContain(SESSION_ID)
  })
})

describe("checkCronUnauthorized", () => {
  it("passes with our API's 401 JSON error", () => {
    expect(checkCronUnauthorized(res(401, { error: "Não autorizado." })).ok).toBe(true)
  })

  it("fails with 200 (the route ran without the secret)", () => {
    expect(checkCronUnauthorized(res(200, { deletedSessions: 0, deletedRateLimits: 0 })).ok).toBe(
      false,
    )
  })

  it("fails with a 401 that did not come from our API (deployment protection page)", () => {
    const result = checkCronUnauthorized(res(401, "<html>Vercel Authentication</html>"))
    expect(result.ok).toBe(false)
    expect(!result.ok && result.reason).toContain("VERCEL_AUTOMATION_BYPASS_SECRET")
  })
})

describe("checkHomePage", () => {
  const secure = { "Referrer-Policy": "no-referrer", "X-Content-Type-Options": "nosniff" }

  it("passes with 200 and both headers, case-insensitively", () => {
    expect(checkHomePage(res(200, "<html></html>", secure)).ok).toBe(true)
    expect(
      checkHomePage(
        res(200, "", { "referrer-policy": "No-Referrer", "x-content-type-options": "NOSNIFF" }),
      ).ok,
    ).toBe(true)
  })

  it("fails when a header is missing or different", () => {
    const missing = checkHomePage(res(200, "", { "Referrer-Policy": "no-referrer" }))
    expect(missing.ok).toBe(false)
    expect(!missing.ok && missing.reason).toContain("X-Content-Type-Options")
    expect(
      checkHomePage(
        res(200, "", { ...secure, "Referrer-Policy": "strict-origin-when-cross-origin" }),
      ).ok,
    ).toBe(false)
  })

  it("fails with a non-200 status", () => {
    expect(checkHomePage(res(401, "", secure)).ok).toBe(false)
  })
})

describe("hintForStatus", () => {
  it("has a hint for the statuses that usually mean a deploy problem", () => {
    expect(hintForStatus(500)).toContain("variável de ambiente")
    expect(hintForStatus(503)).toContain("Supabase")
    expect(hintForStatus(429)).toContain("cota")
    expect(hintForStatus(401)).toContain("VERCEL_AUTOMATION_BYPASS_SECRET")
    expect(hintForStatus(404)).toContain("URL")
  })

  it("has no hint for other statuses", () => {
    expect(hintForStatus(200)).toBeUndefined()
    expect(hintForStatus(418)).toBeUndefined()
  })
})

describe("formatStepLine", () => {
  it("prints ✅ with the detail on success", () => {
    expect(formatStepLine(1, "GET /api/health", { ok: true, detail: "42 trechos" })).toBe(
      "✅ 1. GET /api/health (42 trechos)",
    )
    expect(formatStepLine(2, "Passo", { ok: true })).toBe("✅ 2. Passo")
  })

  it("prints ❌ with the reason on failure", () => {
    expect(formatStepLine(3, "Passo", { ok: false, reason: "status 500" })).toBe(
      "❌ 3. Passo: status 500",
    )
  })
})
