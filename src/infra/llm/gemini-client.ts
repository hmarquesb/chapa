import "server-only"
import { ThinkingLevel } from "@google/genai"
import { type ThinkingLevel as ConfigThinkingLevel, MODEL_THINKING_LEVEL } from "@/config"
import type { EmbedInput, EmbedTask, GenerateInput, LlmClient, Usage } from "@/core/types"
import { withRetry } from "./retry"

// Recorte mínimo do GoogleGenAI que o cliente usa. Os testes passam um SDK falso.
export type GeminiSdk = {
  models: {
    generateContent(params: unknown): Promise<{
      text?: string
      usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number }
    }>
    embedContent(params: unknown): Promise<{ embeddings?: Array<{ values?: number[] }> }>
  }
}

const TASK_TYPES: Record<EmbedTask, string> = {
  query: "RETRIEVAL_QUERY",
  document: "RETRIEVAL_DOCUMENT",
}

const SDK_THINKING_LEVELS: Record<ConfigThinkingLevel, ThinkingLevel> = {
  minimal: ThinkingLevel.MINIMAL,
  low: ThinkingLevel.LOW,
}

// As mensagens de erro nunca incluem o conteúdo de messages, system ou texts (RNF4).
function validateMessages(input: GenerateInput): void {
  if (input.messages.length === 0) {
    throw new Error("generate: messages precisa ter pelo menos uma mensagem.")
  }
  if (input.messages[0]?.role !== "user") {
    throw new Error('generate: a primeira mensagem de messages precisa ter role "user".')
  }
}

function generateConfig(input: GenerateInput): Record<string, unknown> {
  const cfg: Record<string, unknown> = {}
  if (input.system !== undefined) cfg.systemInstruction = input.system
  if (input.temperature !== undefined) cfg.temperature = input.temperature
  if (input.maxOutputTokens !== undefined) cfg.maxOutputTokens = input.maxOutputTokens
  if (input.json) cfg.responseMimeType = "application/json"
  // Reduz o "thinking" ao mínimo que o modelo aceita. Modelo sem entrada usa o padrão dele.
  const thinking = MODEL_THINKING_LEVEL[input.model]
  if (thinking !== undefined) {
    cfg.thinkingConfig = { thinkingLevel: SDK_THINKING_LEVELS[thinking] }
  }
  return cfg
}

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = []
  for (let i = 0; i < items.length; i += size) batches.push(items.slice(i, i + size))
  return batches
}

// O timeout por requisição fica no próprio SDK (httpOptions.timeout em getLlmClient).
export function createGeminiClient(opts: {
  sdk: GeminiSdk
  retries: number
  baseDelayMs: number
  embedBatchSize: number
  sleep?: (ms: number) => Promise<void>
}): LlmClient {
  const retry = { retries: opts.retries, baseDelayMs: opts.baseDelayMs, sleep: opts.sleep }
  const batchSize = Math.max(1, Math.floor(opts.embedBatchSize))

  return {
    async generate(input) {
      validateMessages(input)
      const params = {
        model: input.model,
        contents: input.messages.map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        config: generateConfig(input),
      }
      const response = await withRetry(() => opts.sdk.models.generateContent(params), retry)
      const usage: Usage = {
        calls: 1,
        inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
        outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
      }
      return { text: response.text ?? "", usage }
    },

    async embed(input: EmbedInput) {
      const vectors: number[][] = []
      const batches = chunk(input.texts, batchSize)
      // Lotes em sequência, para não estourar o limite por minuto do plano gratuito.
      for (const batch of batches) {
        const params = {
          model: input.model,
          contents: batch,
          config: { taskType: TASK_TYPES[input.task], outputDimensionality: input.dimensions },
        }
        const response = await withRetry(() => opts.sdk.models.embedContent(params), retry)
        const embeddings = response.embeddings ?? []
        if (embeddings.length !== batch.length) {
          throw new Error(
            `embed: o provedor devolveu ${embeddings.length} vetores para ${batch.length} textos.`,
          )
        }
        for (const embedding of embeddings) {
          const values = embedding.values ?? []
          if (values.length !== input.dimensions) {
            throw new Error(
              `embed: vetor com dimensão ${values.length}, mas a esperada é ${input.dimensions}.`,
            )
          }
          vectors.push(values)
        }
      }
      // A API de embedding não devolve contagem de tokens.
      return { vectors, usage: { calls: batches.length, inputTokens: 0, outputTokens: 0 } }
    },
  }
}
