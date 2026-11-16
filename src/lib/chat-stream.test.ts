import { describe, expect, it } from "vitest"
import { InvalidStreamError, parseStreamEvent, splitLines } from "@/lib/chat-stream"

describe("splitLines", () => {
  it("keeps a line broken between two chunks for the next call", () => {
    const first = splitLines("", '{"type":"step","st')
    expect(first).toEqual({ lines: [], rest: '{"type":"step","st' })
    const second = splitLines(first.rest, 'ep":"history"}\n')
    expect(second).toEqual({ lines: ['{"type":"step","step":"history"}'], rest: "" })
  })

  it("returns every complete line of a chunk and the incomplete tail", () => {
    expect(splitLines("", "a\nb\nc")).toEqual({ lines: ["a", "b"], rest: "c" })
  })

  it("drops the carriage return of CRLF lines", () => {
    expect(splitLines("", "a\r\nb\r\n")).toEqual({ lines: ["a", "b"], rest: "" })
  })

  it("keeps empty lines for the parser to skip", () => {
    expect(splitLines("", "a\n\nb\n")).toEqual({ lines: ["a", "", "b"], rest: "" })
  })
})

describe("parseStreamEvent", () => {
  it("returns null for an empty or blank line", () => {
    expect(parseStreamEvent("")).toBeNull()
    expect(parseStreamEvent("   ")).toBeNull()
  })

  it("reads the steps", () => {
    expect(parseStreamEvent('{"type":"step","step":"history"}')).toEqual({
      type: "step",
      step: "history",
    })
    expect(parseStreamEvent('{"type":"step","step":"writing","documents":2}')).toEqual({
      type: "step",
      step: "writing",
      documents: 2,
    })
  })

  it("keeps only the known fields of a step", () => {
    expect(parseStreamEvent('{"type":"step","step":"searching","query":"x"}')).toEqual({
      type: "step",
      step: "searching",
    })
  })

  it("reads the reply and the error", () => {
    const reply = {
      type: "reply",
      status: "answered",
      answer: "Sim.",
      sources: ["02-repasse.md"],
      sessionId: null,
    }
    expect(parseStreamEvent(JSON.stringify(reply))).toEqual(reply)
    expect(parseStreamEvent('{"type":"error","error":"Falhou."}')).toEqual({
      type: "error",
      error: "Falhou.",
    })
  })

  it("throws InvalidStreamError for invalid JSON", () => {
    expect(() => parseStreamEvent('{"type":')).toThrow(InvalidStreamError)
  })

  it("throws InvalidStreamError for an unknown event", () => {
    expect(() => parseStreamEvent('{"type":"chunk","text":"oi"}')).toThrow(InvalidStreamError)
    expect(() => parseStreamEvent('{"type":"step","step":"thinking"}')).toThrow(InvalidStreamError)
    expect(() => parseStreamEvent("[1]")).toThrow(InvalidStreamError)
    expect(() => parseStreamEvent('{"type":"reply","status":"ok"}')).toThrow(InvalidStreamError)
    expect(() => parseStreamEvent('{"type":"error","error":3}')).toThrow(InvalidStreamError)
  })

  it("throws InvalidStreamError for writing without documents", () => {
    expect(() => parseStreamEvent('{"type":"step","step":"writing"}')).toThrow(InvalidStreamError)
    expect(() => parseStreamEvent('{"type":"step","step":"writing","documents":-1}')).toThrow(
      InvalidStreamError,
    )
    expect(() => parseStreamEvent('{"type":"step","step":"writing","documents":1.5}')).toThrow(
      InvalidStreamError,
    )
  })
})
