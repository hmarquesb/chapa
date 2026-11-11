// Textos de erro da API, em PT-BR, que a interface mostra ao usuário.

export const ERROR_MESSAGES = {
  rateLimited: "Muitas mensagens em pouco tempo. Aguarde um pouco e tente de novo.",
  llmQuota: "A demo atingiu o limite de uso do provedor de IA. Tente mais tarde.",
  unavailable: "O assistente está indisponível agora. Tente de novo em instantes.",
  internal: "Algo deu errado do nosso lado. Tente de novo.",
  unsupportedMediaType: "Envie o pedido em JSON (Content-Type: application/json).",
  bodyTooLarge: "O pedido ficou grande demais. Encurte a mensagem ou o perfil e tente de novo.",
  invalidJson: "O pedido não é um JSON válido.",
  sessionNotFound: "Esta conversa não existe mais. Começamos uma nova.",
  invalidSessionId: "O identificador da conversa é inválido.",
  unauthorized: "Acesso não autorizado.",
  accountDailyLimit: "Você chegou ao limite de mensagens de hoje nesta conta. Volte amanhã.",
  demoDailyLimit:
    "A conta de demonstração chegou ao limite de mensagens de hoje. Entre com Google para continuar.",
  unauthenticated: "Sua sessão terminou. Entre de novo para continuar.",
} as const

// Motivos de recusa do corpo do POST /api/chat (validate.ts).
export const VALIDATION_MESSAGES = {
  notObject: "O pedido precisa ser um objeto JSON.",
  unknownField: "O pedido tem campos desconhecidos.",
  sessionId: "O identificador da conversa é inválido.",
  message: "A mensagem precisa ser um texto.",
  profile: "O perfil do restaurante é inválido.",
  profileInAccount: "O perfil agora fica salvo na conta. Recarregue a página.",
  plan: "Escolha o plano: Próprio, Entrega ou Misto.",
} as const
