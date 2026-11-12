import { createLazyHandler, createWelcomeSeenHandler } from "@/app/api/_lib/handlers"
import { getAuthenticatedAccount } from "@/infra/auth"
import { getContainer } from "@/infra/container"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const handler = createLazyHandler({ route: "/api/account/welcome", method: "POST" }, () => {
  const { accounts } = getContainer()
  return createWelcomeSeenHandler({
    accounts,
    authenticate: () => getAuthenticatedAccount(),
  })
})

export function POST(req: Request): Promise<Response> {
  return handler(req)
}
