import "server-only"
import type { InputBlockReason } from "@/core/guardrails"

// Único lugar com o texto de fallback (AGENTS.md, regra 5 de IA e RAG).
export const FALLBACK_MESSAGE =
  "Não encontrei essa informação na base do parceiro. Fale com o suporte pelo Painel Rango."

export const BLOCKED_INPUT_MESSAGES: Record<InputBlockReason, string> = {
  empty: "Escreva sua dúvida para eu poder ajudar.",
  too_long: "Sua mensagem ficou muito longa. Resuma em até 1.000 caracteres.",
  sensitive_data:
    "Por segurança, não envie CPF, número de cartão ou senha por aqui. Reescreva a pergunta sem esses dados.",
  credential_request:
    "Não tenho acesso a senhas e nunca peço senha. Para recuperar o acesso, use a opção de recuperação de senha do Painel Rango.",
}

export const BLOCKED_OUTPUT_MESSAGE =
  "Não consegui montar uma resposta segura para essa pergunta. Tente reformular ou fale com o suporte pelo Painel Rango."

// Já normalizados (minúsculas e sem acentos): a comparação é feita sobre normalize(answer).
export const OUTPUT_BLOCK_SIGNALS: string[] = [
  "eu acho que voce deveria",
  "o meu conselho para voce e",
  "como modelo de linguagem",
  "informe sua senha",
  "me envie sua senha",
  "digite sua senha aqui",
]
