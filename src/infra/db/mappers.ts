import "server-only"
import type { ChunkCandidate, SessionRecord, StoredMessage } from "@/core/types"
import { type Channel, PROFILE_FIELDS, type ReplyStatus, type RestaurantProfile } from "@/lib/types"

// Pure conversions between database rows and the core types. The driver returns
// bigint columns as strings, so every id and score goes through toNumber.

type Numeric = number | string | bigint
type Timestamp = Date | string

export type SessionRow = {
  id: string
  channel: string
  profile: unknown
  summary: string | null
  summary_until_id: Numeric | null
  created_at: Timestamp
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

function toNumber(value: Numeric): number {
  return Number(value)
}

function toDate(value: Timestamp): Date {
  return value instanceof Date ? value : new Date(value)
}

// Keeps only the PROFILE_FIELDS keys whose value is a string.
export function toProfile(value: unknown): RestaurantProfile {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return {}
  const source = value as Record<string, unknown>
  const profile: RestaurantProfile = {}
  for (const field of PROFILE_FIELDS) {
    const fieldValue = source[field]
    if (typeof fieldValue === "string") profile[field] = fieldValue
  }
  return profile
}

export function toSessionRecord(row: SessionRow): SessionRecord {
  return {
    id: row.id,
    // The check constraint on sessions.channel guarantees a valid Channel.
    channel: row.channel as Channel,
    profile: toProfile(row.profile),
    summary: row.summary,
    summaryUntilId: row.summary_until_id === null ? null : toNumber(row.summary_until_id),
    createdAt: toDate(row.created_at),
    lastActivityAt: toDate(row.last_activity_at),
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
