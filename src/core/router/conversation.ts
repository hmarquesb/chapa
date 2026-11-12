import "server-only"
import { validateOutput } from "@/core/guardrails"
import { FALLBACK_MESSAGE } from "@/core/messages"
import {
  buildConversationMessage,
  buildConversationSystem,
  CONVERSATION_SENTINEL,
} from "@/core/prompts"
import { normalizeGreeting } from "@/core/router/greeting"
import { includesNormalized } from "@/core/text"
import type { LlmClient, Usage } from "@/core/types"

// Fixos, como o ANSWER_TEMPERATURE do assistant.ts: não são parâmetro de RAG.
const ROUTER_TEMPERATURE = 0
const ROUTER_MAX_OUTPUT_TOKENS = 120

export type RouterOutcome =
  | { kind: "conversa"; answer: string; usage: Usage; latencyMs: number }
  | { kind: "rag"; usage: Usage | null; latencyMs: number } // usage null: a chamada falhou

// Palavras da mensagem normalizada (sem pontuação nem emojis).
export function countWords(message: string): number {
  const normalized = normalizeGreeting(message)
  return normalized === "" ? 0 : normalized.split(" ").length
}

// Sem acentos, mas sem baixar a caixa: "DÚVIDA" é a sentinela; "dúvida" numa frase não.
function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "")
}

// Devolve a resposta aparada, ou null quando o turno deve seguir para o RAG.
export function acceptConversationReply(text: string): string | null {
  const trimmed = text.trim()
  if (trimmed === "") return null
  if (stripAccents(trimmed).includes(CONVERSATION_SENTINEL)) return null
  // A resposta de conversa nunca precisa de número: qualquer dígito é sinal de regra inventada.
  if (/\d/.test(trimmed)) return null
  if (includesNormalized(trimmed, FALLBACK_MESSAGE)) return null
  if (!validateOutput(trimmed).ok) return null
  return trimmed
}

// Uma chamada que responde a conversa ou devolve a sentinela. Nunca rejeita: qualquer erro
// (inclusive de cota) vira "rag", e o RAG depois falha do jeito de sempre se for o caso.
export async function routeConversation(input: {
  message: string
  lastReply: string | null
  name: string | undefined
  llm: LlmClient
  model: string
  now: () => number
}): Promise<RouterOutcome> {
  const startedAt = input.now()
  try {
    const { text, usage } = await input.llm.generate({
      model: input.model,
      system: buildConversationSystem(input.name),
      messages: [
        { role: "user", content: buildConversationMessage(input.message, input.lastReply) },
      ],
      temperature: ROUTER_TEMPERATURE,
      maxOutputTokens: ROUTER_MAX_OUTPUT_TOKENS,
    })
    const answer = acceptConversationReply(text)
    const latencyMs = input.now() - startedAt
    return answer === null
      ? { kind: "rag", usage, latencyMs }
      : { kind: "conversa", answer, usage, latencyMs }
  } catch {
    return { kind: "rag", usage: null, latencyMs: input.now() - startedAt }
  }
}
