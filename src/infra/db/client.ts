import "server-only"
import postgres, { type Sql } from "postgres"
import { requireEnv } from "@/infra/env"

// One client per process. Created on the first getSql() call, so importing this
// module never opens a connection nor needs DATABASE_URL.
let client: Sql | null = null

export function getSql(): Sql {
  if (client === null) {
    client = postgres(requireEnv("DATABASE_URL"), {
      prepare: false, // Supabase pooler in transaction mode (port 6543)
      max: 3,
      idle_timeout: 20,
      connect_timeout: 10,
    })
  }
  return client
}

// Used by the scripts when they finish, so the process can exit.
export async function closeSql(): Promise<void> {
  if (client === null) return
  const current = client
  client = null
  await current.end({ timeout: 5 })
}
