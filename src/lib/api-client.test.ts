import { describe, expect, it } from "vitest"
import { fetchHistory, NETWORK_ERROR_MESSAGE, sendMessage } from "@/lib/api-client"
import type { ChatResponse, SessionHistoryResponse } from "@/lib/types"

const ID = "3f1c2b8e-9a4d-4c1e-8f7a-1b2c3d4e5f60"

type Call = { url: string; init: RequestInit | undefined }

function fakeFetch(response: Response | Error): { fn: typeof fetch; calls: Call[] } {
  const calls: Call[] = []
  const fn = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ url: String(input), init })
    if (response instanceof Error) throw response
    return response
  }) as typeof fetch
  return { fn, calls }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  })
}

describe("sendMessage", () => {
  const reply: ChatResponse = { status: "answered", answer: "Sim.", sources: ["02-repasse.md"] }

  it("posts JSON to /api/chat and returns the reply", async () => {
    const { fn, calls } = fakeFetch(json(reply))
    const result = await sendMessage(
      { sessionId: ID, message: "O repasse cai via Pix?", profile: { name: "Bella" } },
      fn,
    )
    expect(result).toEqual({ ok: true, data: reply })
    expect(calls).toHaveLength(1)
    expect(calls[0]?.url).toBe("/api/chat")
    expect(calls[0]?.init?.method).toBe("POST")
    expect(new Headers(calls[0]?.init?.headers).get("Content-Type")).toBe("application/json")
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual({
      sessionId: ID,
      message: "O repasse cai via Pix?",
      profile: { name: "Bella" },
    })
  })

  it("returns the API error message and status", async () => {
    const { fn } = fakeFetch(json({ error: "Muitas mensagens. Espere um pouco." }, 429))
    expect(await sendMessage({ sessionId: ID, message: "Oi" }, fn)).toEqual({
      ok: false,
      status: 429,
      error: "Muitas mensagens. Espere um pouco.",
    })
  })

  it("uses a generic message when the error body is not the expected JSON", async () => {
    const { fn } = fakeFetch(new Response("<html>Bad gateway</html>", { status: 502 }))
    const result = await sendMessage({ sessionId: ID, message: "Oi" }, fn)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(502)
      expect(result.error).toMatch(/\S/)
    }
  })

  it("rejects a 200 whose body does not match ChatResponse", async () => {
    const { fn } = fakeFetch(json({ answer: 1 }))
    const result = await sendMessage({ sessionId: ID, message: "Oi" }, fn)
    expect(result.ok).toBe(false)
  })

  it("maps a network failure to status 0 and the connection message", async () => {
    const { fn } = fakeFetch(new TypeError("Failed to fetch"))
    expect(await sendMessage({ sessionId: ID, message: "Oi" }, fn)).toEqual({
      ok: false,
      status: 0,
      error: NETWORK_ERROR_MESSAGE,
    })
    expect(NETWORK_ERROR_MESSAGE).toBe("Não consegui falar com o servidor. Confira sua conexão.")
  })
})

describe("fetchHistory", () => {
  const history: SessionHistoryResponse = {
    sessionId: ID,
    profile: { name: "Bella" },
    messages: [
      {
        id: 1,
        role: "user",
        content: "Oi",
        status: null,
        sources: [],
        createdAt: "2026-11-06T14:05:00.000Z",
      },
    ],
  }

  it("gets the session messages from the relative API path", async () => {
    const { fn, calls } = fakeFetch(json(history))
    expect(await fetchHistory(ID, fn)).toEqual({ ok: true, data: history })
    expect(calls[0]?.url).toBe(`/api/sessions/${ID}/messages`)
    expect(calls[0]?.init?.method ?? "GET").toBe("GET")
    expect(calls[0]?.init?.cache).toBe("no-store")
  })

  it("encodes the id in the path", async () => {
    const { fn, calls } = fakeFetch(json({ error: "Id inválido." }, 400))
    await fetchHistory("a/b?c", fn)
    expect(calls[0]?.url).toBe("/api/sessions/a%2Fb%3Fc/messages")
  })

  it("returns status 404 when the session does not exist", async () => {
    const { fn } = fakeFetch(json({ error: "Sessão não encontrada." }, 404))
    expect(await fetchHistory(ID, fn)).toEqual({
      ok: false,
      status: 404,
      error: "Sessão não encontrada.",
    })
  })

  it("returns 404 even when the 404 body is empty", async () => {
    const { fn } = fakeFetch(new Response(null, { status: 404 }))
    const result = await fetchHistory(ID, fn)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(404)
  })

  it("rejects a 200 whose body does not match SessionHistoryResponse", async () => {
    const { fn } = fakeFetch(json({ sessionId: ID }))
    expect((await fetchHistory(ID, fn)).ok).toBe(false)
  })

  it("maps a network failure to status 0", async () => {
    const { fn } = fakeFetch(new TypeError("Failed to fetch"))
    expect(await fetchHistory(ID, fn)).toEqual({
      ok: false,
      status: 0,
      error: NETWORK_ERROR_MESSAGE,
    })
  })
})
