// Textos de validação em PT-BR que a interface mostra ao usuário.
// Motivos de recusa do corpo do POST /api/chat e do PUT /api/profile.
export const VALIDATION_MESSAGES = {
  notObject: "O pedido precisa ser um objeto JSON.",
  unknownField: "O pedido tem campos desconhecidos.",
  sessionId: "O identificador da conversa é inválido.",
  message: "A mensagem precisa ser um texto.",
  profile: "O perfil do restaurante é inválido.",
  profileInAccount: "O perfil agora fica salvo na conta. Recarregue a página.",
  plan: "Escolha o plano: Próprio, Entrega ou Misto.",
  profileVersion: "O formulário do perfil mudou. Recarregue a página.",
  cuisine: "Escolha o tipo de cozinha da lista ou descreva em até 30 caracteres.",
  cuisineText: "Descreva o tipo de cozinha em até 30 caracteres.",
  location: "Escolha o estado e a cidade da lista.",
} as const
