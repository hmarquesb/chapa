import { handlers } from "@/infra/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export const { GET, POST } = handlers
