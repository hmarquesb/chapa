import { describe, expect, it } from "vitest"
import type { EmbedInput, GenerateInput, LlmClient, RetrievedChunk, Usage } from "@/core/types"
import { JUDGE_PROMPT, judgeAnswer } from "./judge"

const USAGE: Usage = { calls: 1, inputTokens: 300, outputTokens: 40 }

class FakeLlm implements LlmClient {
  inputs: GenerateInput[] = []
  constructor(private readonly text: string) {}

  async generate(input: GenerateInput): Promise<{ text: string; usage: Usage }> {
    this.inputs.push(input)
    return { text: this.text, usage: USAGE }
  }

  async embed(_input: EmbedInput): Promise<{ vectors: number[][]; usage: Usage }> {
    throw new Error("o juiz não usa embedding")
  }
}

const RETRIEVED: RetrievedChunk[] = [
  {
    id: 7,
    source: "01-planos-e-taxas.md",
    section: "Comissão",
    content: "No Plano Básico, a comissão é de 12%.",
    semantic: 0.8,
    keyword: 0.5,
    score: 0.71,
  },
]

function judge(text: string) {
  const llm = new FakeLlm(text)
  const promise = judgeAnswer({
    question: "Qual a comissão do Plano Básico?",
    retrieved: RETRIEVED,
    answer: "É de 12%.",
    llm,
    model: "modelo-rapido",
  })
  return { llm, promise }
}

describe("judgeAnswer", () => {
  it("returns the parsed scores", async () => {
    const { promise } = judge('{"corretude":4,"fidelidade":5,"justificativa":"ok"}')
    expect(await promise).toEqual({
      result: { corretude: 4, fidelidade: 5, justificativa: "ok" },
      usage: USAGE,
    })
  })

  it("calls the model with json, temperature 0, the question, the chunks and the answer", async () => {
    const { llm, promise } = judge('{"corretude":4,"fidelidade":5,"justificativa":"ok"}')
    await promise
    expect(llm.inputs).toHaveLength(1)
    const input = llm.inputs[0] as GenerateInput
    expect(input).toMatchObject({ model: "modelo-rapido", json: true, temperature: 0 })
    expect(input.system).toBe(JUDGE_PROMPT)
    expect(input.messages).toHaveLength(1)
    const content = input.messages[0]?.content ?? ""
    expect(input.messages[0]?.role).toBe("user")
    expect(content).toContain("Qual a comissão do Plano Básico?")
    expect(content).toContain("01-planos-e-taxas.md › Comissão")
    expect(content).toContain("No Plano Básico, a comissão é de 12%.")
    expect(content).toContain("É de 12%.")
  })

  it("returns null for invalid text but keeps the usage", async () => {
    const { promise } = judge("nota quatro, sem JSON")
    expect(await promise).toEqual({ result: null, usage: USAGE })
  })

  it("returns null for scores out of 1 to 5 or not integers", async () => {
    for (const text of [
      '{"corretude":0,"fidelidade":5,"justificativa":"x"}',
      '{"corretude":4,"fidelidade":6,"justificativa":"x"}',
      '{"corretude":3.5,"fidelidade":4,"justificativa":"x"}',
      '{"corretude":"4","fidelidade":4,"justificativa":"x"}',
    ]) {
      expect((await judge(text).promise).result).toBeNull()
    }
  })

  it("returns null when the shape is wrong", async () => {
    for (const text of [
      "[]",
      "null",
      '{"corretude":4,"fidelidade":4}',
      '{"corretude":4,"fidelidade":4,"justificativa":2}',
    ]) {
      expect((await judge(text).promise).result).toBeNull()
    }
  })

  it("accepts the JSON inside a markdown code fence", async () => {
    const { promise } = judge('```json\n{"corretude":5,"fidelidade":5,"justificativa":"boa"}\n```')
    expect((await promise).result).toEqual({ corretude: 5, fidelidade: 5, justificativa: "boa" })
  })
})
