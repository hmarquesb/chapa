export type ReplyStatus = "answered" | "fallback" | "blocked_input" | "blocked_output"

export type Channel = "web" | "cli" | "eval"

export type RestaurantProfile = {
  name?: string
  plan?: string
  cuisine?: string
  city?: string
  hours?: string
}

export const PROFILE_FIELDS = ["name", "plan", "cuisine", "city", "hours"] as const
export const PROFILE_FIELD_MAX_CHARS = 60

// POST /api/chat
export type ChatRequest = {
  sessionId?: string // absent: new conversation
  message: string
  profile?: RestaurantProfile
}

export type ChatResponse = {
  status: ReplyStatus
  answer: string
  sources: string[]
  sessionId: string | null // null when no conversation was created
}

// GET /api/sessions
export type ConversationListItem = {
  id: string
  title: string
  lastActivityAt: string // ISO 8601
}

export type SessionListResponse = { sessions: ConversationListItem[] }

// GET /api/sessions/[id]/messages
export type HistoryMessage = {
  id: number
  role: "user" | "assistant"
  content: string
  status: ReplyStatus | null // só nas mensagens do assistente
  sources: string[]
  createdAt: string // ISO 8601
}

export type SessionHistoryResponse = {
  sessionId: string
  profile: RestaurantProfile
  messages: HistoryMessage[]
}

// GET /api/health
export type HealthResponse = {
  ok: boolean
  chunks: number
  embeddingModel: string
}

// Qualquer resposta de erro da API
export type ApiErrorResponse = {
  error: string
}
