import { createLazyHandler, createProfileHandlers } from "@/app/api/_lib/handlers"
import { getAuthenticatedAccount } from "@/infra/auth"
import { getContainer } from "@/infra/container"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

function handlers() {
  const { accounts, config } = getContainer()
  return createProfileHandlers({
    accounts,
    config,
    authenticate: () => getAuthenticatedAccount(),
  })
}

const getHandler = createLazyHandler({ route: "/api/profile", method: "GET" }, () => handlers().get)
const putHandler = createLazyHandler({ route: "/api/profile", method: "PUT" }, () => handlers().put)

export function GET(req: Request): Promise<Response> {
  return getHandler(req)
}

export function PUT(req: Request): Promise<Response> {
  return putHandler(req)
}
