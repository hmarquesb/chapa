import "server-only"
import { formatTranscript, SUMMARY_PROMPT } from "@/core/prompts"
import type { LlmClient, StoredMessage, Usage } from "@/core/types"

// Até summarizeAbove mensagens pendentes, tudo vai inteiro para o modelo. Acima disso, as
// últimas recentMessages ficam inteiras e as anteriores viram resumo.
export function planMemory(
  pending: StoredMessage[],
  opts: { recentMessages: number; summarizeAbove: number },
): { toSummarize: StoredMessage[]; recent: StoredMessage[] } {
  if (pending.length <= opts.summarizeAbove) return { toSummarize: [], recent: [...pending] }
  const split = Math.max(0, pending.length - opts.recentMessages)
  return { toSummarize: pending.slice(0, split), recent: pending.slice(split) }
}

export async function summarize(input: {
  previousSummary: string | null
  messages: StoredMessage[]
  llm: LlmClient
  model: string
}): Promise<{ summary: string; usage: Usage }> {
  const parts: string[] = []
  const previous = input.previousSummary?.trim()
  if (previous) parts.push(`Resumo anterior:\n${previous}`)
  parts.push(`Mensagens novas:\n${formatTranscript(input.messages)}`)

  const { text, usage } = await input.llm.generate({
    model: input.model,
    system: SUMMARY_PROMPT,
    messages: [{ role: "user", content: parts.join("\n\n") }],
    temperature: 0.2,
    maxOutputTokens: 300,
  })
  return { summary: text.trim(), usage }
}
