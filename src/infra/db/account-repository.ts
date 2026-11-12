import "server-only"
import type { Sql } from "postgres"
import type { AccountRepository } from "@/core/types"
import { type AccountRow, toAccountRecord } from "@/infra/db/mappers"
import { upgradeProfile } from "@/lib/profile/upgrade"

export function createAccountRepository(sql: Sql): AccountRepository {
  return {
    async upsertGoogle({ googleSub, email }) {
      // Only the sub and the email are stored; name and picture never reach the database.
      const [row] = await sql<[AccountRow]>`
        insert into public.accounts (kind, google_sub, email)
        values ('google', ${googleSub}, ${email})
        on conflict (google_sub) do update
          set email = excluded.email, last_seen_at = now()
        returning id, kind, email, profile, created_at, last_seen_at, expires_at, welcome_seen_at
      `
      return toAccountRecord(row, await upgradeProfile(row.profile))
    },

    async createDemo({ expiresAt, profile }) {
      // sql.json sends a JSON object; a pre-stringified value would be stored as a jsonb string.
      const [row] = await sql<[AccountRow]>`
        insert into public.accounts (kind, profile, expires_at)
        values ('demo', ${sql.json(profile)}, ${expiresAt})
        returning id, kind, email, profile, created_at, last_seen_at, expires_at, welcome_seen_at
      `
      return toAccountRecord(row, await upgradeProfile(row.profile))
    },

    async updateProfile(id, profile) {
      const [row] = await sql<[{ profile: unknown }]>`
        update public.accounts set profile = ${sql.json(profile)}
        where id = ${id}
        returning profile
      `
      return (await upgradeProfile(row.profile)).profile
    },

    async findActive(id, now) {
      const [row] = await sql<[AccountRow?]>`
        select id, kind, email, profile, created_at, last_seen_at, expires_at, welcome_seen_at
        from public.accounts
        where id = ${id} and (expires_at is null or expires_at > ${now})
      `
      return row ? toAccountRecord(row, await upgradeProfile(row.profile)) : null
    },

    async touchLastSeen(id) {
      await sql`update public.accounts set last_seen_at = now() where id = ${id}`
    },

    async markWelcomeSeen(id) {
      await sql`
        update public.accounts set welcome_seen_at = coalesce(welcome_seen_at, now())
        where id = ${id}
      `
    },

    async deleteExpired({ now, googleInactiveBefore }) {
      const result = await sql`
        delete from public.accounts
        where (kind = 'demo' and expires_at <= ${now})
           or (kind = 'google' and last_seen_at < ${googleInactiveBefore})
      `
      return result.count
    },

    async delete(id) {
      // The conversations go with the account (on delete cascade).
      const result = await sql`delete from public.accounts where id = ${id}`
      return result.count > 0
    },
  }
}
