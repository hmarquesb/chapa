import "server-only"
import type {
  AccountKind,
  AccountRecord,
  ChunkCandidate,
  ConversationSummaryRecord,
  SessionRecord,
  StoredMessage,
} from "@/core/types"
import type { Channel, ReplyStatus, RestaurantProfile } from "@/lib/types"

// Pure conversions between database rows and the core types. The driver returns
// bigint columns as strings, so every id and score goes through toNumber.

type Numeric = number | string | bigint
type Timestamp = Date | string

export type SessionRow = {
  id: string
  channel: string
  account_id: string | null
  profile: unknown
  summary: string | null
  summary_until_id: Numeric | null
  created_at: Timestamp
  last_activity_at: Timestamp
}

export type ConversationRow = {
  id: string
  first_question: string
  last_activity_at: Timestamp
}

export type MessageRow = {
  id: Numeric
  role: string
  content: string
  status: string | null
  sources: string[] | null
  created_at: Timestamp
}

export type ChunkRow = {
  id: Numeric
  source: string
  section: string
  content: string
  semantic: Numeric
  keyword: Numeric
}

export type AccountRow = {
  id: string
  kind: string
  email: string | null
  profile: unknown
  created_at: Timestamp
  last_seen_at: Timestamp
  expires_at: Timestamp | null
  welcome_seen_at: Timestamp | null
}

function toNumber(value: Numeric): number {
  return Number(value)
}

function toDate(value: Timestamp): Date {
  return value instanceof Date ? value : new Date(value)
}

// The profile column is converted by upgradeProfile (src/lib/profile/upgrade.ts), which is async,
// so the repositories convert it and pass the result in.
export function toSessionRecord(row: SessionRow, profile: RestaurantProfile): SessionRecord {
  return {
    id: row.id,
    // The check constraint on sessions.channel guarantees a valid Channel.
    channel: row.channel as Channel,
    accountId: row.account_id,
    profile,
    summary: row.summary,
    summaryUntilId: row.summary_until_id === null ? null : toNumber(row.summary_until_id),
    createdAt: toDate(row.created_at),
    lastActivityAt: toDate(row.last_activity_at),
  }
}

export function toConversationSummaryRecord(row: ConversationRow): ConversationSummaryRecord {
  return {
    id: row.id,
    firstQuestion: row.first_question,
    lastActivityAt: toDate(row.last_activity_at),
  }
}

export function toAccountRecord(
  row: AccountRow,
  upgraded: { profile: RestaurantProfile; needsReview: boolean },
): AccountRecord {
  return {
    id: row.id,
    // The check constraint on accounts.kind guarantees a valid AccountKind.
    kind: row.kind as AccountKind,
    email: row.email,
    profile: upgraded.profile,
    profileNeedsReview: upgraded.needsReview,
    createdAt: toDate(row.created_at),
    lastSeenAt: toDate(row.last_seen_at),
    expiresAt: row.expires_at === null ? null : toDate(row.expires_at),
    welcomeSeenAt: row.welcome_seen_at === null ? null : toDate(row.welcome_seen_at),
  }
}

export function toStoredMessage(row: MessageRow): StoredMessage {
  return {
    id: toNumber(row.id),
    // The check constraints on messages.role and messages.status guarantee valid values.
    role: row.role as StoredMessage["role"],
    content: row.content,
    status: row.status as ReplyStatus | null,
    sources: row.sources ?? [],
    createdAt: toDate(row.created_at),
  }
}

export function toChunkCandidate(row: ChunkRow): ChunkCandidate {
  return {
    id: toNumber(row.id),
    source: row.source,
    section: row.section,
    content: row.content,
    semantic: toNumber(row.semantic),
    keyword: toNumber(row.keyword),
  }
}

// pgvector text input format: "[0.1,0.2,...]".
export function toVectorLiteral(embedding: number[]): string {
  for (const value of embedding) {
    if (!Number.isFinite(value)) throw new RangeError("Embedding has a non-finite value")
  }
  return `[${embedding.join(",")}]`
}
