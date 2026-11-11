import "server-only"
import type { AppConfig } from "@/config"

const DAY_MS = 24 * 60 * 60 * 1000

// Trims, collapses whitespace and cuts at maxChars; when it cuts, trailing spaces are dropped and
// "…" is appended. Empty text becomes "Conversa sem título".
export function conversationTitle(firstQuestion: string, maxChars: number): string {
  const text = firstQuestion.trim().replace(/\s+/g, " ")
  if (text === "") return "Conversa sem título"
  if (text.length <= maxChars) return text
  return `${text.slice(0, maxChars).trimEnd()}…`
}

// webBefore = now - webTtlDays; otherBefore = now - sessionTtlDays.
export function sessionCleanupCutoffs(
  now: Date,
  cfg: Pick<AppConfig, "sessionTtlDays" | "conversations">,
): { webBefore: Date; otherBefore: Date } {
  return {
    webBefore: new Date(now.getTime() - cfg.conversations.webTtlDays * DAY_MS),
    otherBefore: new Date(now.getTime() - cfg.sessionTtlDays * DAY_MS),
  }
}
