import { describe, expect, it } from "vitest"
import { planMemory, summarize } from "@/core/memory"
import { SUMMARY_PROMPT } from "@/core/prompts"
import type { GenerateInput, LlmClient, StoredMessage } from "@/core/types"

function messages(count: number): StoredMessage[] {
  return Array.from({ length: count }, (_, index) => ({
    id: index + 1,
    role: index % 2 === 0 ? "user" : "assistant",
    content: `mensagem ${index + 1}`,
    status: index % 2 === 0 ? null : "answered",
    sources: [],
    createdAt: new Date("2026-11-05T12:00:00Z"),
  }))
}

const OPTS = { recentMessages: 10, summarizeAbove: 16 }

describe("planMemory", () => {
  it("summarizes the older messages when above the threshold", () => {
    const pending = messages(17)
    const plan = planMemory(pending, OPTS)
    expect(plan.toSummarize.map((m) => m.id)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(plan.recent.map((m) => m.id)).toEqual([8, 9, 10, 11, 12, 13, 14, 15, 16, 17])
  })

  it("keeps everything recent at or below the threshold", () => {
    const pending = messages(16)
    const plan = planMemory(pending, OPTS)
    expect(plan.toSummarize).toEqual([])
    expect(plan.recent).toEqual(pending)
  })

  it("handles an empty list", () => {
    expect(planMemory([], OPTS)).toEqual({ toSummarize: [], recent: [] })
  })

  it("does not mutate the input", () => {
    const pending = messages(20)
    const copy = [...pending]
    planMemory(pending, OPTS)
    expect(pending).toEqual(copy)
  })
})

describe("summarize", () => {
  function fakeLlm(text: string) {
    const calls: GenerateInput[] = []
    const llm: LlmClient = {
      async generate(input) {
        calls.push(input)
        return { text, usage: { calls: 1, inputTokens: 40, outputTokens: 12 } }
      },
      async embed() {
        throw new Error("embed não deveria ser chamado")
      },
    }
    return { llm, calls }
  }

  it("sends the previous summary and the formatted messages", async () => {
    const { llm, calls } = fakeLlm("  Resumo novo.  ")
    const result = await summarize({
      previousSummary: "Resumo antigo.",
      messages: messages(2),
      llm,
      model: "modelo-rapido",
    })

    expect(result).toEqual({
      summary: "Resumo novo.",
      usage: { calls: 1, inputTokens: 40, outputTokens: 12 },
    })
    expect(calls).toHaveLength(1)
    const call = calls[0] as GenerateInput
    expect(call.model).toBe("modelo-rapido")
    expect(call.system).toBe(SUMMARY_PROMPT)
    expect(call.temperature).toBe(0.2)
    expect(call.maxOutputTokens).toBe(300)
    expect(call.messages).toHaveLength(1)
    expect(call.messages[0]?.role).toBe("user")
    const content = call.messages[0]?.content ?? ""
    expect(content).toContain("Resumo antigo.")
    expect(content).toContain("Parceiro: mensagem 1")
    expect(content).toContain("Assistente: mensagem 2")
  })

  it("omits the previous summary block when there is none", async () => {
    const { llm, calls } = fakeLlm("ok")
    await summarize({ previousSummary: null, messages: messages(2), llm, model: "m" })
    expect(calls[0]?.messages[0]?.content).not.toContain("Resumo anterior")
  })

  it("propagates LLM errors", async () => {
    const llm: LlmClient = {
      async generate() {
        throw new Error("falhou")
      },
      async embed() {
        throw new Error("não usado")
      },
    }
    await expect(
      summarize({ previousSummary: null, messages: messages(2), llm, model: "m" }),
    ).rejects.toThrow("falhou")
  })
})
