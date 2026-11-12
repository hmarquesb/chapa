import { describe, expect, it } from "vitest"
import {
  createChatHandler,
  createCleanupHandler,
  createDeleteAccountHandler,
  createDeleteSessionHandler,
  createHealthHandler,
  createHistoryHandler,
  createLazyHandler,
  createListSessionsHandler,
  createProfileHandlers,
} from "@/app/api/_lib/handlers"
import type { LogEntry } from "@/app/api/_lib/log"
import { type AppConfig, chunkConfigKey, config } from "@/config"
import {
  LlmQuotaError,
  LlmRequestError,
  LlmUnavailableError,
  MissingEnvError,
  SessionNotFoundError,
} from "@/core/errors"
import type {
  AccountRecord,
  Assistant,
  AssistantReply,
  ChunkRepository,
  ChunkSetKey,
  ConversationSummaryRecord,
  HandleMessageInput,
  RateLimitBucket,
  RateLimitRepository,
  SessionOwner,
  SessionRecord,
  SessionRepository,
  StoredMessage,
} from "@/core/types"
import type { RestaurantProfile } from "@/lib/types"

const SESSION_ID = "0b7c9a52-3f0e-4d4f-9a55-2a1f3c1d9e10"
const OTHER_ID = "5f1d2c3b-4a59-4e6f-8a7b-9c0d1e2f3a4b"
const IP = "203.0.113.77"
const NOW = new Date("2026-11-06T12:00:15.000Z")
const ACCOUNT: AccountRecord = {
  id: "7a0f2b8c-1d2e-4f30-9a41-5b6c7d8e9f01",
  kind: "google",
  email: "MARCADOR-EMAIL@exemplo.com",
  profile: { version: 2 },
  profileNeedsReview: false,
  createdAt: new Date("2026-11-01T12:00:00.000Z"),
  lastSeenAt: new Date("2026-11-06T11:00:00.000Z"),
  expiresAt: null,
}
const OTHER_ACCOUNT: AccountRecord = { ...ACCOUNT, id: "3c9d8e7f-6a5b-4c4d-8e3f-2a1b0c9d8e7f" }
const NOT_FOUND = "Esta conversa não existe mais. Começamos uma nova."
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const UNAUTHENTICATED = "Sua sessão terminou. Entre de novo para continuar."

// ---------- fakes ----------

class MemoryRateLimits implements RateLimitRepository {
  counts = new Map<string, number>()
  hits = 0
  deletedBefore: Date[] = []
  order: string[] = []

  async hit(input: { key: string; bucket: RateLimitBucket; windowStart: Date }) {
    this.hits += 1
    this.order.push("hit")
    const key = `${input.key}|${input.bucket}|${input.windowStart.toISOString()}`
    const count = (this.counts.get(key) ?? 0) + 1
    this.counts.set(key, count)
    return count
  }

  async deleteBefore(date: Date) {
    this.deletedBefore.push(date)
    return 4
  }
}

class FakeAccounts {
  touched: string[] = []
  deleteExpiredArgs: Array<{ now: Date; googleInactiveBefore: Date }> = []
  constructor(private readonly order: string[] = []) {}

  async touchLastSeen(id: string) {
    this.order.push("touchLastSeen")
    this.touched.push(id)
  }
  async deleteExpired(input: { now: Date; googleInactiveBefore: Date }) {
    this.deleteExpiredArgs.push(input)
    return 2
  }
}

const REPLY: AssistantReply = {
  status: "answered",
  answer: "O repasse segue o ciclo do portal.",
  sources: ["02-repasse-financeiro.md"],
  retrieved: [
    {
      id: 1,
      source: "02-repasse-financeiro.md",
      section: "Ciclo",
      content: "TRECHO-INTERNO",
      semantic: 0.9,
      keyword: 1,
      score: 0.93,
    },
  ],
  searchQuery: "CONSULTA-INTERNA",
  usage: { calls: 3, inputTokens: 1200, outputTokens: 150 },
  latencyMs: 800,
}

class FakeAssistant implements Assistant {
  inputs: HandleMessageInput[] = []
  failWith: unknown = null
  reply: AssistantReply = REPLY

  async handleMessage(input: HandleMessageInput): Promise<AssistantReply> {
    this.inputs.push(input)
    if (this.failWith !== null) throw this.failWith
    return this.reply
  }
}

function chatSetup(
  overrides: {
    secret?: () => string
    authenticate?: () => Promise<AccountRecord | null>
    config?: AppConfig
  } = {},
) {
  const assistant = new FakeAssistant()
  const sessions = new FakeSessions()
  const rateLimits = new MemoryRateLimits()
  const accounts = new FakeAccounts(rateLimits.order)
  const logs: LogEntry[] = []
  let secretReads = 0
  let authCalls = 0
  const handler = createChatHandler({
    assistant,
    sessions,
    rateLimits,
    accounts,
    authenticate:
      overrides.authenticate ??
      (async () => {
        authCalls += 1
        return ACCOUNT
      }),
    config: overrides.config ?? config,
    ipHashSecret:
      overrides.secret ??
      (() => {
        secretReads += 1
        return "segredo-de-teste"
      }),
    now: () => NOW,
    log: (entry) => logs.push(entry),
  })
  return {
    handler,
    assistant,
    sessions,
    rateLimits,
    accounts,
    logs,
    secretReads: () => secretReads,
    authCalls: () => authCalls,
  }
}

function chatRequest(
  body: unknown,
  init: { contentType?: string; ip?: string; raw?: string } = {},
): Request {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: {
      "content-type": init.contentType ?? "application/json",
      "x-forwarded-for": init.ip ?? IP,
    },
    body: init.raw ?? JSON.stringify(body),
  })
}

const VALID = { sessionId: SESSION_ID, message: "Quando cai o repasse?" }

// ---------- POST /api/chat ----------

