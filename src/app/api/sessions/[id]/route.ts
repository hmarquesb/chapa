import { createDeleteSessionHandler, createLazyHandler } from "@/app/api/_lib/handlers"
import { getAuthenticatedAccount } from "@/infra/auth"
import { getContainer } from "@/infra/container"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const handler = createLazyHandler({ route: "/api/sessions/[id]", method: "DELETE" }, () =>
  createDeleteSessionHandler({
    sessions: getContainer().sessions,
    authenticate: () => getAuthenticatedAccount(),
  }),
)

export function DELETE(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  return handler(req, ctx)
}
