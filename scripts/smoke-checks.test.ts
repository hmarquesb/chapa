import { describe, expect, it } from "vitest"
import {
  BYPASS_ENV,
  BYPASS_HEADER,
  buildRequestHeaders,
  CHAT_INTERVAL_MS,
  checkBlockedInput,
  checkChatAnswered,
  checkChatFallback,
  checkCronUnauthorized,
  checkDemoProfile,
  checkDemoSignIn,
  checkHealth,
  checkHistory,
  checkHomePage,
  checkSessionList,
  checkSignInPage,
  checkUnauthenticatedChat,
  EXPECTED_HISTORY_LENGTH,
  formatStepLine,
  hintForStatus,
  mergeCookies,
  parseBaseUrl,
  readChatSessionId,
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
      res(200, {
        status: "answered",
        answer: "x",
        sources: ["03-repasse.md"],
        sessionId: SESSION_ID,
      }),
    )
    expect(result.ok).toBe(true)
  })

  it("fails without sources", () => {
    expect(
      checkChatAnswered(
        res(200, { status: "answered", answer: "x", sources: [], sessionId: SESSION_ID }),
      ).ok,
    ).toBe(false)
  })

  it("fails with another status", () => {
    const result = checkChatAnswered(
      res(200, { status: "fallback", answer: "x", sources: [], sessionId: SESSION_ID }),
    )
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
      res(200, {
        status: "answered",
        answer: "TEXTO-DA-RESPOSTA",
        sources: ["a.md"],
        sessionId: SESSION_ID,
      }),
    )
    expect(result.ok && result.detail).not.toContain("TEXTO-DA-RESPOSTA")
  })
})

describe("chat contract with sessionId", () => {
  it("accepts a null sessionId and rejects a missing or non-string one", () => {
    const body = { status: "fallback", answer: "x", sources: [] }
    expect(checkChatFallback(res(200, { ...body, sessionId: null })).ok).toBe(true)
    expect(checkChatFallback(res(200, body)).ok).toBe(false)
    expect(checkChatFallback(res(200, { ...body, sessionId: 7 })).ok).toBe(false)
  })

  it("never echoes the sessionId", () => {
    const result = checkChatAnswered(
      res(200, { status: "answered", answer: "x", sources: ["a.md"], sessionId: SESSION_ID }),
    )
    expect(result.ok && result.detail).not.toContain(SESSION_ID)
  })
})

describe("readChatSessionId", () => {
  it("returns the id of a 200 reply", () => {
    expect(readChatSessionId(res(200, { sessionId: SESSION_ID }))).toBe(SESSION_ID)
  })

  it("returns null for errors, null ids and malformed bodies", () => {
    expect(readChatSessionId(res(429, { sessionId: SESSION_ID }))).toBeNull()
    expect(readChatSessionId(res(200, { sessionId: null }))).toBeNull()
    expect(readChatSessionId(res(200, { sessionId: "not-a-uuid" }))).toBeNull()
    expect(readChatSessionId(res(200, "text"))).toBeNull()
  })
})

describe("checkSessionList", () => {
  const item = { id: SESSION_ID, title: "Pergunta", lastActivityAt: "2026-11-10T14:05:00Z" }

  it("passes when the list has the conversation", () => {
    const result = checkSessionList(res(200, { sessions: [item] }), SESSION_ID)
    expect(result.ok).toBe(true)
    expect(result.ok && result.detail).not.toContain(SESSION_ID)
  })

  it("fails when the conversation is missing from the list", () => {
    const other = { ...item, id: "11111111-2222-4333-8444-555555555555" }
    expect(checkSessionList(res(200, { sessions: [other] }), SESSION_ID).ok).toBe(false)
    expect(checkSessionList(res(200, { sessions: [] }), SESSION_ID).ok).toBe(false)
  })

  it("fails on an HTTP error or a body outside the contract", () => {
    expect(checkSessionList(res(401, { error: "x" }), SESSION_ID).ok).toBe(false)
    expect(checkSessionList(res(200, { foo: 1 }), SESSION_ID).ok).toBe(false)
    expect(checkSessionList(res(200, { sessions: [{ id: SESSION_ID }] }), SESSION_ID).ok).toBe(
      false,
    )
  })
})

describe("checkChatFallback", () => {
  it("passes with fallback", () => {
    expect(
      checkChatFallback(
        res(200, { status: "fallback", answer: "x", sources: [], sessionId: SESSION_ID }),
      ).ok,
    ).toBe(true)
  })

  it("fails with answered", () => {
    expect(
      checkChatFallback(
        res(200, { status: "answered", answer: "x", sources: ["a.md"], sessionId: SESSION_ID }),
      ).ok,
    ).toBe(false)
  })
})