describe("createChatHandler", () => {
  it("answers 401 without an account, before reading the body or counting the rate limit", async () => {
    const { handler, assistant, rateLimits, accounts, logs } = chatSetup({
      authenticate: async () => null,
    })
    const req = chatRequest(VALID, { contentType: "text/plain" })
    const res = await handler(req)
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: UNAUTHENTICATED })
    expect(req.bodyUsed).toBe(false)
    expect(rateLimits.hits).toBe(0)
    expect(accounts.touched).toEqual([])
    expect(assistant.inputs).toEqual([])
    expect(logs).toEqual([expect.objectContaining({ route: "/api/chat", status: 401 })])
    expect(logs[0]?.accountId).toBeUndefined()
  })

  it("touches the account once, after the rate limit", async () => {
    const { handler, rateLimits, accounts, authCalls } = chatSetup()
    expect((await handler(chatRequest(VALID))).status).toBe(200)
    expect(accounts.touched).toEqual([ACCOUNT.id])
    expect(rateLimits.order).toEqual(["hit", "hit", "hit", "touchLastSeen"])
    expect(authCalls()).toBe(1)
  })

  it("does not touch the account when the rate limit refuses the request", async () => {
    const { handler, accounts } = chatSetup()
    for (let i = 1; i <= 11; i += 1) await handler(chatRequest(VALID))
    expect(accounts.touched).toHaveLength(10)
  })

  it("maps a database failure inside authenticate to 503", async () => {
    const { handler, rateLimits } = chatSetup({
      authenticate: async () => {
        throw Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" })
      },
    })
    expect((await handler(chatRequest(VALID))).status).toBe(503)
    expect(rateLimits.hits).toBe(0)
  })

  it("answers a valid request with exactly status, answer, sources and sessionId", async () => {
    const { handler, assistant } = chatSetup()
    const res = await handler(chatRequest(VALID))
    expect(res.status).toBe(200)
    const body = (await res.json()) as Record<string, unknown>
    expect(Object.keys(body).sort()).toEqual(["answer", "sessionId", "sources", "status"])
    expect(body).toEqual({
      status: REPLY.status,
      answer: REPLY.answer,
      sources: REPLY.sources,
      sessionId: SESSION_ID,
    })
    expect(assistant.inputs).toEqual([
      { ...VALID, channel: "web", accountId: ACCOUNT.id, accountProfile: { version: 2 } },
    ])
  })

  it("passes the profile of the authenticated account to the assistant", async () => {
    const profile = { version: 2 as const, name: "Pizzaria Bella", plan: "entrega" as const }
    const { handler, assistant } = chatSetup({
      authenticate: async () => ({ ...ACCOUNT, profile }),
    })
    expect((await handler(chatRequest(VALID))).status).toBe(200)
    expect(assistant.inputs[0]?.accountProfile).toEqual(profile)
    expect(assistant.inputs[0]).not.toHaveProperty("profile")
  })

  it("refuses a profile in the body with 400, before the rate limit", async () => {
    const { handler, assistant, rateLimits } = chatSetup()
    const res = await handler(chatRequest({ ...VALID, profile: { plan: "misto" } }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: "O perfil agora fica salvo na conta. Recarregue a página.",
    })
    expect(assistant.inputs).toEqual([])
    expect(rateLimits.hits).toBe(0)
  })

  it("denies the message over the account daily limit with the text of the account kind", async () => {
    const limited: AppConfig = {
      ...config,
      limits: { ...config.limits, messagesPerAccountPerDay: { google: 2, demo: 1 } },
    }
    const google = chatSetup({ config: limited })
    expect((await google.handler(chatRequest(VALID))).status).toBe(200)
    expect((await google.handler(chatRequest(VALID))).status).toBe(200)
    const res = await google.handler(chatRequest(VALID))
    expect(res.status).toBe(429)
    expect(res.headers.get("retry-after")).toBe(String(12 * 3600 - 15))
    expect(await res.json()).toEqual({
      error: "Você chegou ao limite de mensagens de hoje nesta conta. Volte amanhã.",
    })
    expect(google.assistant.inputs).toHaveLength(2)
    expect(google.accounts.touched).toHaveLength(2)

    const demo = chatSetup({
      config: limited,
      authenticate: async () => ({ ...ACCOUNT, kind: "demo", email: null }),
    })
    expect((await demo.handler(chatRequest(VALID))).status).toBe(200)
    const demoRes = await demo.handler(chatRequest(VALID))
    expect(demoRes.status).toBe(429)
    expect(await demoRes.json()).toEqual({
      error:
        "A conta de demonstração chegou ao limite de mensagens de hoje. Entre com Google para continuar.",
    })
  })

  it("counts the account daily limit by account id, and not the requests refused by the IP", async () => {
    const { handler, rateLimits } = chatSetup()
    for (let i = 1; i <= 11; i += 1) await handler(chatRequest(VALID))
    const key = `${ACCOUNT.id}|account_day|2026-11-06T00:00:00.000Z`
    expect(rateLimits.counts.get(key)).toBe(10)
  })

  it("starts a new conversation with a fresh UUID when sessionId is absent", async () => {
    const { handler, assistant, sessions } = chatSetup()
    const res = await handler(chatRequest({ message: "Quando cai o repasse?" }))
    expect(res.status).toBe(200)
    const body = (await res.json()) as { sessionId: string }
    expect(body.sessionId).toMatch(UUID_PATTERN)
    expect(assistant.inputs).toEqual([
      {
        sessionId: body.sessionId,
        message: "Quando cai o repasse?",
        channel: "web",
        accountId: ACCOUNT.id,
        accountProfile: { version: 2 },
      },
    ])
    expect(sessions.calls).toEqual([])
  })

  it("answers sessionId null when a new conversation is blocked at the input", async () => {
    const { handler, assistant } = chatSetup()
    assistant.reply = { ...REPLY, status: "blocked_input", sources: [] }
    const res = await handler(chatRequest({ message: "meu cpf é 123" }))
    expect(res.status).toBe(200)
    expect(((await res.json()) as { sessionId: unknown }).sessionId).toBeNull()
  })

  it("keeps the sessionId when an existing conversation is blocked at the input", async () => {
    const { handler, assistant } = chatSetup()
    assistant.reply = { ...REPLY, status: "blocked_input", sources: [] }
    const res = await handler(chatRequest(VALID))
    expect(((await res.json()) as { sessionId: unknown }).sessionId).toBe(SESSION_ID)
  })

  it("answers 404 for the sessionId of another account, without calling the assistant", async () => {
    const { handler, assistant, sessions } = chatSetup({
      authenticate: async () => OTHER_ACCOUNT,
    })
    const res = await handler(chatRequest(VALID))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: NOT_FOUND })
    expect(assistant.inputs).toEqual([])
    expect(sessions.calls).toEqual(["get"])
  })

  it("maps a SessionNotFoundError thrown by the assistant to 404", async () => {
    const { handler, assistant } = chatSetup()
    assistant.failWith = new SessionNotFoundError("outro dono")
    const res = await handler(chatRequest(VALID))
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: NOT_FOUND })
  })

  it("never exposes retrieved chunks, the search query or usage", async () => {
    const { handler } = chatSetup()
    const text = await (await handler(chatRequest(VALID))).text()
    expect(text).not.toContain("TRECHO-INTERNO")
    expect(text).not.toContain("CONSULTA-INTERNA")
    expect(text).not.toContain("inputTokens")
  })

  it("refuses a body larger than 4 KB with 413", async () => {
    const { handler, assistant } = chatSetup()
    const res = await handler(chatRequest({ ...VALID, message: "x".repeat(5 * 1024) }))
    expect(res.status).toBe(413)
    expect(((await res.json()) as { error: string }).error).toMatch(/\S/)
    expect(assistant.inputs).toEqual([])
  })

  it("refuses an invalid sessionId with 400", async () => {
    const { handler, assistant, rateLimits } = chatSetup()
    const res = await handler(chatRequest({ ...VALID, sessionId: "abc" }))
    expect(res.status).toBe(400)
    expect(assistant.inputs).toEqual([])
    expect(rateLimits.hits).toBe(0)
  })

  it("refuses invalid JSON with 400", async () => {
    const { handler } = chatSetup()
    expect((await handler(chatRequest(null, { raw: "{oops" }))).status).toBe(400)
  })

  it("refuses a non-JSON Content-Type with 415", async () => {
    const { handler, assistant } = chatSetup()
    const res = await handler(chatRequest(VALID, { contentType: "text/plain" }))
    expect(res.status).toBe(415)
    expect(assistant.inputs).toEqual([])
  })

  it("accepts a JSON Content-Type with charset", async () => {
    const { handler } = chatSetup()
    const res = await handler(
      chatRequest(VALID, { contentType: "application/json; charset=utf-8" }),
    )
    expect(res.status).toBe(200)
  })

  it("maps LlmQuotaError to 429 with the provider-quota text", async () => {
    const { handler, assistant } = chatSetup()
    assistant.failWith = new LlmQuotaError("RESOURCE_EXHAUSTED: detalhe do provedor")
    const res = await handler(chatRequest(VALID))
    expect(res.status).toBe(429)
    expect(await res.json()).toEqual({
      error: "A demo atingiu o limite de uso do provedor de IA. Tente mais tarde.",
    })
  })

  it("maps LlmUnavailableError and database connection errors to 503", async () => {
    const text = "O assistente está indisponível agora. Tente de novo em instantes."
    const connectionError = Object.assign(new Error("connect ECONNREFUSED"), {
      code: "ECONNREFUSED",
    })
    const sqlStateError = Object.assign(new Error("too many connections"), { code: "53300" })
    for (const failure of [new LlmUnavailableError("timeout"), connectionError, sqlStateError]) {
      const { handler, assistant } = chatSetup()
      assistant.failWith = failure
      const res = await handler(chatRequest(VALID))
      expect(res.status).toBe(503)
      expect(await res.json()).toEqual({ error: text })
    }
  })

  it("maps every other error to 500 without leaking its message or stack", async () => {
    const text = "Algo deu errado do nosso lado. Tente de novo."
    for (const failure of [
      new LlmRequestError("API key not valid DETALHE-PROVEDOR"),
      new MissingEnvError("Defina GEMINI_API_KEY no .env.local"),
      new TypeError("undefined is not a function DETALHE-INTERNO"),
      "string lançada",
    ]) {
      const { handler, assistant } = chatSetup()
      assistant.failWith = failure
      const res = await handler(chatRequest(VALID))
      expect(res.status).toBe(500)
      const body = await res.text()
      expect(JSON.parse(body)).toEqual({ error: text })
      expect(body).not.toContain("DETALHE")
      expect(body).not.toContain("GEMINI_API_KEY")
    }
  })

  it("answers 500 when the IP hash secret is missing", async () => {
    const { handler, assistant } = chatSetup({
      secret: () => {
        throw new MissingEnvError("Defina IP_HASH_SECRET no .env.local")
      },
    })
    const res = await handler(chatRequest(VALID))
    expect(res.status).toBe(500)
    expect(assistant.inputs).toEqual([])
  })

  it("reads the IP hash secret only once", async () => {
    const { handler, secretReads } = chatSetup()
    await handler(chatRequest(VALID))
    await handler(chatRequest(VALID))
    expect(secretReads()).toBe(1)
  })

  it("denies the 11th request of the same IP in the same minute with Retry-After", async () => {
    const { handler, assistant } = chatSetup()
    for (let i = 1; i <= 10; i += 1) {
      expect((await handler(chatRequest(VALID))).status).toBe(200)
    }
    const res = await handler(chatRequest(VALID))
    expect(res.status).toBe(429)
    expect(res.headers.get("retry-after")).toBe("45")
    expect(await res.json()).toEqual({
      error: "Muitas mensagens em pouco tempo. Aguarde um pouco e tente de novo.",
    })
    expect(assistant.inputs).toHaveLength(10)
    expect((await handler(chatRequest(VALID, { ip: "198.51.100.9" }))).status).toBe(200)
  })

  it("never stores the IP in clear text", async () => {
    const { handler, rateLimits } = chatSetup()
    await handler(chatRequest(VALID))
    for (const key of rateLimits.counts.keys()) expect(key).not.toContain(IP)
  })
})

