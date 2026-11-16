import { describe, expect, it } from "vitest"
import {
  deleteAccount,
  deleteSession,
  fetchHistory,
  listSessions,
  markWelcomeSeen,
  NETWORK_ERROR_MESSAGE,
  saveProfile,
  sendMessage,
} from "@/lib/api-client"
import type {
  ChatResponse,
  ProgressEvent,
  SessionHistoryResponse,
  SessionListResponse,
} from "@/lib/types"

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
  const reply: ChatResponse = {
    status: "answered",
    answer: "Sim.",
    sources: ["02-repasse.md"],
    sessionId: ID,
  }

  it("posts JSON to /api/chat and returns the reply", async () => {
    const { fn, calls } = fakeFetch(json(reply))
    const result = await sendMessage(
      { sessionId: ID, message: "O repasse cai via Pix?" },
      undefined,
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
    })
  })

  it("accepts a small_talk reply", async () => {
    const greeting: ChatResponse = {
      status: "small_talk",
      answer: "Bom dia! Em que posso ajudar?",
      sources: [],
      sessionId: ID,
    }
    const { fn } = fakeFetch(json(greeting))
    expect(await sendMessage({ sessionId: ID, message: "bom dia" }, undefined, fn)).toEqual({
      ok: true,
      data: greeting,
    })
  })

  it("returns the API error message and status", async () => {
    const { fn } = fakeFetch(json({ error: "Muitas mensagens. Espere um pouco." }, 429))
    expect(await sendMessage({ sessionId: ID, message: "Oi" }, undefined, fn)).toEqual({
      ok: false,
      status: 429,
      error: "Muitas mensagens. Espere um pouco.",
    })
  })

  it("uses a generic message when the error body is not the expected JSON", async () => {
    const { fn } = fakeFetch(new Response("<html>Bad gateway</html>", { status: 502 }))
    const result = await sendMessage({ sessionId: ID, message: "Oi" }, undefined, fn)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.status).toBe(502)
      expect(result.error).toMatch(/\S/)
    }
  })

  it("rejects a 200 whose body does not match ChatResponse", async () => {
    const { fn } = fakeFetch(json({ answer: 1 }))
    const result = await sendMessage({ sessionId: ID, message: "Oi" }, undefined, fn)
    expect(result.ok).toBe(false)
  })

  it("maps a network failure to status 0 and the connection message", async () => {
    const { fn } = fakeFetch(new TypeError("Failed to fetch"))
    expect(await sendMessage({ sessionId: ID, message: "Oi" }, undefined, fn)).toEqual({
      ok: false,
      status: 0,
      error: NETWORK_ERROR_MESSAGE,
    })
    expect(NETWORK_ERROR_MESSAGE).toBe("Não consegui falar com o servidor. Confira sua conexão.")
  })
})

// Corpo NDJSON entregue em pedaços arbitrários, como a rede faz.
function ndjson(...chunks: string[]): Response {
  const encoder = new TextEncoder()
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(encoder.encode(chunk))
      controller.close()
    },
  })
  return new Response(body, {
    status: 200,
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8" },
  })
}

describe("sendMessage NDJSON", () => {
  const reply: ChatResponse = {
    status: "answered",
    answer: "Sim.\nCai no ciclo.",
    sources: ["02-repasse.md"],
    sessionId: ID,
  }
  const INVALID = "O servidor mandou uma resposta inesperada. Tente de novo."

  function send(response: Response) {
    const steps: ProgressEvent[] = []
    const { fn, calls } = fakeFetch(response)
    const result = sendMessage(
      { sessionId: ID, message: "Quando cai o repasse?" },
      { onProgress: (event) => steps.push(event) },
      fn,
    )
    return { result, steps, calls }
  }

  it("asks for NDJSON", async () => {
    const { result, calls } = send(json(reply))
    await result
    const headers = new Headers(calls[0]?.init?.headers)
    expect(headers.get("Accept")).toBe("application/x-ndjson")
    expect(headers.get("Content-Type")).toBe("application/json")
  })

  it("reports each step in order and returns the reply", async () => {
    const { result, steps } = send(
      ndjson(
        '{"type":"step","step":"history"}\n{"type":"step","st',
        'ep":"understanding"}\n',
        '{"type":"step","step":"searching"}\r\n{"type":"step","step":"writing","documents":2}\n',
        `${JSON.stringify({ type: "reply", ...reply }).slice(0, 20)}`,
        `${JSON.stringify({ type: "reply", ...reply }).slice(20)}\n`,
      ),
    )
    expect(await result).toEqual({ ok: true, data: reply })
    expect(steps).toEqual([
      { step: "history" },
      { step: "understanding" },
      { step: "searching" },
      { step: "writing", documents: 2 },
    ])
  })

  it("accepts a last line without the final newline", async () => {
    const { result } = send(ndjson(JSON.stringify({ type: "reply", ...reply })))
    expect(await result).toEqual({ ok: true, data: reply })
  })

  it("turns the error event into a 500 with its text", async () => {
    const { result, steps } = send(
      ndjson('{"type":"step","step":"searching"}\n{"type":"error","error":"Fora do ar."}\n'),
    )
    expect(await result).toEqual({ ok: false, status: 500, error: "Fora do ar." })
    expect(steps).toEqual([{ step: "searching" }])
  })

  it("answers the unexpected-reply text for a body without an ending", async () => {
    const { result } = send(ndjson('{"type":"step","step":"history"}\n'))
    const value = await result
    expect(value.ok).toBe(false)
    if (!value.ok) expect(value.error).toBe(INVALID)
  })

  it("answers the unexpected-reply text for an invalid line", async () => {
    const { result } = send(ndjson('{"type":"step","step":"history"}\n{"type":\n'))
    const value = await result
    expect(value.ok).toBe(false)
    if (!value.ok) expect(value.error).toBe(INVALID)
  })

  it("keeps the JSON path for JSON replies and errors", async () => {
    const ok = send(json(reply))
    expect(await ok.result).toEqual({ ok: true, data: reply })
    expect(ok.steps).toEqual([])
    const limited = send(json({ error: "Muitas mensagens. Espere um pouco." }, 429))
    expect(await limited.result).toEqual({
      ok: false,
      status: 429,
      error: "Muitas mensagens. Espere um pouco.",
    })
  })
})

