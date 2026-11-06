import "server-only"
import type { Sql } from "postgres"
import type { SessionRepository } from "@/core/types"
import {
  type MessageRow,
  type SessionRow,
  toProfile,
  toSessionRecord,
  toStoredMessage,
} from "@/infra/db/mappers"

export function createSessionRepository(sql: Sql): SessionRepository {
  return {
    async get(id) {
      const [row] = await sql<[SessionRow?]>`
        select id, channel, profile, summary, summary_until_id, created_at, last_activity_at
        from public.sessions
        where id = ${id}
      `
      return row ? toSessionRecord(row) : null
    },

    async touch({ id, channel, profile }) {
      // channel is written only on creation; profile is replaced only when given.
      // sql.json sends a JSON object; a pre-stringified value would be stored as a jsonb string.
      const [row] = await sql<[SessionRow]>`
        insert into public.sessions (id, channel, profile)
        values (${id}, ${channel}, ${sql.json(toProfile(profile ?? {}))})
        on conflict (id) do update
          set last_activity_at = now()
          ${profile ? sql`, profile = excluded.profile` : sql``}
        returning id, channel, profile, summary, summary_until_id, created_at, last_activity_at
      `
      return toSessionRecord(row)
    },

    async listMessages(sessionId, opts) {
      const afterId = opts?.afterId
      const rows = await sql<MessageRow[]>`
        select id, role, content, status, sources, created_at
        from public.messages
        where session_id = ${sessionId}
          ${afterId === undefined ? sql`` : sql`and id > ${afterId}`}
        order by id asc
      `
      return rows.map(toStoredMessage)
    },

    async appendTurn(sessionId, turn) {
      await sql.begin(async (tx) => {
        await tx`
          insert into public.messages (session_id, role, content)
          values (${sessionId}, 'user', ${turn.user})
        `
        await tx`
          insert into public.messages (session_id, role, content, status, sources)
          values (${sessionId}, 'assistant', ${turn.assistant}, ${turn.status}, ${turn.sources}::text[])
        `
        await tx`
          update public.sessions set last_activity_at = now() where id = ${sessionId}
        `
      })
    },

    async saveSummary(sessionId, summary, untilId) {
      await sql`
        update public.sessions
        set summary = ${summary}, summary_until_id = ${untilId}
        where id = ${sessionId}
      `
    },

    async deleteInactive(olderThan) {
      const result = await sql`
        delete from public.sessions where last_activity_at < ${olderThan}
      `
      return result.count
    },
  }
}