// ---------- logs ----------

describe("request logs", () => {
  it("log once per request with status, latency, reply status and usage", async () => {
    const { handler, logs } = chatSetup()
    await handler(chatRequest(VALID))
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({
      route: "/api/chat",
      method: "POST",
      status: 200,
      replyStatus: "answered",
      llmCalls: 3,
      inputTokens: 1200,
      outputTokens: 150,
    })
    expect(logs[0]?.latencyMs).toBeGreaterThanOrEqual(0)
    expect(logs[0]?.error).toBeUndefined()
  })

  it("carry the accountId of the session and never the email", async () => {
    const { handler, assistant, logs } = chatSetup()
    await handler(chatRequest(VALID))
    assistant.failWith = new LlmQuotaError("detalhe")
    await handler(chatRequest(VALID))
    expect(logs).toHaveLength(2)
    for (const entry of logs) expect(entry.accountId).toBe(ACCOUNT.id)
    expect(JSON.stringify(logs)).not.toContain("MARCADOR-EMAIL")
  })

  it("log only the error class name on failure", async () => {
    const { handler, assistant, logs } = chatSetup()
    assistant.failWith = new LlmQuotaError("detalhe do provedor")
    await handler(chatRequest(VALID))
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ status: 429, error: "LlmQuotaError" })
    expect(JSON.stringify(logs)).not.toContain("detalhe do provedor")
  })

  it("never contain the message, the profile, the sessionId or the IP", async () => {
    const { handler, assistant, logs } = chatSetup({
      authenticate: async () => ({ ...ACCOUNT, profile: { version: 2, name: "MARCADOR-PERFIL" } }),
    })
    const body = { sessionId: SESSION_ID, message: "MARCADOR-SECRETO-123" }
    await handler(chatRequest(body))
    await handler(chatRequest({ ...body, sessionId: "MARCADOR-SECRETO-123" }))
    assistant.failWith = new Error("MARCADOR-SECRETO-123")
    await handler(chatRequest(body))
    for (let i = 0; i < 10; i += 1) await handler(chatRequest(body))

    const history = createHistoryHandler({
      sessions: new FakeSessions(),
      authenticate: async () => ACCOUNT,
      log: (entry) => logs.push(entry),
    })
    await history(new Request(`http://localhost/api/sessions/${SESSION_ID}/messages`), {
      params: Promise.resolve({ id: SESSION_ID }),
    })

    expect(logs.length).toBeGreaterThanOrEqual(14)
    const text = JSON.stringify(logs)
    for (const secret of [
      "MARCADOR-SECRETO-123",
      "MARCADOR-PERFIL",
      "MARCADOR-EMAIL",
      SESSION_ID,
      IP,
    ]) {
      expect(text).not.toContain(secret)
    }
  })
})

