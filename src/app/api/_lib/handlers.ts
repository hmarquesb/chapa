import { randomUUID, timingSafeEqual } from "node:crypto"
import { ERROR_MESSAGES } from "@/app/api/_lib/errors"
import { HttpError, json, readJsonBody } from "@/app/api/_lib/http"
import { type LogEntry, logRequest } from "@/app/api/_lib/log"
import { checkAccountDailyLimit, checkRateLimit } from "@/app/api/_lib/rate-limit"
import { isUuid, parseChatRequest, parseProfileUpdate } from "@/app/api/_lib/validate"
import { type AppConfig, chunkConfigKey } from "@/config"
import { conversationTitle, sessionCleanupCutoffs } from "@/core/conversations"
import { LlmQuotaError, LlmUnavailableError, SessionNotFoundError } from "@/core/errors"
import { getClientIp, hashIp } from "@/core/request-limits"
import type {
  AccountRecord,
  AccountRepository,
  Assistant,
  ChunkRepository,
  RateLimitRepository,
  SessionRepository,
  StoredMessage,
} from "@/core/types"
import type { ProfileTextRejection } from "@/lib/moderation/profile-text"
import type {
  ApiErrorResponse,
  ChatResponse,
  ConversationListItem,
  HealthResponse,
  HistoryMessage,
  ProfileErrorField,
  ProfileResponse,
  SessionHistoryResponse,
  SessionListResponse,
} from "@/lib/types"

type Log = (entry: LogEntry) => void

// Resolves the account of the request's session cookie (null without a valid session). The
// route files pass getAuthenticatedAccount from src/infra/auth; the tests pass fakes.
export type Authenticate = () => Promise<AccountRecord | null>

const DAY_MS = 24 * 60 * 60 * 1000
const RATE_LIMIT_RETENTION_DAYS = 2

const ROUTES = {
  chat: "/api/chat",
  profile: "/api/profile",
  account: "/api/account",
  history: "/api/sessions/[id]/messages", // the template, never the real path with the id
  sessions: "/api/sessions",
  session: "/api/sessions/[id]",
  health: "/api/health",
  cleanup: "/api/cron/cleanup",
} as const

// ---------- error mapping ----------

// Network failures (Node and postgres.js codes) and the SQLSTATEs Postgres or the Supabase
// pooler send when the database can't take the connection.
const DB_UNAVAILABLE_CODES = new Set([
  "ECONNREFUSED",
  "ECONNRESET",
  "ETIMEDOUT",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "EPIPE",
  "CONNECT_TIMEOUT",
  "CONNECTION_CLOSED",
  "CONNECTION_ENDED",
  "CONNECTION_DESTROYED",
  "53300", // too_many_connections
  "57P01", // admin_shutdown
  "57P02", // crash_shutdown
  "57P03", // cannot_connect_now
])

function isDbUnavailable(error: unknown): boolean {
  if (typeof error !== "object" || error === null || !("code" in error)) return false
  const { code } = error
  return typeof code === "string" && (DB_UNAVAILABLE_CODES.has(code) || code.startsWith("08"))
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : typeof error
}

// Only fixed PT-BR texts leave the server: never the provider's message nor a stack trace.
function toPublicError(error: unknown): {
  status: number
  message: string
  field?: ProfileErrorField
} {
  if (error instanceof HttpError) {
    return {
      status: error.status,
      message: error.publicMessage,
      ...(error.field === undefined ? {} : { field: error.field }),
    }
  }
  if (error instanceof SessionNotFoundError) {
    return { status: 404, message: ERROR_MESSAGES.sessionNotFound }
  }
  if (error instanceof LlmQuotaError) return { status: 429, message: ERROR_MESSAGES.llmQuota }
  if (error instanceof LlmUnavailableError || isDbUnavailable(error)) {
    return { status: 503, message: ERROR_MESSAGES.unavailable }
  }
  return { status: 500, message: ERROR_MESSAGES.internal }
}

function errorResponse(
  status: number,
  message: string,
  headers?: HeadersInit,
  field?: ProfileErrorField,
): Response {
  const body: ApiErrorResponse =
    field === undefined ? { error: message } : { error: message, field }
  return json(body, { status, headers })
}

type Finish = ((entry: Omit<LogEntry, "route" | "method" | "latencyMs" | "accountId">) => void) & {
  // Set as soon as the session is resolved, so every later log line carries it.
  accountId?: string
}

