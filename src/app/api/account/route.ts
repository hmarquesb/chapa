import { createDeleteAccountHandler, createLazyHandler } from "@/app/api/_lib/handlers"
import { getAuthenticatedAccount } from "@/infra/auth"
import { getContainer } from "@/infra/container"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const handler = createLazyHandler({ route: "/api/account", method: "DELETE" }, () => {
  const { accounts } = getContainer()
  return createDeleteAccountHandler({
    accounts,
    authenticate: () => getAuthenticatedAccount(),
  })
})

export function DELETE(req: Request): Promise<Response> {
  return handler(req)
}
