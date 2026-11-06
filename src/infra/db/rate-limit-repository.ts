import "server-only"
import type { Sql } from "postgres"
import type { RateLimitRepository } from "@/core/types"

export function createRateLimitRepository(sql: Sql): RateLimitRepository {
  return {
    async hit({ ipHash, bucket, windowStart }) {
      // Atomic upsert: concurrent hits on the same window never lose an increment.
      const [row] = await sql<[{ count: number }]>`
        insert into public.rate_limits (ip_hash, bucket, window_start, count)
        values (${ipHash}, ${bucket}, ${windowStart}, 1)
        on conflict (ip_hash, bucket, window_start)
          do update set count = public.rate_limits.count + 1
        returning count
      `
      return row.count
    },

    async deleteBefore(date) {
      const result = await sql`
        delete from public.rate_limits where window_start < ${date}
      `
      return result.count
    },
  }
}
