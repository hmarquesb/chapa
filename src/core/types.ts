import "server-only"
import type { Channel, ReplyStatus, RestaurantProfile } from "@/lib/types"

// ---------- LLM ----------
export type ChatMessage = { role: "user" | "assistant"; content: string }

export type Usage = { calls: number; inputTokens: number; outputTokens: number }

export type GenerateInput = {
  model: string
  system?: string
  messages: ChatMessage[] // não vazio e começa com "user"
  temperature?: number
  maxOutputTokens?: number
  json?: boolean // true pede a resposta em JSON (application/json)
}

export type EmbedTask = "query" | "document"

export type EmbedInput = {
  model: string
  texts: string[]
  task: EmbedTask
  dimensions: number
}

export interface LlmClient {
  generate(input: GenerateInput): Promise<{ text: string; usage: Usage }>
  embed(input: EmbedInput): Promise<{ vectors: number[][]; usage: Usage }>
}

// ---------- Base de conhecimento ----------
export type Chunk = {
  source: string // nome do arquivo, ex.: "02-repasse-financeiro.md"
  section: string // título "## ..." da seção ("" se não houver)
  content: string // texto do trecho, já com o cabeçalho "Título — Seção"
}

// Identifica um conjunto de trechos: o modelo de embedding e a forma de fatiar.
export type ChunkSetKey = { embeddingModel: string; chunkConfig: string }

export type ChunkCandidate = Chunk & {
  id: number
  semantic: number // similaridade de cosseno, de -1 a 1
  keyword: number // fração dos termos da consulta presentes no trecho, de 0 a 1
}

export type RetrievedChunk = ChunkCandidate & { score: number }

export interface ChunkRepository {
  replaceAll(key: ChunkSetKey, chunks: Array<Chunk & { embedding: number[] }>): Promise<number>
  search(input: {
    key: ChunkSetKey
    embedding: number[]
    query: string
    limit: number
  }): Promise<ChunkCandidate[]>
  count(key: ChunkSetKey): Promise<number>
}

// ---------- Sessões e mensagens ----------
export type SessionRecord = {
  id: string
  channel: Channel
  profile: RestaurantProfile
  summary: string | null
  summaryUntilId: number | null // último messages.id incorporado ao resumo
  createdAt: Date
  lastActivityAt: Date
}

export type StoredMessage = {
  id: number
  role: "user" | "assistant"
  content: string
  status: ReplyStatus | null
  sources: string[]
  createdAt: Date
}

export interface SessionRepository {
  get(id: string): Promise<SessionRecord | null>
  touch(input: {
    id: string
    channel: Channel
    profile?: RestaurantProfile
  }): Promise<SessionRecord>
  listMessages(sessionId: string, opts?: { afterId?: number }): Promise<StoredMessage[]>
  appendTurn(
    sessionId: string,
    turn: { user: string; assistant: string; status: ReplyStatus; sources: string[] },
  ): Promise<void>
  saveSummary(sessionId: string, summary: string, untilId: number): Promise<void>
  deleteInactive(olderThan: Date): Promise<number>
}

// ---------- Rate limit ----------
export type RateLimitBucket = "minute" | "day"

export interface RateLimitRepository {
  hit(input: { ipHash: string; bucket: RateLimitBucket; windowStart: Date }): Promise<number>
  deleteBefore(date: Date): Promise<number>
}

// ---------- Assistente ----------
export type HandleMessageInput = {
  sessionId: string
  message: string
  channel: Channel
  profile?: RestaurantProfile
}

export type AssistantReply = {
  status: ReplyStatus
  answer: string
  sources: string[] // arquivos únicos, na ordem do score; [] se status !== "answered"
  retrieved: RetrievedChunk[] // para eval e debug; a API não expõe
  searchQuery: string // pergunta usada na busca (reescrita ou original)
  usage: Usage // soma das chamadas de LLM do turno
  latencyMs: number
}

export interface Assistant {
  handleMessage(input: HandleMessageInput): Promise<AssistantReply>
}
