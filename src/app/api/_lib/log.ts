import type { ReplyStatus } from "@/lib/types"

// Uma linha por requisição. Nunca recebe o conteúdo das mensagens, o perfil, o sessionId
// nem o IP: só metadados de status, latência e consumo (AGENTS.md, "Segurança e privacidade").
export type LogEntry = {
  route: string // o modelo da rota, ex.: "/api/sessions/[id]/messages", nunca o caminho real
  method: string
  status: number
  latencyMs: number
  replyStatus?: ReplyStatus
  llmCalls?: number
  inputTokens?: number
  outputTokens?: number
  error?: string // só o nome da classe do erro
}

export function logRequest(entry: LogEntry): void {
  console.log(JSON.stringify(entry))
}
