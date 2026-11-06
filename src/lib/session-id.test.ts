import { describe, expect, it } from "vitest"
import {
  buildContinueLink,
  isUuid,
  randomSessionId,
  resolveInitialSession,
  SESSION_QUERY_PARAM,
  SESSION_STORAGE_KEY,
} from "@/lib/session-id"

const A = "3f1c2b8e-9a4d-4c1e-8f7a-1b2c3d4e5f60"
const B = "a0b1c2d3-e4f5-4a6b-9c8d-7e6f5a4b3c2d"
const NEW = "11111111-2222-4333-8444-555555555555"
const newId = () => NEW

describe("constants", () => {
  it("uses the documented storage key and query param", () => {
    expect(SESSION_STORAGE_KEY).toBe("chapa:sessionId")
    expect(SESSION_QUERY_PARAM).toBe("sessao")
  })
})

describe("isUuid", () => {
  it("accepts canonical UUIDs in any case", () => {
    expect(isUuid(A)).toBe(true)
    expect(isUuid(A.toUpperCase())).toBe(true)
  })

  it("rejects anything that is not a UUID", () => {
    expect(isUuid("")).toBe(false)
    expect(isUuid("abc")).toBe(false)
    expect(isUuid(`${A}x`)).toBe(false)
    expect(isUuid(` ${A}`)).toBe(false)
    expect(isUuid(A.replaceAll("-", ""))).toBe(false)
    expect(isUuid("3f1c2b8e-9a4d-4c1e-8f7a-1b2c3d4e5fzz")).toBe(false)
  })
})

describe("resolveInitialSession", () => {
  it("prefers a valid id from the link", () => {
    expect(resolveInitialSession({ queryValue: A, storedValue: B, newId })).toEqual({
      sessionId: A,
      source: "link",
    })
  })

  it("falls back to a valid stored id when the link is invalid", () => {
    expect(resolveInitialSession({ queryValue: "abc", storedValue: B, newId })).toEqual({
      sessionId: B,
      source: "storage",
    })
  })

  it("uses the stored id when there is no link", () => {
    expect(resolveInitialSession({ queryValue: null, storedValue: B, newId })).toEqual({
      sessionId: B,
      source: "storage",
    })
  })

  it("creates a new id when nothing valid exists", () => {
    expect(resolveInitialSession({ queryValue: null, storedValue: null, newId })).toEqual({
      sessionId: NEW,
      source: "new",
    })
    expect(resolveInitialSession({ queryValue: "x", storedValue: "y", newId })).toEqual({
      sessionId: NEW,
      source: "new",
    })
  })

  it("only calls newId when it needs a new id", () => {
    let calls = 0
    const counting = () => {
      calls += 1
      return NEW
    }
    resolveInitialSession({ queryValue: A, storedValue: null, newId: counting })
    resolveInitialSession({ queryValue: null, storedValue: B, newId: counting })
    expect(calls).toBe(0)
  })
})

describe("buildContinueLink", () => {
  it("builds the continuation link on the root path", () => {
    expect(buildContinueLink("https://chapa.example", A)).toBe(`https://chapa.example/?sessao=${A}`)
  })

  it("does not duplicate the slash when the origin ends with one", () => {
    expect(buildContinueLink("http://localhost:3000/", A)).toBe(
      `http://localhost:3000/?sessao=${A}`,
    )
  })
})

describe("randomSessionId", () => {
  it("uses crypto.randomUUID when available", () => {
    expect(randomSessionId({ randomUUID: () => A, getRandomValues: (a) => a })).toBe(A)
  })

  it("falls back to getRandomValues and returns a v4 UUID", () => {
    const id = randomSessionId({
      getRandomValues: <T extends ArrayBufferView | null>(array: T) => {
        if (array instanceof Uint8Array) array.fill(0xff)
        return array
      },
    })
    expect(isUuid(id)).toBe(true)
    expect(id).toBe("ffffffff-ffff-4fff-bfff-ffffffffffff")
  })
})
