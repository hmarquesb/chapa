import "server-only"

// 429 do provedor que persistiu depois dos retries (cota ou limite por minuto).
export class LlmQuotaError extends Error {
  override name = "LlmQuotaError"
}
// 5xx, timeout ou falha de rede que persistiu depois dos retries.
export class LlmUnavailableError extends Error {
  override name = "LlmUnavailableError"
}
// Qualquer outro erro do provedor (4xx), por exemplo chave inválida.
export class LlmRequestError extends Error {
  override name = "LlmRequestError"
}
// Variável de ambiente obrigatória ausente.
export class MissingEnvError extends Error {
  override name = "MissingEnvError"
}
// Conversa inexistente ou de outro dono. A API responde 404 com o texto de conversa inexistente.
export class SessionNotFoundError extends Error {
  override name = "SessionNotFoundError"
}
