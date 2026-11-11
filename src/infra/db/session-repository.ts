import "server-only"
import type { Sql } from "postgres"
import { SessionNotFoundError } from "@/core/errors"
import type { SessionRepository } from "@/core/types"
import {
  type ConversationRow,
  type MessageRow,
  type SessionRow,
  toConversationSummaryRecord,
  toProfile,
  toSessionRecord,
  toStoredMessage,
} from "@/infra/db/mappers"

// Every conversation query carries the owner (ADR 0021): `account_id is not distinct from` also
// matches null with null, so cli and eval conversations belong to the "no account" owner.
export function createSessionRepository(sql: Sql): SessionRepository {
  return {
    async get(id, owner) {
      const [row] = await sql<[SessionRow?]>`
        select id, channel, account_id, profile, summary, summary_until_id, created_at,
          last_activity_at
        from public.sessions
        where id = ${id} and account_id is not distinct from ${owner.accountId}::uuid
      `
      return row ? toSessionRecord(row) : null
    },

    async touch({ id, channel, owner, profile }) {
      // channel and account_id are written only on creation; profile is replaced only when given.
      // The update runs only for the same owner: another owner's row returns nothing.
      // sql.json sends a JSON object; a pre-stringified value would be stored as a jsonb string.
      const [row] = await sql<[SessionRow?]>`
        insert into public.sessions (id, channel, account_id, profile)
        values (${id}, ${channel}, ${owner.accountId}, ${sql.json(toProfile(profile ?? {}))})
        on conflict (id) do update
          set last_activity_at = now()
          ${profile ? sql`, profile = excluded.profile` : sql``}
          where public.sessions.account_id is not distinct from excluded.account_id
        returning id, channel, account_id, profile, summary, summary_until_id, created_at,
          last_activity_at
      `
      if (!row) throw new SessionNotFoundError("Conversa inexistente ou de outro dono.")
      return toSessionRecord(row)
    },

    async listMessages(sessionId, owner, opts) {
      const afterId = opts?.afterId
      const rows = await sql<MessageRow[]>`
        select id, role, content, status, sources, created_at
        from public.messages
        where session_id = ${sessionId}
          and exists (
            select 1 from public.sessions
            where id = ${sessionId} and account_id is not distinct from ${owner.accountId}::uuid
          )
          ${afterId === undefined ? sql`` : sql`and id > ${afterId}`}
        order by id asc
      `
      return rows.map(toStoredMessage)
    },

    async appendTurn(sessionId, owner, turn) {
      await sql.begin(async (tx) => {
        // The update comes first and confirms the owner; no row means rollback without writing.
        const updated = await tx`
          update public.sessions set last_activity_at = now()
          where id = ${sessionId} and account_id is not distinct from ${owner.accountId}::uuid
          returning id
        `
        if (updated.length === 0) {
          throw new SessionNotFoundError("Conversa inexistente ou de outro dono.")
        }
        await tx`
          insert into public.messages (session_id, role, content)
          values (${sessionId}, 'user', ${turn.user})
        `
        await tx`
          insert into public.messages (session_id, role, content, status, sources)
          values (${sessionId}, 'assistant', ${turn.assistant}, ${turn.status}, ${turn.sources}::text[])
        `
      })
    },

    async saveSummary(sessionId, owner, summary, untilId) {
      await sql`
        update public.sessions
        set summary = ${summary}, summary_until_id = ${untilId}
        where id = ${sessionId} and account_id is not distinct from ${owner.accountId}::uuid
      `
    },

    async listForAccount(accountId, limit) {
      const rows = await sql<ConversationRow[]>`
        select s.id, s.last_activity_at, q.content as first_question
        from public.sessions s
        join lateral (
          select m.content from public.messages m
          where m.session_id = s.id and m.role = 'user'
          order by m.id limit 1
        ) q on true
        where s.account_id = ${accountId}
        order by s.last_activity_at desc, s.id
        limit ${limit}
      `
      return rows.map(toConversationSummaryRecord)
    },

    async deleteForAccount(id, accountId) {
      const result = await sql`
        delete from public.sessions where id = ${id} and account_id = ${accountId}
      `
      return result.count > 0
    },

    async deleteInactive({ webBefore, otherBefore }) {
      const result = await sql`
        delete from public.sessions
        where (channel = 'web' and account_id is null)
           or (channel = 'web' and last_activity_at < ${webBefore})
           or (channel in ('cli', 'eval') and last_activity_at < ${otherBefore})
      `
      return result.count
    },
  }
}
