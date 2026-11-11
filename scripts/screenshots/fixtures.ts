// Fixed, fictitious API responses used to take the screenshots without calling the LLM.
import { FALLBACK_MESSAGE } from "@/core/messages"
import type { ChatResponse, ConversationListItem } from "@/lib/types"

export const SHOT_QUESTION = "Quando o repasse cai na minha conta?"
export const SHOT_OFF_TOPIC_QUESTION = "Me passa uma receita de lasanha?"
export const SHOT_BLOCKED_QUESTION = "Minha senha é 123456, pode guardar?"

export const ANSWERED_RESPONSE: ChatResponse = {
  status: "answered",
  answer:
    "O repasse cai na sua conta em até 7 dias após a entrega do pedido, e você acompanha cada valor no extrato. Se a taxa do plano mudar, o novo percentual vale só para os pedidos feitos depois da troca.",
  sources: ["02-repasse-financeiro.md", "01-planos-e-taxas.md"],
  sessionId: "00000000-0000-4000-8000-000000000001",
}

export const FALLBACK_RESPONSE: ChatResponse = {
  status: "fallback",
  answer: FALLBACK_MESSAGE,
  sources: [],
  sessionId: "00000000-0000-4000-8000-000000000001",
}

export const BLOCKED_RESPONSE: ChatResponse = {
  status: "blocked_input",
  answer:
    "Não posso receber senhas nem dados pessoais por aqui. Apague essa mensagem do seu histórico e me conte a dúvida sem esses dados.",
  sources: [],
  sessionId: "00000000-0000-4000-8000-000000000001",
}

export function sampleConversations(now: Date): ConversationListItem[] {
  const ago = (minutes: number) => new Date(now.getTime() - minutes * 60_000).toISOString()
  return [
    { id: "00000000-0000-4000-8000-000000000001", title: SHOT_QUESTION, lastActivityAt: ago(5) },
    {
      id: "00000000-0000-4000-8000-000000000002",
      title: "Como altero o horário de funcionamento?",
      lastActivityAt: ago(60 * 26),
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      title: "Qual a taxa do plano Entrega?",
      lastActivityAt: ago(60 * 24 * 4),
    },
  ]
}
