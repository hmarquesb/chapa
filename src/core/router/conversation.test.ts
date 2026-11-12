import { describe, expect, it } from "vitest"
import { FALLBACK_MESSAGE, OUTPUT_BLOCK_SIGNALS } from "@/core/messages"
import { buildConversationMessage, buildConversationSystem } from "@/core/prompts"
import { acceptConversationReply, countWords, routeConversation } from "@/core/router/conversation"
import type { GenerateInput, LlmClient, Usage } from "@/core/types"

describe("countWords", () => {
  it("ignores punctuation and emojis", () => {
    expect(countWords("Obrigado!!! 👋")).toBe(1)
    expect(countWords("  e no   Plano Entrega? ")).toBe(4)
    expect(countWords("👋😀")).toBe(0)
    expect(countWords("")).toBe(0)
  })

  it("counts 12 and 13 words", () => {
    const twelve = Array.from({ length: 12 }, (_, i) => `p${i}`).join(" ")
    expect(countWords(twelve)).toBe(12)
    expect(countWords(`${twelve} a`)).toBe(13)
  })
})

describe("acceptConversationReply", () => {
  const cases: Array<[string, string, string | null]> = [
    ["empty", "   ", null],
    ["sentinel", "DUVIDA", null],
    ["sentinel with period", "DUVIDA.", null],
    ["sentinel with accent and period", "DÚVIDA.", null],
    [
      "lowercase duvida inside a sentence",
      "Se tiver outra duvida, é só falar.",
      "Se tiver outra duvida, é só falar.",
    ],
    [
      "accented lowercase duvida",
      "Se tiver outra dúvida, é só falar.",
      "Se tiver outra dúvida, é só falar.",
    ],
    ["digit", "A taxa é de 12%.", null],
    ["fallback text", `Hmm. ${FALLBACK_MESSAGE}`, null],
    ["blocked by validateOutput", `Claro. ${OUTPUT_BLOCK_SIGNALS[0]}`, null],
    [
      "good reply, trimmed",
      "  Por nada! Qualquer coisa, é só chamar.\n",
      "Por nada! Qualquer coisa, é só chamar.",
    ],
  ]
  it.each(cases)("%s", (_name, text, expected) => {
    expect(acceptConversationReply(text)).toBe(expected)
  })
})

const USAGE: Usage = { calls: 1, inputTokens: 80, outputTokens: 10 }

function fakeLlm(respond: (input: GenerateInput) => string | Error) {
  const calls: GenerateInput[] = []
  const llm: LlmClient = {
    async generate(input) {
      calls.push(input)
      const out = respond(input)
      if (out instanceof Error) throw out
      return { text: out, usage: USAGE }
    },
    async embed() {
      throw new Error("embed não deveria ser chamado")
    },
  }
  return { llm, calls }
}

function clock() {
  let t = 100
  return () => {
    t += 40
    return t
  }
}

describe("routeConversation", () => {
  it("calls the model with the contract parameters and returns the accepted answer", async () => {
    const { llm, calls } = fakeLlm(() => " Por nada! ")
    const outcome = await routeConversation({
      message: "obrigado",
      lastReply: "A taxa é X.",
      name: "Cantina da Nonna",
      llm,
      model: "fast-model",
      now: clock(),
    })
    expect(outcome).toEqual({ kind: "conversa", answer: "Por nada!", usage: USAGE, latencyMs: 40 })
    expect(calls).toEqual([
      {
        model: "fast-model",
        system: buildConversationSystem("Cantina da Nonna"),
        messages: [{ role: "user", content: buildConversationMessage("obrigado", "A taxa é X.") }],
        temperature: 0,
        maxOutputTokens: 120,
      },
    ])
  })

  it("goes to the rag on the sentinel, keeping the usage", async () => {
    const { llm } = fakeLlm(() => "DUVIDA")
    expect(
      await routeConversation({
        message: "e no Entrega?",
        lastReply: null,
        name: undefined,
        llm,
        model: "m",
        now: clock(),
      }),
    ).toEqual({ kind: "rag", usage: USAGE, latencyMs: 40 })
  })

  it("goes to the rag with null usage when the call fails, and never rejects", async () => {
    const { llm } = fakeLlm(() => new Error("boom"))
    expect(
      await routeConversation({
        message: "valeu",
        lastReply: null,
        name: undefined,
        llm,
        model: "m",
        now: clock(),
      }),
    ).toEqual({ kind: "rag", usage: null, latencyMs: 40 })
  })

  it("goes to the rag when the answer has a digit", async () => {
    const { llm } = fakeLlm(() => "São 15 dias.")
    const outcome = await routeConversation({
      message: "valeu",
      lastReply: null,
      name: undefined,
      llm,
      model: "m",
      now: clock(),
    })
    expect(outcome.kind).toBe("rag")
  })
})
