import { describe, expect, it } from "vitest"
import { HttpError, json, readJsonBody } from "@/app/api/_lib/http"

function post(body: BodyInit | null, headers: Record<string, string> = {}): Request {
  return new Request("http://localhost/api/chat", { method: "POST", body, headers })
}

// A body sent as a stream has no Content-Length, so readJsonBody must count the bytes itself.
function streamOf(...parts: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder()
  return new ReadableStream({
    start(controller) {
      for (const part of parts) controller.enqueue(encoder.encode(part))
      controller.close()
    },
  })
}

function streamed(stream: ReadableStream<Uint8Array>): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    body: stream,
    duplex: "half",
  } as RequestInit)
}

async function rejection(promise: Promise<unknown>): Promise<HttpError> {
  try {
    await promise
  } catch (error) {
    if (error instanceof HttpError) return error
    throw error
  }
  throw new Error("expected HttpError")
}

describe("HttpError", () => {
  it("keeps the status and the public message", () => {
    const error = new HttpError(413, "Grande demais")
    expect(error).toBeInstanceOf(Error)
    expect(error.status).toBe(413)
    expect(error.publicMessage).toBe("Grande demais")
    expect(error.name).toBe("HttpError")
    expect(error.field).toBeUndefined()
  })

  it("keeps the optional field", () => {
    expect(new HttpError(400, "Troque o nome", "name").field).toBe("name")
  })
})

describe("readJsonBody", () => {
  it("parses a JSON body within the limit", async () => {
    await expect(readJsonBody(post('{"a":1,"b":"ção"}'), 100)).resolves.toEqual({ a: 1, b: "ção" })
  })

  it("rejects by Content-Length before reading the body", async () => {
    let pulled = false
    const stream = new ReadableStream<Uint8Array>(
      {
        pull() {
          pulled = true
        },
      },
      { highWaterMark: 0 }, // no eager pull: only a read() would call pull()
    )
    const req = new Request("http://localhost/api/chat", {
      method: "POST",
      body: stream,
      headers: { "content-length": "5000" },
      duplex: "half",
    } as RequestInit)
    const error = await rejection(readJsonBody(req, 4096))
    expect(error.status).toBe(413)
    expect(pulled).toBe(false)
  })

  it("rejects a streamed body that passes the limit", async () => {
    const error = await rejection(
      readJsonBody(streamed(streamOf('{"a":"', "x".repeat(50), '"}')), 20),
    )
    expect(error.status).toBe(413)
  })

  it("counts bytes, not characters", async () => {
    // "ç" is 2 bytes in UTF-8: 6 characters, 12 bytes inside the quotes.
    const body = JSON.stringify("çççççç")
    expect(body.length).toBe(8)
    const error = await rejection(readJsonBody(streamed(streamOf(body)), 10))
    expect(error.status).toBe(413)
  })

  it("accepts a body of exactly the limit", async () => {
    const body = JSON.stringify("x".repeat(8)) // 10 bytes
    await expect(readJsonBody(streamed(streamOf(body)), 10)).resolves.toBe("xxxxxxxx")
  })

  it("rejects invalid JSON with 400", async () => {
    expect((await rejection(readJsonBody(post("{oops"), 100))).status).toBe(400)
  })

  it("rejects an empty body with 400", async () => {
    expect((await rejection(readJsonBody(post(""), 100))).status).toBe(400)
    expect((await rejection(readJsonBody(post(null), 100))).status).toBe(400)
  })

  it("rejects invalid UTF-8 with 400", async () => {
    const bytes = new Uint8Array([0x22, 0xff, 0xfe, 0x22])
    expect((await rejection(readJsonBody(post(bytes), 100))).status).toBe(400)
  })
})

describe("json", () => {
  it("serializes the body with a JSON content type and no caching", async () => {
    const res = json({ ok: true })
    expect(res.status).toBe(200)
    expect(res.headers.get("content-type")).toMatch(/^application\/json/)
    expect(res.headers.get("cache-control")).toBe("no-store")
    await expect(res.json()).resolves.toEqual({ ok: true })
  })

  it("applies status and extra headers", () => {
    const res = json({ error: "x" }, { status: 429, headers: { "Retry-After": "12" } })
    expect(res.status).toBe(429)
    expect(res.headers.get("retry-after")).toBe("12")
    expect(res.headers.get("cache-control")).toBe("no-store")
  })
})
