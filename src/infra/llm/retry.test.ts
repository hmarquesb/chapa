import { describe, expect, it, vi } from "vitest"
import { LlmQuotaError, LlmRequestError, LlmUnavailableError } from "@/core/errors"
import { classifyError, withRetry } from "@/infra/llm/retry"

function httpError(status: number, message = `HTTP ${status}`): Error {
  return Object.assign(new Error(message), { status })
}

function namedError(name: string, message = name): Error {
  const error = new Error(message)
  error.name = name
  return error
}

function failingTimes(times: number, error: unknown) {
  let calls = 0
  return vi.fn(async () => {
    calls += 1
    if (calls <= times) throw error
    return "ok"
  })
}

const fakeSleep = () => vi.fn(async (_ms: number) => {})

describe("classifyError", () => {
  it.each([
    ["status 429", httpError(429)],
    ["code 429", Object.assign(new Error("x"), { code: 429 })],
    ["code '429'", Object.assign(new Error("x"), { code: "429" })],
    ["RESOURCE_EXHAUSTED message", new Error('{"error":{"status":"RESOURCE_EXHAUSTED"}}')],
  ])("returns quota for %s", (_label, error) => {
    expect(classifyError(error)).toBe("quota")
  })

  it.each([
    ["status 500", httpError(500)],
    ["status 503", httpError(503)],
    ["AbortError", namedError("AbortError")],
    ["TimeoutError", namedError("TimeoutError")],
    ["ECONNRESET code", Object.assign(new Error("socket"), { code: "ECONNRESET" })],
    ["ETIMEDOUT message", new Error("connect ETIMEDOUT 1.2.3.4:443")],
    ["ENOTFOUND message", new Error("getaddrinfo ENOTFOUND example")],
    ["fetch failed", new TypeError("fetch failed")],
    [
      "fetch failed with cause",
      new TypeError("x", { cause: Object.assign(new Error("y"), { code: "ECONNRESET" }) }),
    ],
  ])("returns unavailable for %s", (_label, error) => {
    expect(classifyError(error)).toBe("unavailable")
  })

  it.each([
    ["status 400", httpError(400)],
    ["status 403", httpError(403)],
    ["plain error", new Error("boom")],
    ["string", "boom"],
    ["null", null],
    ["undefined", undefined],
  ])("returns request for %s", (_label, error) => {
    expect(classifyError(error)).toBe("request")
  })
})

describe("withRetry (RF6)", () => {
  it("returns the value on the first try without sleeping", async () => {
    const sleep = fakeSleep()
    const fn = vi.fn(async () => 42)
    await expect(withRetry(fn, { retries: 3, baseDelayMs: 1000, sleep })).resolves.toBe(42)
    expect(fn).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it("retries a 429 twice with exponential backoff and then resolves", async () => {
    const sleep = fakeSleep()
    const fn = failingTimes(2, httpError(429))
    await expect(withRetry(fn, { retries: 3, baseDelayMs: 1000, sleep })).resolves.toBe("ok")
    expect(fn).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls).toEqual([[1000], [2000]])
  })

  it("throws LlmRequestError after a single call on a 400", async () => {
    const sleep = fakeSleep()
    const fn = failingTimes(5, httpError(400))
    await expect(withRetry(fn, { retries: 3, baseDelayMs: 1000, sleep })).rejects.toBeInstanceOf(
      LlmRequestError,
    )
    expect(fn).toHaveBeenCalledTimes(1)
    expect(sleep).not.toHaveBeenCalled()
  })

  it("throws LlmUnavailableError after 3 calls when it always fails with 503", async () => {
    const sleep = fakeSleep()
    const fn = failingTimes(10, httpError(503))
    await expect(withRetry(fn, { retries: 3, baseDelayMs: 1000, sleep })).rejects.toBeInstanceOf(
      LlmUnavailableError,
    )
    expect(fn).toHaveBeenCalledTimes(3)
    expect(sleep.mock.calls).toEqual([[1000], [2000]])
  })

  it("throws LlmQuotaError when the quota error persists", async () => {
    const sleep = fakeSleep()
    const fn = failingTimes(10, httpError(429))
    await expect(withRetry(fn, { retries: 2, baseDelayMs: 10, sleep })).rejects.toBeInstanceOf(
      LlmQuotaError,
    )
    expect(fn).toHaveBeenCalledTimes(2)
    expect(sleep.mock.calls).toEqual([[10]])
  })

  it("translates the error of the last attempt", async () => {
    const sleep = fakeSleep()
    let calls = 0
    const fn = vi.fn(async () => {
      calls += 1
      throw calls === 1 ? httpError(503) : httpError(429)
    })
    await expect(withRetry(fn, { retries: 2, baseDelayMs: 1, sleep })).rejects.toBeInstanceOf(
      LlmQuotaError,
    )
  })

  it("stops retrying when a request error follows a transient one", async () => {
    const sleep = fakeSleep()
    let calls = 0
    const fn = vi.fn(async () => {
      calls += 1
      throw calls === 1 ? httpError(503) : httpError(400)
    })
    await expect(withRetry(fn, { retries: 3, baseDelayMs: 1, sleep })).rejects.toBeInstanceOf(
      LlmRequestError,
    )
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it("makes at least one attempt when retries is lower than 1", async () => {
    const fn = vi.fn(async () => "ok")
    await expect(withRetry(fn, { retries: 0, baseDelayMs: 1, sleep: fakeSleep() })).resolves.toBe(
      "ok",
    )
    expect(fn).toHaveBeenCalledTimes(1)
  })

  it("uses a real timer when no sleep is given", async () => {
    const fn = failingTimes(1, httpError(503))
    await expect(withRetry(fn, { retries: 2, baseDelayMs: 1 })).resolves.toBe("ok")
  })

  it("never copies the original message into the translated error (RNF4)", async () => {
    const secret = "SEGREDO-123"
    for (const status of [400, 429, 503]) {
      const fn = failingTimes(10, httpError(status, `prompt was: ${secret}`))
      const error = await withRetry(fn, { retries: 2, baseDelayMs: 1, sleep: fakeSleep() }).catch(
        (e: unknown) => e,
      )
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).not.toContain(secret)
      expect(String((error as Error).cause ?? "")).not.toContain(secret)
    }
  })

  it("keeps the HTTP status in the message of a request error", async () => {
    const fn = failingTimes(1, httpError(403))
    await expect(withRetry(fn, { retries: 3, baseDelayMs: 1, sleep: fakeSleep() })).rejects.toThrow(
      /403/,
    )
  })
})
