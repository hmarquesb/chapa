import type { ProfileTextField } from "@/lib/moderation/profile-text"

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

export type RestaurantProfile = {
  name?: string
  plan?: PlanId
  cuisine?: string
  city?: string
  hours?: string
}

export const PROFILE_FIELDS = ["name", "plan", "cuisine", "city", "hours"] as const
export const PROFILE_FIELD_MAX_CHARS = 60

// GET e PUT /api/profile
export type ProfileResponse = { profile: RestaurantProfile }
export type ProfileUpdateRequest = Omit<RestaurantProfile, "plan"> & { plan: PlanId }

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
  // Campo do perfil recusado pelo filtro de texto (400 do PUT /api/profile).
  field?: ProfileTextField
}
