import { createHealthHandler, createLazyHandler } from "@/app/api/_lib/handlers"
import { getContainer } from "@/infra/container"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

const handler = createLazyHandler({ route: "/api/health", method: "GET" }, () => {
  const { chunks, config } = getContainer()
  return createHealthHandler({ chunks, config })
})

export function GET(req: Request): Promise<Response> {
  return handler(req)
}