// Measures latency and writes exactly one log line per request.
function startRequest(route: string, method: string, log: Log): Finish {
  const started = performance.now()
  const finish: Finish = (entry) =>
    log({
      route,
      method,
      ...entry,
      ...(finish.accountId === undefined ? {} : { accountId: finish.accountId }),
      latencyMs: Math.round(performance.now() - started),
    })
  return finish
}

// Answers 401 (HttpError) without a valid session; otherwise records the accountId for the log.
async function requireAccount(authenticate: Authenticate, finish: Finish): Promise<AccountRecord> {
  const account = await authenticate()
  if (account === null) throw new HttpError(401, ERROR_MESSAGES.unauthenticated)
  finish.accountId = account.id
  return account
}

function failed(error: unknown, finish: Finish, profileRejected?: ProfileTextRejection): Response {
  const { status, message, field } = toPublicError(error)
  finish({
    status,
    error: errorName(error),
    ...(profileRejected === undefined ? {} : { profileRejected }),
  })
  return errorResponse(status, message, undefined, field)
}

// ---------- POST /api/chat ----------

export function createChatHandler(deps: {
  assistant: Assistant
  sessions: Pick<SessionRepository, "get">
  rateLimits: RateLimitRepository
  accounts: Pick<AccountRepository, "touchLastSeen">
  authenticate: Authenticate
  config: AppConfig
  ipHashSecret: () => string
  now?: () => Date
  log?: Log
}): (req: Request) => Promise<Response> {
  const now = deps.now ?? (() => new Date())
  const log = deps.log ?? logRequest
  const { limits } = deps.config
  let secret: string | undefined // read on the first request, not at import or build time

  return async (req) => {
    const finish = startRequest(ROUTES.chat, "POST", log)
    try {
      // First of all: without a session, the body is never read and the rate limit never counts.
      const account = await requireAccount(deps.authenticate, finish)
      const contentType = req.headers.get("content-type") ?? ""
      if (!contentType.toLowerCase().startsWith("application/json")) {
        throw new HttpError(415, ERROR_MESSAGES.unsupportedMediaType)
      }
      const parsed = parseChatRequest(await readJsonBody(req, limits.maxBodyBytes))
      if (!parsed.ok) throw new HttpError(400, parsed.error)

      secret ??= deps.ipHashSecret()
      const limit = await checkRateLimit({
        ipHash: hashIp(getClientIp(req.headers), secret),
        now: now(),
        repo: deps.rateLimits,
        perMinute: limits.rateLimitPerMinute,
        perDay: limits.rateLimitPerDay,
      })
      if (!limit.allowed) {
        finish({ status: 429 })
        return errorResponse(429, ERROR_MESSAGES.rateLimited, {
          "Retry-After": String(limit.retryAfterSeconds),
        })
      }
      const accountLimit = await checkAccountDailyLimit({
        accountId: account.id,
        kind: account.kind,
        now: now(),
        repo: deps.rateLimits,
        limits: limits.messagesPerAccountPerDay,
      })
      if (!accountLimit.allowed) {
        finish({ status: 429 })
        const message =
          account.kind === "demo" ? ERROR_MESSAGES.demoDailyLimit : ERROR_MESSAGES.accountDailyLimit
        return errorResponse(429, message, {
          "Retry-After": String(accountLimit.retryAfterSeconds),
        })
      }
      await deps.accounts.touchLastSeen(account.id)

      // Without sessionId the server creates the id; with one, it must belong to the account
      // (a foreign id answers like an unknown one: 404).
      const { sessionId: requestedId, message } = parsed.value
      const isNew = requestedId === undefined
      if (!isNew && (await deps.sessions.get(requestedId, { accountId: account.id })) === null) {
        throw new HttpError(404, ERROR_MESSAGES.sessionNotFound)
      }
      const sessionId = requestedId ?? randomUUID()

      const reply = await deps.assistant.handleMessage({
        sessionId,
        message,
        channel: "web",
        accountId: account.id,
        // The profile comes from the account the database just returned, never from the body.
        accountProfile: account.profile,
      })
      finish({
        status: 200,
        replyStatus: reply.status,
        replyRoute: reply.route ?? undefined,
        routerMs: reply.routerMs ?? undefined,
        llmCalls: reply.usage.calls,
        inputTokens: reply.usage.inputTokens,
        outputTokens: reply.usage.outputTokens,
      })
      // Picked one by one: retrieved, searchQuery and usage never leave the server.
      const body: ChatResponse = {
        status: reply.status,
        answer: reply.answer,
        sources: reply.sources,
        // A new conversation blocked at the input is never saved: there is no id to adopt.
        sessionId: isNew && reply.status === "blocked_input" ? null : sessionId,
      }
      return json(body)
    } catch (error) {
      return failed(error, finish)
    }
  }
}

