// Textos de validação em PT-BR que a interface mostra ao usuário.
// "Na segunda", "No sábado": a preposição concorda com o nome do dia.
function inDay(day: string): string {
  return `${day === "sábado" || day === "domingo" ? "No" : "Na"} ${day}`
}

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
  hoursFormat: "Preencha o horário pela grade da tela de perfil.",
  hoursSameTime: (day: string) =>
    `${inDay(day)}, o horário de abrir e o de fechar precisam ser diferentes.`,
  hoursOverlap: (day: string) =>
    `${inDay(day)}, o segundo turno precisa começar depois do fim do primeiro.`,
  hoursOvernight: (day: string, nextDay: string) =>
    `O turno de ${day} que passa da meia-noite invade o primeiro turno de ${nextDay}.`,
} as const
