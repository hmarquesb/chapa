// Fixed PT-BR texts of the sign-in screen, the account menu and the demo banner.

export const PRIVACY_NOTICE =
  "Projeto de estudo. A Rango é uma empresa fictícia. As mensagens são processadas pelo Google Gemini, que pode usar o conteúdo para melhorar os serviços dele. Não escreva dados pessoais, senhas nem informações reais do seu negócio."

export const SIGN_IN_ERRORS = {
  demoLimit:
    "Muitas contas de demonstração criadas a partir desta rede hoje. Entre com Google para continuar testando.",
  failure: "Não consegui entrar agora. Tente de novo em instantes.",
} as const

// erro: set by our Server Actions. error and code: set by Auth.js on its own redirects.
// erro=limite-demo or code=demo_limit → demoLimit; erro=falha or any error → failure; else null.
export function signInErrorMessage(params: {
  erro?: string
  error?: string
  code?: string
}): string | null {
  if (params.erro === "limite-demo" || params.code === "demo_limit") {
    return SIGN_IN_ERRORS.demoLimit
  }
  if (params.erro === "falha" || (params.error !== undefined && params.error !== "")) {
    return SIGN_IN_ERRORS.failure
  }
  return null
}

export const DEMO_BANNER_TEXT = "Conta de demonstração. Ela e as conversas são apagadas em 7 dias."
export const DEMO_ACCOUNT_LABEL = "Conta de demonstração"

export const FICTIONAL_COMPANY_NOTICE =
  "Rango é uma empresa fictícia, criada para um projeto de estudo, sem afiliação com nenhuma empresa de delivery."