// ---------- GET /api/sessions/[id]/messages ----------

function toHistoryMessage(message: StoredMessage): HistoryMessage {
  return {
    id: message.id,
    role: message.role,
    content: message.content,
    status: message.status,
    sources: message.sources,
    createdAt: message.createdAt.toISOString(),
  }
}

export function createHistoryHandler(deps: {
  sessions: SessionRepository
  authenticate: Authenticate
  log?: Log
}): (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response> {
  const log = deps.log ?? logRequest

  return async (_req, ctx) => {
    const finish = startRequest(ROUTES.history, "GET", log)
    try {
      const account = await requireAccount(deps.authenticate, finish)
      const { id } = await ctx.params
      if (!isUuid(id)) throw new HttpError(400, ERROR_MESSAGES.invalidSessionId)
      // Another account's conversation answers exactly like an unknown one.
      // Read-only: get and listMessages never update last_activity_at.
      const owner = { accountId: account.id }
      const session = await deps.sessions.get(id, owner)
      if (session === null) throw new HttpError(404, ERROR_MESSAGES.sessionNotFound)
      const messages = await deps.sessions.listMessages(session.id, owner)

      finish({ status: 200 })
      const body: SessionHistoryResponse = {
        sessionId: session.id,
        messages: messages.map(toHistoryMessage),
      }
      return json(body)
    } catch (error) {
      return failed(error, finish)
    }
  }
}

// ---------- GET e PUT /api/profile ----------

function requireJson(req: Request): void {
  const contentType = req.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, ERROR_MESSAGES.unsupportedMediaType)
  }
}

export function createProfileHandlers(deps: {
  accounts: Pick<AccountRepository, "updateProfile">
  authenticate: Authenticate
  config: AppConfig
  log?: Log
}): { get: (req: Request) => Promise<Response>; put: (req: Request) => Promise<Response> } {
  const log = deps.log ?? logRequest

  return {
    get: async () => {
      const finish = startRequest(ROUTES.profile, "GET", log)
      try {
        const account = await requireAccount(deps.authenticate, finish)
        finish({ status: 200 })
        const body: ProfileResponse = {
          profile: account.profile,
          needsReview: account.profileNeedsReview,
        }
        return json(body)
      } catch (error) {
        return failed(error, finish)
      }
    },
    put: async (req) => {
      const finish = startRequest(ROUTES.profile, "PUT", log)
      let rejection: ProfileTextRejection | undefined
      try {
        // Without a session the body is never read.
        const account = await requireAccount(deps.authenticate, finish)
        requireJson(req)
        const parsed = await parseProfileUpdate(
          await readJsonBody(req, deps.config.limits.maxBodyBytes),
        )
        if (!parsed.ok) {
          rejection = parsed.rejection
          throw new HttpError(400, parsed.error, parsed.field)
        }
        const profile = await deps.accounts.updateProfile(account.id, parsed.value)
        finish({ status: 200 })
        const body: ProfileResponse = { profile, needsReview: false }
        return json(body)
      } catch (error) {
        return failed(error, finish, rejection)
      }
    },
  }
}

// ---------- DELETE /api/account ----------

export function createDeleteAccountHandler(deps: {
  accounts: Pick<AccountRepository, "delete">
  authenticate: Authenticate
  log?: Log
}): (req: Request) => Promise<Response> {
  const log = deps.log ?? logRequest

  return async () => {
    const finish = startRequest(ROUTES.account, "DELETE", log)
    try {
      const account = await requireAccount(deps.authenticate, finish)
      await deps.accounts.delete(account.id)
      finish({ status: 204 })
      return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } })
    } catch (error) {
      return failed(error, finish)
    }
  }
}

// ---------- GET /api/sessions ----------

export function createListSessionsHandler(deps: {
  sessions: SessionRepository
  authenticate: Authenticate
  config: AppConfig
  log?: Log
}): (req: Request) => Promise<Response> {
  const log = deps.log ?? logRequest
  const { listLimit, titleMaxChars } = deps.config.conversations

  return async () => {
    const finish = startRequest(ROUTES.sessions, "GET", log)
    try {
      const account = await requireAccount(deps.authenticate, finish)
      const records = await deps.sessions.listForAccount(account.id, listLimit)
      const items: ConversationListItem[] = records.map((record) => ({
        id: record.id,
        title: conversationTitle(record.firstQuestion, titleMaxChars),
        lastActivityAt: record.lastActivityAt.toISOString(),
      }))
      finish({ status: 200 })
      const body: SessionListResponse = { sessions: items }
      return json(body)
    } catch (error) {
      return failed(error, finish)
    }
  }
}

