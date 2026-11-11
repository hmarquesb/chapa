import type { ProfileErrorField } from "@/lib/profile/types"

export type {
  City,
  Cuisine,
  CuisineId,
  ProfileErrorField,
  ProfileLocation,
  ProfileResponse,
  ProfileUpdateRequest,
  RestaurantProfile,
  Uf,
} from "@/lib/profile/types"
export { CUISINE_TEXT_MAX_CHARS, PROFILE_VERSION } from "@/lib/profile/types"

export type ReplyStatus = "answered" | "fallback" | "blocked_input" | "blocked_output"

export type Channel = "web" | "cli" | "eval"

export const PLAN_IDS = ["proprio", "entrega", "misto"] as const
export type PlanId = (typeof PLAN_IDS)[number]
// Nomes de knowledge-base/regras.yaml (nomes.plano_*). Conferidos por src/lib/plans.test.ts.
export const PLAN_LABELS: Readonly<Record<PlanId, string>> = {
  proprio: "Plano Próprio",
  entrega: "Plano Entrega",
  misto: "Plano Misto",
}

export const PROFILE_FIELDS = ["name", "plan", "cuisine", "location", "hours"] as const
// Limite de name e hours; o texto de "Outro" usa CUISINE_TEXT_MAX_CHARS.
export const PROFILE_FIELD_MAX_CHARS = 60

// POST /api/chat
export type ChatRequest = {
  sessionId?: string // absent: new conversation
  message: string
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
  // Campo do perfil recusado (400 do PUT /api/profile).
  field?: ProfileErrorField
}
