import "server-only"
import { GoogleGenAI } from "@google/genai"
import { config } from "@/config"
import type { LlmClient } from "@/core/types"
import { requireEnv } from "@/infra/env"
import { createGeminiClient } from "./gemini-client"

// Guarda só o cliente (sem estado de requisição). O uso de tokens volta em cada chamada.
let client: LlmClient | undefined

// Cria o SDK na primeira chamada, exigindo GEMINI_API_KEY só nesse momento. Importar este
// módulo nunca lança erro.
export function getLlmClient(): LlmClient {
  if (client === undefined) {
    const sdk = new GoogleGenAI({
      apiKey: requireEnv("GEMINI_API_KEY"),
      // Timeout por tentativa, aplicado pelo SDK com AbortSignal (vira AbortError).
      httpOptions: { timeout: config.llm.timeoutMs },
    })
    client = createGeminiClient({
      sdk,
      retries: config.llm.retries,
      baseDelayMs: config.llm.baseDelayMs,
      embedBatchSize: config.llm.embedBatchSize,
      embedBatchDelayMs: config.llm.embedBatchDelayMs,
    })
  }
  return client
}