// ---------- GET /api/sessions/[id]/messages ----------

const SESSION: SessionRecord = {
  id: SESSION_ID,
  channel: "web",
  accountId: ACCOUNT.id,
  profile: { version: 2, name: "Pizzaria Bella", plan: "misto" },
  summary: "RESUMO-INTERNO",
  summaryUntilId: null,
  createdAt: new Date("2026-11-06T11:00:00.000Z"),
  lastActivityAt: new Date("2026-11-06T11:05:00.000Z"),
}

const MESSAGES: StoredMessage[] = [
  {
    id: 7,
    role: "user",
    content: "Quando cai o repasse?",
    status: null,
    sources: [],
    createdAt: new Date("2026-11-06T11:04:00.000Z"),
  },
  {
    id: 8,
    role: "assistant",
    content: "O repasse segue o ciclo do portal.",
    status: "answered",
    sources: ["02-repasse-financeiro.md"],
    createdAt: new Date("2026-11-06T11:04:03.000Z"),
  },
]

const SUMMARIES: ConversationSummaryRecord[] = [
  {
    id: SESSION_ID,
    firstQuestion: "  Quando   cai o repasse?  ",
    lastActivityAt: new Date("2026-11-06T11:05:00.000Z"),
  },
  {
    id: OTHER_ID,
    firstQuestion: "x".repeat(80),
    lastActivityAt: new Date("2026-11-05T09:00:00.000Z"),
  },
]

// Respects the owner like the real repository: SESSION_ID belongs to ACCOUNT, the rest to nobody.
class FakeSessions implements SessionRepository {
  calls: string[] = []
  listArgs: unknown[] = []
  listForAccountArgs: Array<[string, number]> = []
  deleteForAccountArgs: Array<[string, string]> = []
  deleteInactiveArgs: Array<{ webBefore: Date; otherBefore: Date }> = []
  failWith: unknown = null
  summaries: ConversationSummaryRecord[] = SUMMARIES

  private owns(id: string, owner: SessionOwner) {
    return id === SESSION_ID && owner.accountId === ACCOUNT.id
  }

  async get(id: string, owner: SessionOwner) {
    this.calls.push("get")
    if (this.failWith !== null) throw this.failWith
    return this.owns(id, owner) ? SESSION : null
  }
  async touch(): Promise<SessionRecord> {
    this.calls.push("touch")
    return SESSION
  }
  async listMessages(sessionId: string, owner: SessionOwner, opts?: { afterId?: number }) {
    this.calls.push("listMessages")
    this.listArgs.push([sessionId, owner, opts])
    return this.owns(sessionId, owner) ? MESSAGES : []
  }
  async appendTurn() {
    this.calls.push("appendTurn")
  }
  async saveSummary() {
    this.calls.push("saveSummary")
  }
  async listForAccount(accountId: string, limit: number) {
    this.calls.push("listForAccount")
    this.listForAccountArgs.push([accountId, limit])
    if (this.failWith !== null) throw this.failWith
    return accountId === ACCOUNT.id ? this.summaries : []
  }
  async deleteForAccount(id: string, accountId: string) {
    this.calls.push("deleteForAccount")
    this.deleteForAccountArgs.push([id, accountId])
    return id === SESSION_ID && accountId === ACCOUNT.id
  }
  async deleteInactive(input: { webBefore: Date; otherBefore: Date }) {
    this.calls.push("deleteInactive")
    this.deleteInactiveArgs.push(input)
    return 3
  }
}

