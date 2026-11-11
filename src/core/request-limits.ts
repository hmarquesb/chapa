import "server-only"
import { createHmac } from "node:crypto"

// Used by the chat rate limit (src/app/api/_lib/rate-limit.ts) and by the demo sign-in limit
// (src/infra/auth). Lives in core because infra must not import from src/app.

const MINUTE_MS = 60_000
const DAY_MS = 24 * 60 * MINUTE_MS

function firstValue(raw: string | null): string {
  return raw?.split(",")[0]?.trim() ?? ""
}

// On Vercel both headers are set by the platform. Locally they are usually absent, so every
// request shares the "unknown" bucket.
export function getClientIp(headers: Headers): string {
  const forwarded = firstValue(headers.get("x-forwarded-for"))
  if (forwarded !== "") return forwarded
  const real = firstValue(headers.get("x-real-ip"))
  return real !== "" ? real : "unknown"
}

// The IP is only ever stored as this HMAC, never in clear text.
export function hashIp(ip: string, secret: string): string {
  return createHmac("sha256", secret).update(ip).digest("hex")
}

export function windowStarts(now: Date): { minute: Date; day: Date } {
  const ms = now.getTime()
  return {
    minute: new Date(ms - (ms % MINUTE_MS)),
    day: new Date(ms - (ms % DAY_MS)),
  }
}
