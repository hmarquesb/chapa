import { describe, expect, it } from "vitest"
import { LlmQuotaError } from "@/core/errors"
import { REWRITE_PROMPT } from "@/core/prompts"
import { rewriteQuery } from "@/core/rewrite-query"
import type { ChatMessage, GenerateInput, LlmClient } from "@/core/types"

const USAGE = { calls: 1, inputTokens: 30, outputTokens: 8 }

function fakeLlm(output: string | Error) {
  const calls: GenerateInput[] = []
  const llm: LlmClient = {
    async generate(input) {
      calls.push(input)
      if (output instanceof Error) throw output
      return { text: output, usage: USAGE }
    },
    async embed() {
      throw new Error("embed não deveria ser chamado")
    },
  }
  return { llm, calls }
}

function history(count: number): ChatMessage[] {
  return Array.from({ length: count }, (_, index) => ({
    role: index % 2 === 0 ? "user" : "assistant",
    content: `turno ${index + 1}`,
  }))
}

const QUESTION = "e no outro plano?"

describe("rewriteQuery", () => {
  it("returns the trimmed rewritten question", async () => {
    const { llm } = fakeLlm("  Qual a comissão do plano básico?  ")
    const result = await rewriteQuery({
      question: QUESTION,
      history: history(2),
      summary: null,
      llm,
      model: "rapido",
    })
    expect(result).toEqual({ query: "Qual a comissão do plano básico?", usage: USAGE })
  })

  it("returns the original question when the LLM throws", async () => {
    const { llm } = fakeLlm(new LlmQuotaError("cota"))
    const result = await rewriteQuery({
      question: QUESTION,
      history: history(2),
      summary: null,
      llm,
      model: "rapido",
    })
    expect(result.query).toBe(QUESTION)
    expect(result.usage).toEqual({ calls: 0, inputTokens: 0, outputTokens: 0 })
  })

  it("returns the original question when the output is empty", async () => {
    const { llm } = fakeLlm("   ")
    const result = await rewriteQuery({
      question: QUESTION,
      history: history(2),
      summary: null,
      llm,
      model: "rapido",
    })
    expect(result).toEqual({ query: QUESTION, usage: USAGE })
  })

  it("returns the original question when the output is longer than 300 characters", async () => {
    const { llm } = fakeLlm("a".repeat(301))
    const result = await rewriteQuery({
      question: QUESTION,
      history: history(2),
      summary: null,
      llm,
      model: "rapido",
    })
    expect(result.query).toBe(QUESTION)
  })

  it("sends the last 6 messages, the summary and the question with the rewrite settings", async () => {
    const { llm, calls } = fakeLlm("Pergunta reescrita?")
    await rewriteQuery({
      question: QUESTION,
      history: history(8),
      summary: "Restaurante no plano básico.",
      llm,
      model: "rapido",
    })

    expect(calls).toHaveLength(1)
    const call = calls[0] as GenerateInput
    expect(call.model).toBe("rapido")
    expect(call.system).toBe(REWRITE_PROMPT)
    expect(call.temperature).toBe(0)
    expect(call.maxOutputTokens).toBe(100)
    expect(call.messages).toHaveLength(1)
    expect(call.messages[0]?.role).toBe("user")
    const content = call.messages[0]?.content ?? ""
    expect(content).toContain("Restaurante no plano básico.")
    expect(content).not.toMatch(/turno [12]\b/)
    for (let turn = 3; turn <= 8; turn++) expect(content).toContain(`turno ${turn}`)
    expect(content).toContain(QUESTION)
  })
})
