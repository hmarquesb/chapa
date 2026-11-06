import { describe, expect, it } from "vitest"
import { containsCardNumber, containsCpf, validateInput, validateOutput } from "@/core/guardrails"
import { BLOCKED_INPUT_MESSAGES, OUTPUT_BLOCK_SIGNALS } from "@/core/messages"

const MAX = 1000

describe("containsCpf", () => {
  it("detects CPF with and without punctuation", () => {
    expect(containsCpf("meu cpf é 123.456.789-09")).toBe(true)
    expect(containsCpf("cpf 12345678909 ok")).toBe(true)
  })

  it("ignores shorter numbers and the bare word", () => {
    expect(containsCpf("Preciso informar o CPF?")).toBe(false)
    expect(containsCpf("Paguei 1234 de comissão")).toBe(false)
  })
})

describe("containsCardNumber", () => {
  it("detects a valid card number with spaces, hyphens or no separator", () => {
    expect(containsCardNumber("4111 1111 1111 1111")).toBe(true)
    expect(containsCardNumber("cartão 4111-1111-1111-1111.")).toBe(true)
    expect(containsCardNumber("4111111111111111")).toBe(true)
    expect(containsCardNumber("amex 3782 822463 10005")).toBe(true) // 15 dígitos
  })

  it("rejects sequences that fail the Luhn check", () => {
    expect(containsCardNumber("4111 1111 1111 1112")).toBe(false)
  })

  it("rejects sequences shorter than 13 or longer than 19 digits", () => {
    expect(containsCardNumber("411111111111")).toBe(false) // 12 dígitos
    expect(containsCardNumber("41111111111111111111")).toBe(false) // 20 dígitos
  })

  it("ignores phone numbers, dates and money", () => {
    expect(containsCardNumber("Ligue 11 98765-4321 até 05/11/2026, valor R$ 1.234,56")).toBe(false)
  })
})

describe("validateInput", () => {
  it.each([
    "Preciso informar o CNPJ para emitir nota?",
    "O repasse cai via Pix?",
    "Como troco a senha do Wi-Fi da loja?",
    "Esqueci a senha do portal, como recupero?",
    "Paguei 1234 de comissão este mês?",
    "Posso pagar com cartão?",
    "Onde vejo meu CPF cadastrado?",
  ])("allows %j", (message) => {
    expect(validateInput(message, MAX)).toEqual({ ok: true })
  })

  it.each([
    ["Meu CPF é 123.456.789-09, pode verificar?", "sensitive_data"],
    ["4111 1111 1111 1111", "sensitive_data"],
    ["minha senha é abc123", "sensitive_data"],
    ["Minha senha e: abc123", "sensitive_data"],
    ["Qual a senha do meu portal?", "credential_request"],
    ["qual é a minha senha?", "credential_request"],
    ["me passa a senha", "credential_request"],
    ["Manda pra mim a senha, por favor", "credential_request"],
    ["   ", "empty"],
    ["", "empty"],
  ] as const)("blocks %j as %s", (message, reason) => {
    expect(validateInput(message, MAX)).toEqual({ ok: false, reason })
  })

  it("blocks a message longer than maxChars", () => {
    expect(validateInput("a".repeat(1001), MAX)).toEqual({ ok: false, reason: "too_long" })
    expect(validateInput("a".repeat(1000), MAX)).toEqual({ ok: true })
  })

  it("has a PT-BR message for every reason", () => {
    expect(Object.keys(BLOCKED_INPUT_MESSAGES).sort()).toEqual(
      ["credential_request", "empty", "sensitive_data", "too_long"].sort(),
    )
  })
})

describe("validateOutput", () => {
  it("blocks an output signal regardless of case and accents", () => {
    expect(validateOutput("EU ACHO QUE VOCÊ DEVERIA mudar de plano")).toEqual({
      ok: false,
      reason: "output_signal",
    })
  })

  it("blocks every listed signal", () => {
    for (const signal of OUTPUT_BLOCK_SIGNALS) {
      expect(validateOutput(`Olá. ${signal} agora.`)).toEqual({
        ok: false,
        reason: "output_signal",
      })
    }
  })

  it("blocks CPF and card numbers in the answer", () => {
    expect(validateOutput("O CPF 123.456.789-09 está ok.")).toEqual({
      ok: false,
      reason: "sensitive_data",
    })
    expect(validateOutput("Use o cartão 4111 1111 1111 1111.")).toEqual({
      ok: false,
      reason: "sensitive_data",
    })
  })

  it("allows a normal answer", () => {
    expect(validateOutput("Você deve fazer a contestação pelo portal em até 7 dias.")).toEqual({
      ok: true,
    })
  })
})
