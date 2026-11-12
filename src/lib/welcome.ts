// Fixed text of the welcome card and the rule that decides when it opens by itself.

export const WELCOME_TITLE = "Boas-vindas ao Chapa"

export const WELCOME_PARAGRAPHS = [
  "A Rango é uma empresa de delivery fictícia, criada para este projeto de estudo. Os restaurantes parceiros vendem pelo app dela.",
  "O Chapa é o assistente desses parceiros. Ele tira dúvidas sobre a operação do restaurante com base nas regras da Rango e mostra de onde tirou cada resposta.",
] as const

export const WELCOME_TOPICS_INTRO = "Pergunte, por exemplo, sobre:"

export const WELCOME_TOPICS = [
  "Planos, taxas e repasse",
  "Cancelamentos e contestações",
  "Cardápio, fotos e horários",
  "Avaliações, promoções e cupons",
  "Embalagem e entrega",
  "Suporte, acessos e pagamentos",
] as const

export const WELCOME_OUT_OF_SCOPE =
  "Fora disso, como receitas ou assuntos que não são da Rango, ele avisa que não encontrou a informação. Não escreva dados pessoais nem senhas."

export const WELCOME_CONFIRM = "Entendi"

export function shouldOpenWelcome(input: { isDemo: boolean; welcomeSeenAt: Date | null }): boolean {
  return input.isDemo || input.welcomeSeenAt === null
}
