import { createCleanupHandler, createLazyHandler } from "@/app/api/_lib/handlers"
import { getContainer } from "@/infra/container"
import { requireEnv } from "@/infra/env"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

// Called daily by Vercel Cron (vercel.json), which sends Authorization: Bearer <CRON_SECRET>.
const handler = createLazyHandler({ route: "/api/cron/cleanup", method: "GET" }, () => {
  const { sessions, rateLimits, accounts, config } = getContainer()
  return createCleanupHandler({
    sessions,
    rateLimits,
    accounts,
    config,
    cronSecret: () => requireEnv("CRON_SECRET"),
  })
})

export function GET(req: Request): Promise<Response> {
  return handler(req)
}