describe("checkBlockedInput", () => {
  it("passes with blocked_input", () => {
    expect(
      checkBlockedInput(
        res(200, { status: "blocked_input", answer: "x", sources: [], sessionId: SESSION_ID }),
      ).ok,
    ).toBe(true)
  })

  it("fails with answered or an HTTP error", () => {
    expect(
      checkBlockedInput(
        res(200, { status: "answered", answer: "x", sources: ["a.md"], sessionId: SESSION_ID }),
      ).ok,
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

  it("explains redirects as the Vercel login page of a protected deploy", () => {
    for (const status of [302, 303, 307, 308]) {
      expect(hintForStatus(status)).toContain("VERCEL_AUTOMATION_BYPASS_SECRET")
    }
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

describe("mergeCookies", () => {
  function withCookies(...cookies: string[]): Headers {
    const headers = new Headers()
    for (const cookie of cookies) headers.append("set-cookie", cookie)
    return headers
  }

  it("turns Set-Cookie headers into a Cookie header, without attributes", () => {
    expect(
      mergeCookies("", withCookies("a=1; Path=/; HttpOnly", "b=2; Path=/; SameSite=lax")),
    ).toBe("a=1; b=2")
  })

  it("keeps the current cookies and the last value of each name", () => {
    expect(mergeCookies("a=1; b=2", withCookies("b=3; Path=/", "c=4", "b=5"))).toBe("a=1; b=5; c=4")
  })

  it("drops a cookie that the server cleared", () => {
    expect(mergeCookies("a=1; b=2", withCookies("a=; Path=/; Max-Age=0"))).toBe("b=2")
  })

  it("returns the current header when there is no Set-Cookie", () => {
    expect(mergeCookies("a=1", new Headers())).toBe("a=1")
    expect(mergeCookies("", new Headers())).toBe("")
  })
})

describe("checkUnauthenticatedChat", () => {
  it("passes on 401 with an error from our API", () => {
    expect(
      checkUnauthenticatedChat(
        res(401, { error: "Sua sessão terminou. Entre de novo para continuar." }),
      ),
    ).toEqual({ ok: true })
  })

  it("fails when the chat answers without a session", () => {
    const result = checkUnauthenticatedChat(res(200, { status: "answered" }))
    expect(result.ok).toBe(false)
    expect(!result.ok && result.reason).toContain("sem login")
  })

  it("fails on a 401 that did not come from our API", () => {
    const result = checkUnauthenticatedChat(res(401, "<html>Vercel</html>"))
    expect(!result.ok && result.reason).toContain(BYPASS_ENV)
  })
})

describe("checkSignInPage", () => {
  it("passes on 200 with the demo button", () => {
    expect(checkSignInPage(res(200, "<html><button>Testar como demo</button></html>"))).toEqual({
      ok: true,
    })
  })

  it("fails without the demo button or with another status", () => {
    expect(checkSignInPage(res(200, "<html>outra página</html>")).ok).toBe(false)
    expect(checkSignInPage(res(307, "")).ok).toBe(false)
  })
})

describe("checkDemoSignIn", () => {
  function signIn(status: number, location: string | null, cookies: string[]): SmokeResponse {
    const headers = new Headers()
    if (location !== null) headers.set("location", location)
    for (const cookie of cookies) headers.append("set-cookie", cookie)
    return { status, headers, body: "" }
  }

  it("passes on a redirect out of /entrar with a session cookie", () => {
    expect(
      checkDemoSignIn(
        signIn(302, "http://localhost:3000/", ["authjs.session-token=x; Path=/; HttpOnly"]),
      ),
    ).toEqual({ ok: true })
    expect(
      checkDemoSignIn(
        signIn(303, "https://demo.exemplo.com/", [
          "__Secure-authjs.session-token=x; Path=/; HttpOnly; Secure",
        ]),
      ),
    ).toEqual({ ok: true })
  })

  it("fails with the limit hint when Auth.js answers code=demo_limit", () => {
    const result = checkDemoSignIn(
      signIn(302, "http://localhost:3000/entrar?error=CredentialsSignin&code=demo_limit", []),
    )
    expect(result.ok).toBe(false)
    expect(!result.ok && result.reason).toContain("5 contas demo")
  })

  it("fails on another redirect to /entrar or without the session cookie", () => {
    expect(
      checkDemoSignIn(signIn(302, "http://localhost:3000/entrar?error=Configuration", [])).ok,
    ).toBe(false)
    expect(checkDemoSignIn(signIn(302, "http://localhost:3000/", ["outro=1"])).ok).toBe(false)
    expect(checkDemoSignIn(signIn(200, null, [])).ok).toBe(false)
  })

  it("never echoes the cookie value", () => {
    const result = checkDemoSignIn(
      signIn(302, "http://localhost:3000/entrar", ["authjs.session-token=VALOR-SECRETO"]),
    )
    expect(JSON.stringify(result)).not.toContain("VALOR-SECRETO")
  })
})

describe("checkDemoProfile", () => {
  it("passes on 200 with the Misto plan", () => {
    expect(
      checkDemoProfile(res(200, { profile: { name: "Marmitaria Boa Panela", plan: "misto" } })),
    ).toEqual({
      ok: true,
    })
  })

  it("fails on another status", () => {
    expect(checkDemoProfile(res(401, { error: "Faça login." })).ok).toBe(false)
  })

  it("fails when the plan is missing or not misto", () => {
    expect(checkDemoProfile(res(200, { profile: {} })).ok).toBe(false)
    expect(checkDemoProfile(res(200, { profile: { plan: "proprio" } })).ok).toBe(false)
    expect(checkDemoProfile(res(200, { ok: true })).ok).toBe(false)
  })
})
