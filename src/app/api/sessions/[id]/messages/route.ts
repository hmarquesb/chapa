import { createHistoryHandler, createLazyHandler } from "@/app/api/_lib/handlers"
import { getContainer } from "@/infra/container"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const handler = createLazyHandler({ route: "/api/sessions/[id]/messages", method: "GET" }, () =>
  createHistoryHandler({ sessions: getContainer().sessions }),
)

export function GET(req: Request, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  return handler(req, ctx)
}