function historyCall(
  id: string,
  sessions = new FakeSessions(),
  authenticate: () => Promise<AccountRecord | null> = async () => ACCOUNT,
) {
  const logs: LogEntry[] = []
  const handler = createHistoryHandler({
    sessions,
    authenticate,
    log: (entry) => logs.push(entry),
  })
  const res = handler(new Request(`http://localhost/api/sessions/${id}/messages`), {
    params: Promise.resolve({ id }),
  })
  return { res, sessions, logs }
}

describe("createHistoryHandler", () => {
  it("answers 401 without an account, without touching the database", async () => {
    const { res, sessions, logs } = historyCall(SESSION_ID, new FakeSessions(), async () => null)
    const response = await res
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: UNAUTHENTICATED })
    expect(sessions.calls).toEqual([])
    expect(logs).toEqual([expect.objectContaining({ status: 401 })])
  })

  it("answers 401 before validating the id", async () => {
    const { res } = historyCall("nao-e-uuid", new FakeSessions(), async () => null)
    expect((await res).status).toBe(401)
  })

  it("logs the accountId", async () => {
    const { res, logs } = historyCall(SESSION_ID)
    await res
    expect(logs[0]?.accountId).toBe(ACCOUNT.id)
  })

  it("returns every message in order, with ISO dates and no profile", async () => {
    const { res, sessions, logs } = historyCall(SESSION_ID)
    const response = await res
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      sessionId: SESSION_ID,
      messages: [
        {
          id: 7,
          role: "user",
          content: "Quando cai o repasse?",
          status: null,
          sources: [],
          createdAt: "2026-11-06T11:04:00.000Z",
        },
        {
          id: 8,
          role: "assistant",
          content: "O repasse segue o ciclo do portal.",
          status: "answered",
          sources: ["02-repasse-financeiro.md"],
          createdAt: "2026-11-06T11:04:03.000Z",
        },
      ],
    })
    expect(sessions.listArgs).toEqual([[SESSION_ID, { accountId: ACCOUNT.id }, undefined]])
    expect(sessions.calls).not.toContain("touch")
    expect(logs).toEqual([
      expect.objectContaining({ route: "/api/sessions/[id]/messages", method: "GET", status: 200 }),
    ])
  })

  it("answers 404 with the PT-BR text for an unknown session", async () => {
    const response = await historyCall(OTHER_ID).res
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: NOT_FOUND })
  })

  it("answers a conversation of another account exactly like an unknown one", async () => {
    const foreign = await historyCall(SESSION_ID, new FakeSessions(), async () => OTHER_ACCOUNT).res
    const unknown = await historyCall(OTHER_ID).res
    expect(foreign.status).toBe(404)
    expect(foreign.status).toBe(unknown.status)
    expect(await foreign.text()).toBe(await unknown.text())
  })

  it("answers 400 for an id that is not a UUID, without touching the database", async () => {
    const { res, sessions } = historyCall("nao-e-uuid")
    expect((await res).status).toBe(400)
    expect(sessions.calls).toEqual([])
  })

  it("answers 503 when the database is unreachable", async () => {
    const sessions = new FakeSessions()
    sessions.failWith = Object.assign(new Error("timeout"), { code: "CONNECT_TIMEOUT" })
    const { res, logs } = historyCall(SESSION_ID, sessions)
    expect((await res).status).toBe(503)
    expect(logs[0]).toMatchObject({ status: 503, error: "Error" })
  })
})

// ---------- GET /api/sessions ----------

function listCall(
  sessions = new FakeSessions(),
  authenticate: () => Promise<AccountRecord | null> = async () => ACCOUNT,
) {
  const logs: LogEntry[] = []
  const handler = createListSessionsHandler({
    sessions,
    authenticate,
    config,
    log: (entry) => logs.push(entry),
  })
  const res = handler(new Request("http://localhost/api/sessions"))
  return { res, sessions, logs }
}

describe("createListSessionsHandler", () => {
  it("answers 401 without an account, without touching the database", async () => {
    const { res, sessions } = listCall(new FakeSessions(), async () => null)
    const response = await res
    expect(response.status).toBe(401)
    expect(await response.json()).toEqual({ error: UNAUTHENTICATED })
    expect(sessions.calls).toEqual([])
  })

  it("lists only the conversations of the account, in order, with a cut title", async () => {
    const { res, sessions, logs } = listCall()
    const response = await res
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({
      sessions: [
        {
          id: SESSION_ID,
          title: "Quando cai o repasse?",
          lastActivityAt: "2026-11-06T11:05:00.000Z",
        },
        { id: OTHER_ID, title: `${"x".repeat(60)}…`, lastActivityAt: "2026-11-05T09:00:00.000Z" },
      ],
    })
    expect(sessions.listForAccountArgs).toEqual([[ACCOUNT.id, config.conversations.listLimit]])
    expect(logs[0]?.accountId).toBe(ACCOUNT.id)
  })

  it("answers an empty list for an account without conversations", async () => {
    const { res } = listCall(new FakeSessions(), async () => OTHER_ACCOUNT)
    const response = await res
    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ sessions: [] })
  })

  it("answers 503 when the database is unreachable", async () => {
    const sessions = new FakeSessions()
    sessions.failWith = Object.assign(new Error("timeout"), { code: "CONNECT_TIMEOUT" })
    expect((await listCall(sessions).res).status).toBe(503)
  })
})

// ---------- DELETE /api/sessions/[id] ----------

