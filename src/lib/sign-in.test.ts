import { describe, expect, it } from "vitest"
import { SIGN_IN_ERRORS, signInErrorMessage } from "@/lib/sign-in"

describe("signInErrorMessage", () => {
  it("maps the demo limit from the Server Action and from the direct callback", () => {
    expect(signInErrorMessage({ erro: "limite-demo" })).toBe(SIGN_IN_ERRORS.demoLimit)
    expect(signInErrorMessage({ error: "CredentialsSignin", code: "demo_limit" })).toBe(
      SIGN_IN_ERRORS.demoLimit,
    )
  })

  it("maps a generic failure and any Auth.js error to the failure text", () => {
    expect(signInErrorMessage({ erro: "falha" })).toBe(SIGN_IN_ERRORS.failure)
    expect(signInErrorMessage({ error: "AccessDenied" })).toBe(SIGN_IN_ERRORS.failure)
    expect(signInErrorMessage({ error: "Configuration" })).toBe(SIGN_IN_ERRORS.failure)
  })

  it("returns null without any parameter", () => {
    expect(signInErrorMessage({})).toBeNull()
    expect(signInErrorMessage({ erro: "outra-coisa" })).toBeNull()
  })

  it("has the exact PT-BR texts of the spec", () => {
    expect(SIGN_IN_ERRORS).toEqual({
      demoLimit:
        "Muitas contas de demonstração criadas a partir desta rede hoje. Entre com Google para continuar testando.",
      failure: "Não consegui entrar agora. Tente de novo em instantes.",
    })
  })
})
