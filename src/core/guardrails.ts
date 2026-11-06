import "server-only"
import { OUTPUT_BLOCK_SIGNALS } from "@/core/messages"
import { normalize } from "@/core/text"

export type InputBlockReason = "empty" | "too_long" | "sensitive_data" | "credential_request"

export type GuardrailResult<R> = { ok: true } | { ok: false; reason: R }

// Só padrões, nunca palavras soltas: "cpf", "pix", "cartão" e "senha" sozinhos passam.
const CPF_PATTERN = /\b\d{3}\.?\d{3}\.?\d{3}-?\d{2}\b/

// Sequências máximas de dígitos com no máximo um espaço ou hífen entre eles.
const DIGIT_RUN_PATTERN = /\d(?:[ -]?\d)*/g

// Regras aplicadas sobre o texto normalizado (minúsculas, sem acentos).
const PASSWORD_DISCLOSURE_PATTERN = /\bminha senha e\b\s*:?\s*\S/
const CREDENTIAL_REQUEST_PATTERNS = [
  /\bqual (e )?(a )?(minha )?senha/,
  /\b(me )?(passa|diz|informa|mostra|envia|manda)( pra mim| para mim)?( a)?( minha)? senha/,
]

export function containsCpf(text: string): boolean {
  return CPF_PATTERN.test(text)
}

function passesLuhn(digits: string): boolean {
  let sum = 0
  let double = false
  for (let index = digits.length - 1; index >= 0; index--) {
    let digit = Number(digits[index])
    if (double) {
      digit *= 2
      if (digit > 9) digit -= 9
    }
    sum += digit
    double = !double
  }
  return sum % 10 === 0
}

// 13 a 19 dígitos, com espaços ou hífens opcionais entre os grupos, que passam no Luhn.
export function containsCardNumber(text: string): boolean {
  for (const match of text.matchAll(DIGIT_RUN_PATTERN)) {
    const digits = match[0].replace(/[ -]/g, "")
    if (digits.length >= 13 && digits.length <= 19 && passesLuhn(digits)) return true
  }
  return false
}

function containsSensitiveData(normalized: string): boolean {
  return containsCpf(normalized) || containsCardNumber(normalized)
}

export function validateInput(
  message: string,
  maxChars: number,
): GuardrailResult<InputBlockReason> {
  const text = normalize(message)
  if (text === "") return { ok: false, reason: "empty" }
  if (text.length > maxChars) return { ok: false, reason: "too_long" }
  if (containsSensitiveData(text) || PASSWORD_DISCLOSURE_PATTERN.test(text)) {
    return { ok: false, reason: "sensitive_data" }
  }
  if (CREDENTIAL_REQUEST_PATTERNS.some((pattern) => pattern.test(text))) {
    return { ok: false, reason: "credential_request" }
  }
  return { ok: true }
}

export function validateOutput(
  answer: string,
): GuardrailResult<"sensitive_data" | "output_signal"> {
  const text = normalize(answer)
  if (containsSensitiveData(text)) return { ok: false, reason: "sensitive_data" }
  if (OUTPUT_BLOCK_SIGNALS.some((signal) => text.includes(signal))) {
    return { ok: false, reason: "output_signal" }
  }
  return { ok: true }
}