function deleteCall(
  id: string,
  authenticate: () => Promise<AccountRecord | null> = async () => ACCOUNT,
) {
  const sessions = new FakeSessions()
  const logs: LogEntry[] = []
  const handler = createDeleteSessionHandler({
    sessions,
    authenticate,
    log: (entry) => logs.push(entry),
  })
  const res = handler(new Request(`http://localhost/api/sessions/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  })
  return { res, sessions, logs }
}

describe("createDeleteSessionHandler", () => {
  it("answers 204 without a body and with no-store when the owner deletes", async () => {
    const { res, sessions, logs } = deleteCall(SESSION_ID)
    const response = await res
    expect(response.status).toBe(204)
    expect(await response.text()).toBe("")
    expect(response.headers.get("cache-control")).toBe("no-store")
    expect(sessions.deleteForAccountArgs).toEqual([[SESSION_ID, ACCOUNT.id]])
    expect(logs).toEqual([
      expect.objectContaining({ route: "/api/sessions/[id]", method: "DELETE", status: 204 }),
    ])
  })

  it("answers 404 for a conversation of another account", async () => {
    const response = await deleteCall(SESSION_ID, async () => OTHER_ACCOUNT).res
    expect(response.status).toBe(404)
    expect(await response.json()).toEqual({ error: NOT_FOUND })
  })

  it("answers 404 for an unknown conversation", async () => {
    expect((await deleteCall(OTHER_ID).res).status).toBe(404)
  })

  it("answers 400 for an id that is not a UUID, without touching the database", async () => {
    const { res, sessions } = deleteCall("nao-e-uuid")
    expect((await res).status).toBe(400)
    expect(sessions.calls).toEqual([])
  })

  it("answers 401 without an account, before validating the id", async () => {
    const { res, sessions } = deleteCall("nao-e-uuid", async () => null)
    expect((await res).status).toBe(401)
    expect(sessions.calls).toEqual([])
  })
})

// ---------- GET /api/health ----------

class FakeChunks implements ChunkRepository {
  keys: ChunkSetKey[] = []
  constructor(private readonly result: number | Error) {}

  async replaceAll(): Promise<number> {
    throw new Error("not used")
  }
  async search(): Promise<never[]> {
    throw new Error("not used")
  }
  async count(key: ChunkSetKey) {
    this.keys.push(key)
    if (this.result instanceof Error) throw this.result
    return this.result
  }
}

describe("createHealthHandler", () => {
  it("counts the chunks of the current set", async () => {
    const chunks = new FakeChunks(42)
    const logs: LogEntry[] = []
    const handler = createHealthHandler({ chunks, config, log: (entry) => logs.push(entry) })
    const res = await handler(new Request("http://localhost/api/health"))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      ok: true,
      chunks: 42,
      embeddingModel: config.models.embedding,
    })
    expect(chunks.keys).toEqual([
      { embeddingModel: config.models.embedding, chunkConfig: chunkConfigKey(config.rag) },
    ])
    expect(logs).toEqual([expect.objectContaining({ route: "/api/health", status: 200 })])
  })

  it("answers 503 with ok false when count throws", async () => {
    const logs: LogEntry[] = []
    const handler = createHealthHandler({
      chunks: new FakeChunks(new Error("ECONNREFUSED 10.0.0.1")),
      config,
      log: (entry) => logs.push(entry),
    })
    const res = await handler(new Request("http://localhost/api/health"))
    expect(res.status).toBe(503)
    expect(await res.json()).toEqual({
      ok: false,
      chunks: 0,
      embeddingModel: config.models.embedding,
    })
    expect(logs).toEqual([expect.objectContaining({ status: 503, error: "Error" })])
  })
})

// ---------- GET /api/cron/cleanup ----------

function cleanupSetup() {
  const sessions = new FakeSessions()
  const rateLimits = new MemoryRateLimits()
  const accounts = new FakeAccounts()
  const logs: LogEntry[] = []
  const handler = createCleanupHandler({
    sessions,
    rateLimits,
    accounts,
    config,
    cronSecret: () => "segredo-do-cron",
    now: () => NOW,
    log: (entry) => logs.push(entry),
  })
  const call = (authorization?: string) =>
    handler(
      new Request("http://localhost/api/cron/cleanup", {
        headers: authorization === undefined ? {} : { authorization },
      }),
    )
  return { call, sessions, rateLimits, accounts, logs }
}

describe("createCleanupHandler", () => {
  it.each([
    ["no header", undefined],
    ["a wrong secret", "Bearer segredo-errado"],
    ["a secret of another length", "Bearer s"],
    ["a different scheme", "Basic segredo-do-cron"],
    ["the bare secret", "segredo-do-cron"],
  ])("answers 401 with %s and calls no repository", async (_label, authorization) => {
    const { call, sessions, rateLimits, accounts, logs } = cleanupSetup()
    const res = await call(authorization)
    expect(res.status).toBe(401)
    expect(accounts.deleteExpiredArgs).toEqual([])
    expect(((await res.json()) as { error: string }).error).toMatch(/\S/)
    expect(sessions.calls).toEqual([])
    expect(rateLimits.deletedBefore).toEqual([])
    expect(logs).toEqual([expect.objectContaining({ route: "/api/cron/cleanup", status: 401 })])
  })

  it("deletes web sessions idle for 30 days, cli and eval for 7, and rate limits older than 2 days", async () => {
    const { call, sessions, rateLimits } = cleanupSetup()
    const res = await call("Bearer segredo-do-cron")
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({
      deletedSessions: 3,
      deletedRateLimits: 4,
      deletedAccounts: 2,
    })
    expect(sessions.deleteInactiveArgs).toEqual([
      {
        webBefore: new Date("2026-10-07T12:00:15.000Z"),
        otherBefore: new Date("2026-10-30T12:00:15.000Z"),
      },
    ])
    expect(rateLimits.deletedBefore).toEqual([new Date("2026-11-04T12:00:15.000Z")])
  })

  it("deletes expired demos and Google accounts idle for 180 days", async () => {
    const { call, accounts } = cleanupSetup()
    await call("Bearer segredo-do-cron")
    expect(accounts.deleteExpiredArgs).toEqual([
      { now: NOW, googleInactiveBefore: new Date("2026-05-10T12:00:15.000Z") },
    ])
  })
})

// ---------- lazy creation in the route files ----------

describe("createLazyHandler", () => {
  it("creates the handler on the first request only", async () => {
    let created = 0
    const handler = createLazyHandler({ route: "/api/x", method: "GET" }, () => {
      created += 1
      return async () => new Response("ok")
    })
    expect(created).toBe(0)
    await handler(new Request("http://localhost/api/x"))
    await handler(new Request("http://localhost/api/x"))
    expect(created).toBe(1)
  })

  it("answers 500 and logs the error name when creation fails, then retries", async () => {
    const logs: LogEntry[] = []
    let attempts = 0
    const handler = createLazyHandler(
      { route: "/api/x", method: "GET", log: (entry) => logs.push(entry) },
      () => {
        attempts += 1
        if (attempts === 1) throw new MissingEnvError("Defina DATABASE_URL no .env.local")
        return async () => new Response("ok")
      },
    )
    const first = await handler(new Request("http://localhost/api/x"))
    expect(first.status).toBe(500)
    const body = await first.text()
    expect(JSON.parse(body)).toEqual({ error: "Algo deu errado do nosso lado. Tente de novo." })
    expect(body).not.toContain("DATABASE_URL")
    expect(logs).toEqual([
      expect.objectContaining({ route: "/api/x", status: 500, error: "MissingEnvError" }),
    ])
    expect((await handler(new Request("http://localhost/api/x"))).status).toBe(200)
  })

  it("passes the route context through", async () => {
    const handler = createLazyHandler(
      { route: "/api/x/[id]", method: "GET" },
      () => async (_req: Request, ctx: { params: Promise<{ id: string }> }) =>
        new Response((await ctx.params).id),
    )
    const res = await handler(new Request("http://localhost/api/x/7"), {
      params: Promise.resolve({ id: "7" }),
    })
    expect(await res.text()).toBe("7")
  })
})

// ---------- GET e PUT /api/profile ----------

class FakeProfileAccounts {
  updates: Array<{ id: string; profile: RestaurantProfile }> = []
  failWith: unknown = null

  async updateProfile(id: string, profile: RestaurantProfile) {
    if (this.failWith !== null) throw this.failWith
    this.updates.push({ id, profile })
    return profile
  }
}

function profileSetup(authenticate: () => Promise<AccountRecord | null> = async () => ACCOUNT) {
  const accounts = new FakeProfileAccounts()
  const logs: LogEntry[] = []
  const handlers = createProfileHandlers({
    accounts,
    authenticate,
    config,
    log: (entry) => logs.push(entry),
  })
  return { accounts, logs, ...handlers }
}

function profileRequest(
  method: string,
  body?: unknown,
  init: { contentType?: string; raw?: string } = {},
): Request {
  return new Request("http://localhost/api/profile", {
    method,
    headers: { "content-type": init.contentType ?? "application/json" },
    body: method === "GET" ? undefined : (init.raw ?? JSON.stringify(body)),
  })
}

describe("createProfileHandlers", () => {
  const V2_BODY = {
    version: 2,
    name: "  Pizzaria Bella ",
    plan: "entrega",
    cuisine: { id: "pizza" },
    location: { uf: "RJ", cityCode: 3303302 },
  }
  const V2_SAVED = {
    version: 2,
    name: "Pizzaria Bella",
    plan: "entrega",
    cuisine: { id: "pizza" },
    location: { uf: "RJ", cityCode: 3303302 },
  }

  it("GET returns the profile of the account and needsReview", async () => {
    const profile = { version: 2 as const, name: "Pizzaria Bella", plan: "misto" as const }
    const { get, logs } = profileSetup(async () => ({ ...ACCOUNT, profile }))
    const res = await get(profileRequest("GET"))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ profile, needsReview: false })
    expect(logs).toEqual([
      expect.objectContaining({ route: "/api/profile", method: "GET", status: 200 }),
    ])
    expect(logs[0]?.accountId).toBe(ACCOUNT.id)
  })

  it("GET returns needsReview true for a converted legacy profile", async () => {
    const { get } = profileSetup(async () => ({
      ...ACCOUNT,
      profile: { version: 2, plan: "misto" },
      profileNeedsReview: true,
    }))
    const res = await get(profileRequest("GET"))
    expect(await res.json()).toEqual({
      profile: { version: 2, plan: "misto" },
      needsReview: true,
    })
  })

  it("PUT saves a valid v2 profile and answers it with needsReview false", async () => {
    const { put, accounts, logs } = profileSetup()
    const res = await put(profileRequest("PUT", V2_BODY))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ profile: V2_SAVED, needsReview: false })
    expect(accounts.updates).toEqual([{ id: ACCOUNT.id, profile: V2_SAVED }])
    expect(logs[0]).toMatchObject({ route: "/api/profile", method: "PUT", status: 200 })
  })

  it("PUT saves a profile with only the state", async () => {
    const { put, accounts } = profileSetup()
    const res = await put(
      profileRequest("PUT", { version: 2, plan: "misto", location: { uf: "MG" } }),
    )
    expect(res.status).toBe(200)
    expect(accounts.updates[0]?.profile.location).toEqual({ uf: "MG" })
  })

  it("PUT refuses the legacy format with 400 and does not save", async () => {
    const { put, accounts } = profileSetup()
    const res = await put(profileRequest("PUT", { plan: "misto", name: "Bella" }))
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: "O formulário do perfil mudou. Recarregue a página.",
    })
    expect(accounts.updates).toEqual([])
  })

  it("PUT answers 400 with field cuisine for a cuisine outside the list", async () => {
    const { put, accounts } = profileSetup()
    for (const cuisine of [
      { id: "tailandesa" },
      { id: "outro" },
      { id: "outro", text: "x".repeat(31) },
    ]) {
      const res = await put(profileRequest("PUT", { version: 2, plan: "misto", cuisine }))
      expect(res.status).toBe(400)
      expect(await res.json()).toEqual({
        error: "Escolha o tipo de cozinha da lista ou descreva em até 30 caracteres.",
        field: "cuisine",
      })
    }
    expect(accounts.updates).toEqual([])
  })

  it("PUT answers 400 with field location for a city of another state", async () => {
    const { put, accounts } = profileSetup()
    const res = await put(
      profileRequest("PUT", {
        version: 2,
        plan: "misto",
        location: { uf: "SP", cityCode: 3304557 },
      }),
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: "Escolha o estado e a cidade da lista.",
      field: "location",
    })
    expect(accounts.updates).toEqual([])
  })

  it("PUT answers 400 for a missing or invalid plan and an unknown field, without saving", async () => {
    const { put, accounts } = profileSetup()
    const noPlan = await put(profileRequest("PUT", { version: 2, name: "Bella" }))
    expect(noPlan.status).toBe(400)
    expect(await noPlan.json()).toEqual({ error: "Escolha o plano: Próprio, Entrega ou Misto." })
    expect((await put(profileRequest("PUT", { version: 2, plan: "premium" }))).status).toBe(400)
    const unknown = await put(profileRequest("PUT", { version: 2, plan: "misto", cnpj: "1" }))
    expect(unknown.status).toBe(400)
    expect(await unknown.json()).toEqual({ error: "O pedido tem campos desconhecidos." })
    expect(accounts.updates).toEqual([])
  })

  it("PUT answers 400 with the field for a refused text, logs only the reason and does not save", async () => {
    const { put, accounts, logs } = profileSetup()
    const res = await put(
      profileRequest("PUT", { version: 2, plan: "misto", name: "M3rd@ Burguer" }),
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toEqual({
      error: "Esse nome tem um termo que não é permitido. Escolha outro.",
      field: "name",
    })
    expect(accounts.updates).toEqual([])
    expect(logs[0]).toMatchObject({ status: 400, profileRejected: "termo_inadequado" })
    const line = JSON.stringify(logs[0]).toLowerCase()
    for (const piece of ["m3rd", "burguer", "rd@"]) expect(line).not.toContain(piece)
  })

  it("PUT answers 400 with the cuisine field for a forbidden character in Outro", async () => {
    const { put, logs } = profileSetup()
    const res = await put(
      profileRequest("PUT", {
        version: 2,
        plan: "proprio",
        cuisine: { id: "outro", text: "<b>pizza</b>" },
      }),
    )
    expect(res.status).toBe(400)
    expect(await res.json()).toMatchObject({ field: "cuisine" })
    expect(logs[0]).toMatchObject({ profileRejected: "caractere" })
    expect(JSON.stringify(logs[0])).not.toContain("pizza")
  })

  it("PUT answers 400 without field when the plan is missing, even with a refused name", async () => {
    const { put, logs } = profileSetup()
    const res = await put(profileRequest("PUT", { version: 2, name: "M3rd@ Burguer" }))
    expect(await res.json()).toEqual({ error: "Escolha o plano: Próprio, Entrega ou Misto." })
    expect(logs[0]).not.toHaveProperty("profileRejected")
  })

  it("PUT answers 413 for a body over the limit, 415 for a non-JSON type and 400 for broken JSON", async () => {
    const { put, accounts } = profileSetup()
    expect(
      (await put(profileRequest("PUT", { version: 2, plan: "misto", name: "x".repeat(5 * 1024) })))
        .status,
    ).toBe(413)
    expect((await put(profileRequest("PUT", {}, { contentType: "text/plain" }))).status).toBe(415)
    expect((await put(profileRequest("PUT", null, { raw: "{oops" }))).status).toBe(400)
    expect(accounts.updates).toEqual([])
  })

  it("answers 401 without a session, without reading the body", async () => {
    const { get, put, accounts } = profileSetup(async () => null)
    expect((await get(profileRequest("GET"))).status).toBe(401)
    const req = profileRequest("PUT", { version: 2, plan: "misto" }, { contentType: "text/plain" })
    const res = await put(req)
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: UNAUTHENTICATED })
    expect(req.bodyUsed).toBe(false)
    expect(accounts.updates).toEqual([])
  })

  it("PUT maps a database failure to 503", async () => {
    const { put, accounts } = profileSetup()
    accounts.failWith = Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" })
    expect((await put(profileRequest("PUT", { version: 2, plan: "misto" }))).status).toBe(503)
  })
})

// ---------- DELETE /api/account ----------

describe("createDeleteAccountHandler", () => {
  function deleteSetup(authenticate: () => Promise<AccountRecord | null> = async () => ACCOUNT) {
    const deleted: string[] = []
    const logs: LogEntry[] = []
    let failWith: unknown = null
    const handler = createDeleteAccountHandler({
      accounts: {
        async delete(id: string) {
          if (failWith !== null) throw failWith
          deleted.push(id)
          return true
        },
      },
      authenticate,
      log: (entry) => logs.push(entry),
    })
    return {
      handler,
      deleted,
      logs,
      failWith: (error: unknown) => {
        failWith = error
      },
    }
  }
  const request = () => new Request("http://localhost/api/account", { method: "DELETE" })

  it("deletes the account, answers 204 without a body and no-store", async () => {
    const { handler, deleted, logs } = deleteSetup()
    const res = await handler(request())
    expect(res.status).toBe(204)
    expect(await res.text()).toBe("")
    expect(res.headers.get("cache-control")).toBe("no-store")
    expect(deleted).toEqual([ACCOUNT.id])
    expect(logs[0]).toMatchObject({ route: "/api/account", method: "DELETE", status: 204 })
    expect(logs[0]?.accountId).toBe(ACCOUNT.id)
  })

  it("answers 401 without a session and deletes nothing", async () => {
    const { handler, deleted } = deleteSetup(async () => null)
    const res = await handler(request())
    expect(res.status).toBe(401)
    expect(await res.json()).toEqual({ error: UNAUTHENTICATED })
    expect(deleted).toEqual([])
  })

  it("maps a database failure to 503", async () => {
    const { handler, failWith } = deleteSetup()
    failWith(Object.assign(new Error("connect ECONNREFUSED"), { code: "ECONNREFUSED" }))
    expect((await handler(request())).status).toBe(503)
  })
})
