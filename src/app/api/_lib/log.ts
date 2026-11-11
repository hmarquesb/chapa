import type { ReplyStatus } from "@/lib/types"

// Uma linha por requisição. Nunca recebe o conteúdo das mensagens, o perfil, o sessionId,
// o IP nem o e-mail da conta: só o accountId e metadados de status, latência e consumo
// (AGENTS.md, "Segurança e privacidade").
export type LogEntry = {
  route: string // o modelo da rota, ex.: "/api/sessions/[id]/messages", nunca o caminho real
  method: string
  status: number
  latencyMs: number
  accountId?: string // id da conta da sessão, quando houver; nunca o e-mail
  replyStatus?: ReplyStatus
  llmCalls?: number
  inputTokens?: number
  outputTokens?: number
  error?: string // só o nome da classe do erro
}

export function logRequest(entry: LogEntry): void {
  console.log(JSON.stringify(entry))
}