describe("fetchHistory", () => {
  const history: SessionHistoryResponse = {
    sessionId: ID,
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

describe("sendMessage sessionId", () => {
  const base = { status: "blocked_input", answer: "Não posso.", sources: [] }

  it("accepts a null sessionId", async () => {
    const { fn } = fakeFetch(json({ ...base, sessionId: null }))
    expect((await sendMessage({ message: "Oi" }, undefined, fn)).ok).toBe(true)
  })

  it("rejects a reply without sessionId or with a non-string one", async () => {
    expect((await sendMessage({ message: "Oi" }, undefined, fakeFetch(json(base)).fn)).ok).toBe(
      false,
    )
    expect(
      (
        await sendMessage(
          { message: "Oi" },
          undefined,
          fakeFetch(json({ ...base, sessionId: 3 })).fn,
        )
      ).ok,
    ).toBe(false)
  })
})

describe("listSessions", () => {
  const list: SessionListResponse = {
    sessions: [{ id: ID, title: "O repasse cai via Pix?", lastActivityAt: "2026-11-10T14:05:00Z" }],
  }

  it("gets /api/sessions without cache and returns the list", async () => {
    const { fn, calls } = fakeFetch(json(list))
    expect(await listSessions(fn)).toEqual({ ok: true, data: list })
    expect(calls[0]?.url).toBe("/api/sessions")
    expect(calls[0]?.init?.method).toBe("GET")
    expect(calls[0]?.init?.cache).toBe("no-store")
  })

  it("accepts an empty list", async () => {
    const { fn } = fakeFetch(json({ sessions: [] }))
    expect(await listSessions(fn)).toEqual({ ok: true, data: { sessions: [] } })
  })

  it("returns the 401 status", async () => {
    const { fn } = fakeFetch(json({ error: "Entre para continuar." }, 401))
    expect(await listSessions(fn)).toEqual({
      ok: false,
      status: 401,
      error: "Entre para continuar.",
    })
  })

  it("rejects an unexpected body", async () => {
    expect((await listSessions(fakeFetch(json({ sessions: [{ id: ID }] })).fn)).ok).toBe(false)
    expect((await listSessions(fakeFetch(json({})).fn)).ok).toBe(false)
  })
})

describe("deleteSession", () => {
  it("sends DELETE to /api/sessions/<id> and treats 204 as ok", async () => {
    const { fn, calls } = fakeFetch(new Response(null, { status: 204 }))
    expect(await deleteSession(ID, fn)).toEqual({ ok: true, data: null })
    expect(calls[0]?.url).toBe(`/api/sessions/${ID}`)
    expect(calls[0]?.init?.method).toBe("DELETE")
  })

  it("returns the 401 status", async () => {
    const { fn } = fakeFetch(json({ error: "Entre para continuar." }, 401))
    const result = await deleteSession(ID, fn)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.status).toBe(401)
  })

  it("rejects an unexpected body on a 2xx other than 204", async () => {
    const { fn } = fakeFetch(json({ ok: true }, 200))
    expect((await deleteSession(ID, fn)).ok).toBe(false)
  })

  it("maps a network failure to status 0", async () => {
    const { fn } = fakeFetch(new TypeError("Failed to fetch"))
    expect(await deleteSession(ID, fn)).toEqual({
      ok: false,
      status: 0,
      error: NETWORK_ERROR_MESSAGE,
    })
  })
})

describe("saveProfile", () => {
  const profile = { version: 2 as const, name: "Bella", plan: "misto" as const }

  it("puts JSON to /api/profile and returns the saved profile", async () => {
    const { fn, calls } = fakeFetch(json({ profile, needsReview: false }))
    expect(await saveProfile(profile, fn)).toEqual({
      ok: true,
      data: { profile, needsReview: false },
    })
    expect(calls[0]?.url).toBe("/api/profile")
    expect(calls[0]?.init?.method).toBe("PUT")
    expect(new Headers(calls[0]?.init?.headers).get("Content-Type")).toBe("application/json")
    expect(JSON.parse(String(calls[0]?.init?.body))).toEqual(profile)
  })

  it("returns the API error message and status", async () => {
    const { fn } = fakeFetch(json({ error: "Escolha um plano." }, 400))
    expect(await saveProfile(profile, fn)).toEqual({
      ok: false,
      status: 400,
      error: "Escolha um plano.",
    })
  })

  it("returns the field of a 400 when the API names one", async () => {
    const { fn } = fakeFetch(json({ error: "Nome recusado.", field: "name" }, 400))
    expect(await saveProfile(profile, fn)).toEqual({
      ok: false,
      status: 400,
      error: "Nome recusado.",
      field: "name",
    })
  })

  it("ignores an unknown field in the error body", async () => {
    const { fn } = fakeFetch(json({ error: "Erro.", field: "cnpj" }, 400))
    const result = await saveProfile(profile, fn)
    expect(result).toEqual({ ok: false, status: 400, error: "Erro." })
  })

  it.each(["hours", "hours.seg", "hours.dom"])("keeps the %s field of a 400", async (field) => {
    const { fn } = fakeFetch(json({ error: "Erro.", field }, 400))
    expect(await saveProfile(profile, fn)).toEqual({
      ok: false,
      status: 400,
      error: "Erro.",
      field,
    })
  })

  it("ignores an unknown day in the hours field", async () => {
    const { fn } = fakeFetch(json({ error: "Erro.", field: "hours.xyz" }, 400))
    expect(await saveProfile(profile, fn)).toEqual({ ok: false, status: 400, error: "Erro." })
  })

  it("rejects a reply without a profile object", async () => {
    const { fn } = fakeFetch(json({ ok: true }))
    const result = await saveProfile(profile, fn)
    expect(result.ok).toBe(false)
  })

  it("rejects a reply without a boolean needsReview", async () => {
    const { fn } = fakeFetch(json({ profile }))
    const result = await saveProfile(profile, fn)
    expect(result.ok).toBe(false)
    const { fn: fn2 } = fakeFetch(json({ profile, needsReview: "no" }))
    expect((await saveProfile(profile, fn2)).ok).toBe(false)
  })

  it("keeps the location field of a 400", async () => {
    const { fn } = fakeFetch(json({ error: "Local inválido.", field: "location" }, 400))
    expect(await saveProfile(profile, fn)).toEqual({
      ok: false,
      status: 400,
      error: "Local inválido.",
      field: "location",
    })
  })

  it("reports a network failure with status 0", async () => {
    const { fn } = fakeFetch(new Error("offline"))
    expect(await saveProfile(profile, fn)).toEqual({
      ok: false,
      status: 0,
      error: NETWORK_ERROR_MESSAGE,
    })
  })
})

describe("deleteAccount", () => {
  it("treats 204 as success", async () => {
    const { fn, calls } = fakeFetch(new Response(null, { status: 204 }))
    expect(await deleteAccount(fn)).toEqual({ ok: true, data: null })
    expect(calls[0]?.url).toBe("/api/account")
    expect(calls[0]?.init?.method).toBe("DELETE")
  })

  it("returns the status and message on error", async () => {
    const { fn } = fakeFetch(json({ error: "Faça login." }, 401))
    expect(await deleteAccount(fn)).toEqual({ ok: false, status: 401, error: "Faça login." })
  })

  it("treats another 2xx as unexpected", async () => {
    const { fn } = fakeFetch(json({}, 200))
    expect((await deleteAccount(fn)).ok).toBe(false)
  })

  it("reports a network failure with status 0", async () => {
    const { fn } = fakeFetch(new Error("offline"))
    expect(await deleteAccount(fn)).toEqual({ ok: false, status: 0, error: NETWORK_ERROR_MESSAGE })
  })
})

describe("markWelcomeSeen", () => {
  it("posts without a body and treats 204 as success", async () => {
    const { fn, calls } = fakeFetch(new Response(null, { status: 204 }))
    expect(await markWelcomeSeen(fn)).toEqual({ ok: true, data: null })
    expect(calls[0]?.url).toBe("/api/account/welcome")
    expect(calls[0]?.init?.method).toBe("POST")
    expect(calls[0]?.init?.body).toBeUndefined()
    expect(calls[0]?.init?.cache).toBe("no-store")
  })

  it("returns the status and message on error", async () => {
    const { fn } = fakeFetch(json({ error: "Faça login." }, 401))
    expect(await markWelcomeSeen(fn)).toEqual({ ok: false, status: 401, error: "Faça login." })
  })

  it("reports a network failure with status 0", async () => {
    const { fn } = fakeFetch(new Error("offline"))
    expect(await markWelcomeSeen(fn)).toEqual({
      ok: false,
      status: 0,
      error: NETWORK_ERROR_MESSAGE,
    })
  })
})
