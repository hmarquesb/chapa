import "server-only"
import type { AppConfig } from "@/config"
import { validateInput, validateOutput } from "@/core/guardrails"
import { planMemory, summarize } from "@/core/memory"
import { BLOCKED_INPUT_MESSAGES, BLOCKED_OUTPUT_MESSAGE, FALLBACK_MESSAGE } from "@/core/messages"
import { buildRagPrompt, buildSystemInstruction } from "@/core/prompts"
import { retrieve } from "@/core/rag/retrieve"
import { rewriteQuery } from "@/core/rewrite-query"
import { includesNormalized } from "@/core/text"
import type {
  Assistant,
  AssistantReply,
  ChatMessage,
  ChunkRepository,
  HandleMessageInput,
  LlmClient,
  RetrievedChunk,
  SessionOwner,
  SessionRepository,
  StoredMessage,
  Usage,
} from "@/core/types"
import { addUsage, emptyUsage } from "@/core/usage"
import { PROFILE_FIELDS, type ReplyStatus, type RestaurantProfile } from "@/lib/types"

export type AssistantDeps = {
  llm: LlmClient
  chunks: ChunkRepository
  sessions: SessionRepository
  config: AppConfig
  now?: () => number // padrão: Date.now (para medir latência nos testes)
}

const ANSWER_TEMPERATURE = 0.2
const ANSWER_MAX_OUTPUT_TOKENS = 800

// Valores aparados e campos vazios descartados.
function cleanProfile(profile: RestaurantProfile): RestaurantProfile {
  const clean: RestaurantProfile = {}
  for (const field of PROFILE_FIELDS) {
    const value = profile[field]?.trim()
    if (value) clean[field] = value
  }
  return clean
}

function toChatMessages(messages: StoredMessage[]): ChatMessage[] {
  return messages.map(({ role, content }) => ({ role, content }))
}

// A conversa enviada ao modelo precisa começar com "user".
function startWithUser(messages: ChatMessage[]): ChatMessage[] {
  return messages[0]?.role === "assistant" ? messages.slice(1) : messages
}

// Arquivos únicos, na ordem do score (results já vem ordenado).
function uniqueSources(results: RetrievedChunk[]): string[] {
  return [...new Set(results.map((chunk) => chunk.source))]
}

export function createAssistant(deps: AssistantDeps): Assistant {
  const { llm, chunks, sessions, config } = deps
  const now = deps.now ?? Date.now

  async function handleMessage(input: HandleMessageInput): Promise<AssistantReply> {
    const startedAt = now()
    const { sessionId, message, channel } = input
    // Erro de programação: a web sempre tem conta, o CLI e o eval nunca.
    if ((channel === "web") !== (input.accountId !== null)) {
      throw new Error("channel and accountId disagree")
    }
    const owner: SessionOwner = { accountId: input.accountId }

    // Bloqueio de entrada: nada vai para o LLM nem para o banco (pode conter CPF ou cartão).
    const inputCheck = validateInput(message, config.limits.maxInputChars)
    if (!inputCheck.ok) {
      return {
        status: "blocked_input",
        answer: BLOCKED_INPUT_MESSAGES[inputCheck.reason],
        sources: [],
        retrieved: [],
        searchQuery: "",
        usage: emptyUsage(),
        latencyMs: now() - startedAt,
      }
    }

    const usages: Usage[] = []
    const inputProfile = input.profile === undefined ? undefined : cleanProfile(input.profile)
    const session = await sessions.touch({
      id: sessionId,
      channel,
      owner,
      profile: inputProfile,
    })
    const profile = inputProfile ?? cleanProfile(session.profile)

    // Memória: histórico pendente desde o último resumo, vindo do banco a cada mensagem.
    const pending = await sessions.listMessages(sessionId, owner, {
      afterId: session.summaryUntilId ?? undefined,
    })
    const { toSummarize, recent } = planMemory(pending, config.memory)
    let summary = session.summary
    const lastToSummarize = toSummarize.at(-1)
    if (lastToSummarize !== undefined) {
      try {
        const result = await summarize({
          previousSummary: summary,
          messages: toSummarize,
          llm,
          model: config.models.fast,
        })
        usages.push(result.usage)
        if (result.summary !== "") {
          await sessions.saveSummary(sessionId, owner, result.summary, lastToSummarize.id)
          summary = result.summary
        }
      } catch {
        // O turno segue com o resumo antigo e as mensagens recentes; nada é gravado.
      }
    }

    const history = toChatMessages(recent)

    // Reescrita: só quando há contexto anterior para tornar a pergunta autossuficiente.
    let searchQuery = message
    if (config.rag.rewriteQuery && (history.length > 0 || summary)) {
      const rewritten = await rewriteQuery({
        question: message,
        history,
        summary,
        llm,
        model: config.models.fast,
      })
      usages.push(rewritten.usage)
      searchQuery = rewritten.query
    }

    // Recuperação: uma única busca por turno. Erros sobem sem persistir nada.
    const { results, usage: retrieveUsage } = await retrieve({
      query: searchQuery,
      config,
      llm,
      chunks,
    })
    usages.push(retrieveUsage)

    let status: ReplyStatus
    let answer: string
    if (results.length === 0) {
      // Nenhum trecho passou do minScore: fallback sem chamar o LLM de resposta.
      status = "fallback"
      answer = FALLBACK_MESSAGE
    } else {
      const generated = await llm.generate({
        model: config.models.chat,
        system: buildSystemInstruction({ profile, summary }),
        messages: [
          ...startWithUser(history),
          { role: "user", content: buildRagPrompt(message, results) },
        ],
        temperature: ANSWER_TEMPERATURE,
        maxOutputTokens: ANSWER_MAX_OUTPUT_TOKENS,
      })
      usages.push(generated.usage)

      const text = generated.text.trim()
      if (text === "" || includesNormalized(text, FALLBACK_MESSAGE)) {
        status = "fallback"
        answer = FALLBACK_MESSAGE
      } else if (!validateOutput(text).ok) {
        status = "blocked_output"
        answer = BLOCKED_OUTPUT_MESSAGE
      } else {
        status = "answered"
        answer = text
      }
    }

    const sources = status === "answered" ? uniqueSources(results) : []
    // Só a pergunta original e a resposta final. Os trechos e o prompt nunca vão para o banco.
    await sessions.appendTurn(sessionId, owner, {
      user: message,
      assistant: answer,
      status,
      sources,
    })

    return {
      status,
      answer,
      sources,
      retrieved: results,
      searchQuery,
      usage: addUsage(...usages),
      latencyMs: now() - startedAt,
    }
  }

  return { handleMessage }
}
