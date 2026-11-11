import "server-only"
import { type AppConfig, config } from "@/config"
import { createAssistant } from "@/core/assistant"
import type {
  AccountRepository,
  Assistant,
  ChunkRepository,
  LlmClient,
  RateLimitRepository,
  SessionRepository,
} from "@/core/types"
import {
  createAccountRepository,
  createChunkRepository,
  createRateLimitRepository,
  createSessionRepository,
  getSql,
} from "@/infra/db"
import { getLlmClient } from "@/infra/llm"

export type Container = {
  config: AppConfig
  llm: LlmClient
  chunks: ChunkRepository
  sessions: SessionRepository
  rateLimits: RateLimitRepository
  accounts: AccountRepository
  assistant: Assistant
}

// Singleton preguiçoso: importar este módulo não lê segredo nem abre conexão. As variáveis
// (GEMINI_API_KEY, DATABASE_URL) só são exigidas na primeira chamada de getContainer().
let container: Container | undefined

export function getContainer(): Container {
  if (container === undefined) {
    const sql = getSql()
    const llm = getLlmClient()
    const chunks = createChunkRepository(sql)
    const sessions = createSessionRepository(sql)
    const rateLimits = createRateLimitRepository(sql)
    const accounts = createAccountRepository(sql)
    container = {
      config,
      llm,
      chunks,
      sessions,
      rateLimits,
      accounts,
      assistant: createAssistant({ llm, chunks, sessions, config }),
    }
  }
  return container
}
