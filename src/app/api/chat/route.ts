import { createChatHandler, createLazyHandler } from "@/app/api/_lib/handlers"
import { getAuthenticatedAccount } from "@/infra/auth"
import { getContainer } from "@/infra/container"
import { requireEnv } from "@/infra/env"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
// Assistant turn: up to 3 LLM calls with retries. The Vercel Hobby plan allows up to 300 s
// with Fluid compute (checked on 06/11/2026), so 60 s fits.
export const maxDuration = 60

const handler = createLazyHandler({ route: "/api/chat", method: "POST" }, () => {
  const { assistant, rateLimits, accounts, config } = getContainer()
  return createChatHandler({
    assistant,
    rateLimits,
    accounts,
    authenticate: () => getAuthenticatedAccount(),
    config,
    ipHashSecret: () => requireEnv("IP_HASH_SECRET"),
  })
})

export function POST(req: Request): Promise<Response> {
  return handler(req)
}
