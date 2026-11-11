import { createLazyHandler, createListSessionsHandler } from "@/app/api/_lib/handlers"
import { getAuthenticatedAccount } from "@/infra/auth"
import { getContainer } from "@/infra/container"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const handler = createLazyHandler({ route: "/api/sessions", method: "GET" }, () => {
  const { sessions, config } = getContainer()
  return createListSessionsHandler({
    sessions,
    config,
    authenticate: () => getAuthenticatedAccount(),
  })
})

export function GET(req: Request): Promise<Response> {
  return handler(req)
}
