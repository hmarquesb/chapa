import { afterEach, describe, expect, it, vi } from "vitest"
import { MissingEnvError } from "@/core/errors"
import {
  toAccountRecord,
  toChunkCandidate,
  toConversationSummaryRecord,
  toSessionRecord,
  toStoredMessage,
  toVectorLiteral,
} from "@/infra/db/mappers"

const CREATED = new Date("2026-11-05T12:00:00.000Z")
const ACTIVE = new Date("2026-11-05T12:30:00.000Z")

describe("toStoredMessage", () => {
  it("maps an assistant row, converting the id and defaulting null sources to []", () => {
    const row = {
      id: "12",
      session_id: "5f0c1d7e-0000-4000-8000-000000000001",
      role: "assistant",
      content: "x",
      status: "answered",
      sources: null,
      created_at: CREATED,
    }
    expect(toStoredMessage(row)).toEqual({
      id: 12,
      role: "assistant",
      content: "x",
      status: "answered",
      sources: [],
      createdAt: CREATED,
    })
  })

  it("keeps a null status and the given sources", () => {
    const message = toStoredMessage({
      id: 3,
      role: "user",
      content: "Quando cai o repasse?",
      status: null,
      sources: ["02-repasse-financeiro.md"],
      created_at: CREATED,
    })
    expect(message.status).toBeNull()
    expect(message.sources).toEqual(["02-repasse-financeiro.md"])
    expect(message.id).toBe(3)
  })

  it("parses a created_at given as a string", () => {
    const message = toStoredMessage({
      id: "1",
      role: "user",
      content: "oi",
      status: null,
      sources: [],
      created_at: "2026-11-05T12:00:00.000Z",
    })
    expect(message.createdAt).toEqual(CREATED)
  })
})

describe("toSessionRecord", () => {
  it("maps snake_case columns to camelCase and uses the converted profile", () => {
    const row = {
      id: "5f0c1d7e-0000-4000-8000-000000000001",
      channel: "web",
      account_id: "a1b2c3d4-0000-4000-8000-00000000000a",
      profile: { name: "Pizzaria Bella", plan: 1, extra: "drop" }, // raw column, ignored here
      summary: "Falou sobre repasse.",
      summary_until_id: "42",
      created_at: CREATED,
      last_activity_at: ACTIVE,
    }
    expect(toSessionRecord(row, { version: 2, name: "Pizzaria Bella" })).toEqual({
      id: "5f0c1d7e-0000-4000-8000-000000000001",
      channel: "web",
      accountId: "a1b2c3d4-0000-4000-8000-00000000000a",
      profile: { version: 2, name: "Pizzaria Bella" },
      summary: "Falou sobre repasse.",
      summaryUntilId: 42,
      createdAt: CREATED,
      lastActivityAt: ACTIVE,
    })
  })

  it("keeps a null summary and summary_until_id", () => {
    const record = toSessionRecord(
      {
        id: "5f0c1d7e-0000-4000-8000-000000000002",
        channel: "cli",
        account_id: null,
        profile: {},
        summary: null,
        summary_until_id: null,
        created_at: CREATED,
        last_activity_at: ACTIVE,
      },
      { version: 2 },
    )
    expect(record.summary).toBeNull()
    expect(record.summaryUntilId).toBeNull()
    expect(record.profile).toEqual({ version: 2 })
    expect(record.accountId).toBeNull()
  })
})

describe("toConversationSummaryRecord", () => {
  it("maps the list columns to camelCase", () => {
    expect(
      toConversationSummaryRecord({
        id: "5f0c1d7e-0000-4000-8000-000000000003",
        first_question: "Quando cai o repasse?",
        last_activity_at: ACTIVE.toISOString(),
      }),
    ).toEqual({
      id: "5f0c1d7e-0000-4000-8000-000000000003",
      firstQuestion: "Quando cai o repasse?",
      lastActivityAt: ACTIVE,
    })
  })
})

