// Juiz opcional da avaliação (S08, RF3): dá notas de 1 a 5 de corretude e fidelidade.
// O modelo vem do chamador (config.models.fast); nenhum nome de modelo aqui.
import type { LlmClient, RetrievedChunk, Usage } from "@/core/types"

export type JudgeResult = { corretude: number; fidelidade: number; justificativa: string }

export const JUDGE_PROMPT = `Você avalia respostas de um assistente para restaurantes parceiros de um app de delivery. O assistente só pode usar os trechos da base de conhecimento enviados.

Dê duas notas inteiras de 1 a 5:
- corretude: a resposta responde à pergunta de forma correta e completa?
- fidelidade: tudo o que a resposta afirma está apoiado nos trechos? Números, prazos ou nomes que não estão nos trechos baixam a nota.

Responda só com JSON, neste formato: {"corretude": 1-5, "fidelidade": 1-5, "justificativa": "uma frase curta"}`

function formatChunks(retrieved: RetrievedChunk[]): string {
  if (retrieved.length === 0) return "(nenhum trecho)"
  return retrieved
    .map((chunk, index) => {
      const location = chunk.section === "" ? chunk.source : `${chunk.source} › ${chunk.section}`
      return `[${index + 1}] ${location}\n${chunk.content}`
    })
    .join("\n\n")
}

function buildJudgeMessage(question: string, retrieved: RetrievedChunk[], answer: string): string {
  return [
    `Pergunta:\n${question}`,
    `Trechos recuperados:\n${formatChunks(retrieved)}`,
    `Resposta do assistente:\n${answer}`,
  ].join("\n\n")
}

function isScore(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 5
}

// Aceita o JSON puro ou dentro de um bloco ```json. Qualquer outra coisa vira null.
export function parseJudgeResult(text: string): JudgeResult | null {
  const fenced = text.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/)
  const raw = fenced?.[1] ?? text
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof data !== "object" || data === null || Array.isArray(data)) return null
  const { corretude, fidelidade, justificativa } = data as Record<string, unknown>
  if (!isScore(corretude) || !isScore(fidelidade) || typeof justificativa !== "string") return null
  return { corretude, fidelidade, justificativa }
}

export async function judgeAnswer(input: {
  question: string
  retrieved: RetrievedChunk[]
  answer: string
  llm: LlmClient
  model: string
}): Promise<{ result: JudgeResult | null; usage: Usage }> {
  const { text, usage } = await input.llm.generate({
    model: input.model,
    system: JUDGE_PROMPT,
    messages: [
      { role: "user", content: buildJudgeMessage(input.question, input.retrieved, input.answer) },
    ],
    temperature: 0,
    json: true,
  })
  return { result: parseJudgeResult(text), usage }
}