// ---------- DELETE /api/sessions/[id] ----------

export function createDeleteSessionHandler(deps: {
  sessions: SessionRepository
  authenticate: Authenticate
  log?: Log
}): (req: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response> {
  const log = deps.log ?? logRequest

  return async (_req, ctx) => {
    const finish = startRequest(ROUTES.session, "DELETE", log)
    try {
      const account = await requireAccount(deps.authenticate, finish)
      const { id } = await ctx.params
      if (!isUuid(id)) throw new HttpError(400, ERROR_MESSAGES.invalidSessionId)
      const deleted = await deps.sessions.deleteForAccount(id, account.id)
      if (!deleted) throw new HttpError(404, ERROR_MESSAGES.sessionNotFound)
      finish({ status: 204 })
      return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } })
    } catch (error) {
      return failed(error, finish)
    }
  }
}

// ---------- GET /api/health ----------

export function createHealthHandler(deps: {
  chunks: ChunkRepository
  config: AppConfig
  log?: Log
}): (req: Request) => Promise<Response> {
  const log = deps.log ?? logRequest
  const embeddingModel = deps.config.models.embedding
  const key = { embeddingModel, chunkConfig: chunkConfigKey(deps.config.rag) }

  return async () => {
    const finish = startRequest(ROUTES.health, "GET", log)
    try {
      const chunks = await deps.chunks.count(key)
      finish({ status: 200 })
      const body: HealthResponse = { ok: true, chunks, embeddingModel }
      return json(body)
    } catch (error) {
      finish({ status: 503, error: errorName(error) })
      const body: HealthResponse = { ok: false, chunks: 0, embeddingModel }
      return json(body, { status: 503 })
    }
  }
}

// ---------- GET /api/cron/cleanup ----------

// Constant-time comparison; different lengths are a plain failure.
function sameSecret(given: string, expected: string): boolean {
  const a = Buffer.from(given, "utf8")
  const b = Buffer.from(expected, "utf8")
  return a.length === b.length && timingSafeEqual(a, b)
}

const BEARER_PREFIX = "Bearer "

export function createCleanupHandler(deps: {
  sessions: SessionRepository
  rateLimits: RateLimitRepository
  accounts: Pick<AccountRepository, "deleteExpired">
  config: AppConfig
  cronSecret: () => string
  now?: () => Date
  log?: Log
}): (req: Request) => Promise<Response> {
  const now = deps.now ?? (() => new Date())
  const log = deps.log ?? logRequest

  return async (req) => {
    const finish = startRequest(ROUTES.cleanup, "GET", log)
    try {
      const authorization = req.headers.get("authorization") ?? ""
      const authorized =
        authorization.startsWith(BEARER_PREFIX) &&
        sameSecret(authorization.slice(BEARER_PREFIX.length), deps.cronSecret())
      if (!authorized) throw new HttpError(401, ERROR_MESSAGES.unauthorized)

      const current = now().getTime()
      const deletedSessions = await deps.sessions.deleteInactive(
        sessionCleanupCutoffs(new Date(current), deps.config),
      )
      const deletedRateLimits = await deps.rateLimits.deleteBefore(
        new Date(current - RATE_LIMIT_RETENTION_DAYS * DAY_MS),
      )
      const deletedAccounts = await deps.accounts.deleteExpired({
        now: new Date(current),
        googleInactiveBefore: new Date(current - deps.config.accounts.googleInactiveDays * DAY_MS),
      })
      finish({ status: 200 })
      return json({ deletedSessions, deletedRateLimits, deletedAccounts })
    } catch (error) {
      return failed(error, finish)
    }
  }
}

// ---------- lazy creation for the route files ----------

// Builds the real handler on the first request, so `next build` never reads env vars nor
// opens connections. If building fails (e.g. MissingEnvError), answers 500 and retries on the
// next request.
export function createLazyHandler<Ctx extends unknown[]>(
  meta: { route: string; method: string; log?: Log },
  create: () => (req: Request, ...ctx: Ctx) => Promise<Response>,
): (req: Request, ...ctx: Ctx) => Promise<Response> {
  let handler: ((req: Request, ...ctx: Ctx) => Promise<Response>) | undefined
  return async (req, ...ctx) => {
    if (handler === undefined) {
      const finish = startRequest(meta.route, meta.method, meta.log ?? logRequest)
      try {
        handler = create()
      } catch (error) {
        return failed(error, finish)
      }
    }
    return handler(req, ...ctx)
  }
}
