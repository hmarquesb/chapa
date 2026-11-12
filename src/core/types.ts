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

// Bloco do contexto enviado ao modelo: um trecho ou um documento inteiro (section "").
export type ContextBlock = { source: string; section: string; content: string }

export interface ChunkRepository {
  replaceAll(key: ChunkSetKey, chunks: Array<Chunk & { embedding: number[] }>): Promise<number>
  search(input: {
    key: ChunkSetKey
    embedding: number[]
    query: string
    limit: number
  }): Promise<ChunkCandidate[]>
  count(key: ChunkSetKey): Promise<number>
  // Todos os trechos dos arquivos indicados no conjunto ativo, em ordem de id.
  listBySources(key: ChunkSetKey, sources: string[]): Promise<Chunk[]>
}

// ---------- Sessões e mensagens ----------
// accountId null: conversa do CLI ou do eval. Na web, sempre a conta logada.
export type SessionOwner = { accountId: string | null }

export type SessionRecord = {
  id: string
  channel: Channel
  accountId: string | null
  profile: RestaurantProfile
  summary: string | null
  summaryUntilId: number | null // último messages.id incorporado ao resumo
  createdAt: Date
  lastActivityAt: Date
}

export type ConversationSummaryRecord = {
  id: string
  firstQuestion: string // conteúdo da primeira mensagem do parceiro
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
  // null se não existe ou se o dono é outro (account_id is not distinct from owner.accountId).
  get(id: string, owner: SessionOwner): Promise<SessionRecord | null>
  // Cria com channel e account_id, ou renova last_activity_at (e o perfil, se vier) só quando
  // o dono é o mesmo. Se o id existe com outro dono, lança SessionNotFoundError e não muda nada.
  touch(input: {
    id: string
    channel: Channel
    owner: SessionOwner
    profile?: RestaurantProfile
  }): Promise<SessionRecord>
  // [] se o dono é outro.
  listMessages(
    sessionId: string,
    owner: SessionOwner,
    opts?: { afterId?: number },
  ): Promise<StoredMessage[]>
  // Lança SessionNotFoundError, sem gravar nada, se a conversa não é do dono.
  appendTurn(
    sessionId: string,
    owner: SessionOwner,
    turn: { user: string; assistant: string; status: ReplyStatus; sources: string[] },
  ): Promise<void>
  // Não faz nada se o dono é outro.
  saveSummary(
    sessionId: string,
    owner: SessionOwner,
    summary: string,
    untilId: number,
  ): Promise<void>
  // Só conversas da conta com pelo menos uma mensagem, last_activity_at desc, id; no máximo limit.
  listForAccount(accountId: string, limit: number): Promise<ConversationSummaryRecord[]>
  // true se apagou.
  deleteForAccount(id: string, accountId: string): Promise<boolean>
  // web sem conta (qualquer idade), web com last_activity_at < webBefore, cli e eval com
  // last_activity_at < otherBefore. Devolve quantas.
  deleteInactive(input: { webBefore: Date; otherBefore: Date }): Promise<number>
}

// ---------- Contas ----------
export type AccountKind = "google" | "demo"

export type AccountRecord = {
  id: string
  kind: AccountKind
  email: string | null // só google
  profile: RestaurantProfile
  // O perfil salvo no formato antigo perdeu campos na conversão: a pessoa precisa revisar.
  profileNeedsReview: boolean
  createdAt: Date
  lastSeenAt: Date
  expiresAt: Date | null // só demo
  welcomeSeenAt: Date | null // nulo até a conta fechar o card; demo nunca grava
}

export interface AccountRepository {
  // Cria a conta ou, se o sub já existe, atualiza o e-mail e o last_seen_at.
  upsertGoogle(input: { googleSub: string; email: string }): Promise<AccountRecord>
  // Substitui o perfil da conta e devolve o salvo. O id existe: quem chama já autenticou a conta.
  updateProfile(id: string, profile: RestaurantProfile): Promise<RestaurantProfile>
  createDemo(input: { expiresAt: Date; profile: RestaurantProfile }): Promise<AccountRecord>
  // null se a conta não existe ou se expires_at <= now.
  findActive(id: string, now: Date): Promise<AccountRecord | null>
  touchLastSeen(id: string): Promise<void>
  // Grava now() só se ainda estiver nulo (o primeiro registro vale). O id existe: quem chama já autenticou.
  markWelcomeSeen(id: string): Promise<void>
  // Demo com expires_at <= now e Google com last_seen_at < googleInactiveBefore. Devolve quantas.
  deleteExpired(input: { now: Date; googleInactiveBefore: Date }): Promise<number>
  // Apaga a conta; as conversas vão junto (on delete cascade). true se apagou.
  delete(id: string): Promise<boolean>
}

// ---------- Rate limit ----------
export type RateLimitBucket = "minute" | "day" | "demo_day" | "account_day"

export interface RateLimitRepository {
  // key: HMAC do IP (minute, day, demo_day) ou id da conta (account_day).
  hit(input: { key: string; bucket: RateLimitBucket; windowStart: Date }): Promise<number>
  deleteBefore(date: Date): Promise<number>
}

// ---------- Assistente ----------
export type HandleMessageInput = {
  sessionId: string
  message: string
  channel: Channel
  accountId: string | null // obrigatório na web e nulo no CLI e no eval
  // cli e eval: substitui o perfil salvo na conversa. Proibido na web.
  profile?: RestaurantProfile
  // web: o perfil da conta, usado no prompt e nunca gravado na conversa. Proibido em cli e eval.
  accountProfile?: RestaurantProfile
}

// Rota que decidiu o turno.
export type ReplyRoute = "cumprimento" | "conversa" | "rag"

export type AssistantReply = {
  status: ReplyStatus
  answer: string
  sources: string[] // arquivos únicos, na ordem do score; [] se status !== "answered"
  retrieved: RetrievedChunk[] // para eval e debug; a API não expõe
  context: ContextBlock[] // o que foi enviado ao modelo; [] sem geração; a API não expõe
  searchQuery: string // pergunta usada na busca (reescrita ou original)
  usage: Usage // soma das chamadas de LLM do turno
  latencyMs: number
  routerMs: number | null // latência da chamada do roteador; null quando ele não rodou
  route: ReplyRoute | null // null só no blocked_input: a mensagem bloqueada não chega à decisão
}

export interface Assistant {
  handleMessage(input: HandleMessageInput): Promise<AssistantReply>
}