describe("toChunkCandidate", () => {
  it("converts the id and the scores to numbers", () => {
    expect(
      toChunkCandidate({
        id: "7",
        source: "03-cancelamentos.md",
        section: "Prazos",
        content: "Cancelamentos — Prazos\n...",
        semantic: "0.91",
        keyword: 0.5,
      }),
    ).toEqual({
      id: 7,
      source: "03-cancelamentos.md",
      section: "Prazos",
      content: "Cancelamentos — Prazos\n...",
      semantic: 0.91,
      keyword: 0.5,
    })
  })
})

describe("toVectorLiteral", () => {
  it("formats the embedding as a pgvector text literal", () => {
    expect(toVectorLiteral([0.1, -0.2, 3])).toBe("[0.1,-0.2,3]")
  })

  it("rejects non-finite values", () => {
    expect(() => toVectorLiteral([0.1, Number.NaN])).toThrow()
    expect(() => toVectorLiteral([Number.POSITIVE_INFINITY])).toThrow()
  })
})

// RF2: importing the db module must not open a connection nor require DATABASE_URL.
describe("@/infra/db module", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("imports without DATABASE_URL and only getSql() throws MissingEnvError", async () => {
    vi.stubEnv("DATABASE_URL", "")
    const db = await import("@/infra/db")
    expect(typeof db.createChunkRepository).toBe("function")
    expect(typeof db.createSessionRepository).toBe("function")
    expect(typeof db.createRateLimitRepository).toBe("function")
    expect(() => db.getSql()).toThrow(MissingEnvError)
    await expect(db.closeSql()).resolves.toBeUndefined()
  })
})

describe("toAccountRecord", () => {
  const ACCOUNT_ID = "7a0f2b8c-1d2e-4f30-9a41-5b6c7d8e9f01"

  it("maps a google account with an email and no expires_at", () => {
    expect(
      toAccountRecord(
        {
          id: ACCOUNT_ID,
          kind: "google",
          email: "dono@exemplo.com",
          profile: { name: "Pizzaria Bella", extra: "x" }, // raw column, ignored here
          created_at: CREATED,
          last_seen_at: "2026-11-05T12:30:00.000Z",
          expires_at: null,
          welcome_seen_at: null,
        },
        { profile: { version: 2, name: "Pizzaria Bella" }, needsReview: false },
      ),
    ).toEqual({
      id: ACCOUNT_ID,
      kind: "google",
      email: "dono@exemplo.com",
      profile: { version: 2, name: "Pizzaria Bella" },
      profileNeedsReview: false,
      createdAt: CREATED,
      lastSeenAt: ACTIVE,
      expiresAt: null,
      welcomeSeenAt: null,
    })
  })

  it("maps a filled welcome_seen_at to a Date", () => {
    const record = toAccountRecord(
      {
        id: ACCOUNT_ID,
        kind: "google",
        email: "dono@exemplo.com",
        profile: {},
        created_at: CREATED,
        last_seen_at: CREATED,
        expires_at: null,
        welcome_seen_at: "2026-11-05T12:10:00.000Z",
      },
      { profile: { version: 2 }, needsReview: false },
    )
    expect(record.welcomeSeenAt).toEqual(new Date("2026-11-05T12:10:00.000Z"))
  })

  it("maps a demo account without an email and with expires_at", () => {
    const record = toAccountRecord(
      {
        id: ACCOUNT_ID,
        kind: "demo",
        email: null,
        profile: {},
        created_at: CREATED,
        last_seen_at: CREATED,
        expires_at: "2026-11-12T12:00:00.000Z",
        welcome_seen_at: null,
      },
      { profile: { version: 2 }, needsReview: false },
    )
    expect(record.kind).toBe("demo")
    expect(record.email).toBeNull()
    expect(record.expiresAt).toEqual(new Date("2026-11-12T12:00:00.000Z"))
  })

  it("carries the needsReview flag of the converted profile", () => {
    const record = toAccountRecord(
      {
        id: ACCOUNT_ID,
        kind: "demo",
        email: null,
        profile: { city: "Bom Jesus" },
        created_at: CREATED,
        last_seen_at: CREATED,
        expires_at: CREATED,
        welcome_seen_at: null,
      },
      { profile: { version: 2 }, needsReview: true },
    )
    expect(record.profileNeedsReview).toBe(true)
  })
})
