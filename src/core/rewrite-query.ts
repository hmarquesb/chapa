import "server-only"
import { formatTranscript, REWRITE_PROMPT } from "@/core/prompts"
import type { ChatMessage, LlmClient, Usage } from "@/core/types"
import { emptyUsage } from "@/core/usage"

const HISTORY_MESSAGES = 6
const MAX_QUERY_CHARS = 300

// Reescreve a pergunta como autossuficiente. Em erro do LLM, saída vazia ou longa demais,
// devolve a pergunta original: a reescrita nunca derruba o turno.
export async function rewriteQuery(input: {
  question: string
  history: ChatMessage[]
  summary: string | null
  llm: LlmClient
  model: string
}): Promise<{ query: string; usage: Usage }> {
  const parts: string[] = []
  const summary = input.summary?.trim()
  if (summary) parts.push(`Resumo da conversa:\n${summary}`)
  const history = input.history.slice(-HISTORY_MESSAGES)
  if (history.length > 0) parts.push(`Histórico recente:\n${formatTranscript(history)}`)
  parts.push(`Última pergunta do parceiro: ${input.question}`)

  let result: { text: string; usage: Usage }
  try {
    result = await input.llm.generate({
      model: input.model,
      system: REWRITE_PROMPT,
      messages: [{ role: "user", content: parts.join("\n\n") }],
      temperature: 0,
      maxOutputTokens: 100,
    })
  } catch {
    return { query: input.question, usage: emptyUsage() }
  }

  const query = result.text.trim()
  if (query === "" || query.length > MAX_QUERY_CHARS) {
    return { query: input.question, usage: result.usage }
  }
  return { query, usage: result.usage }
}
