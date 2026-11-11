// Lista de termos recusados no nome e na cozinha do perfil (change add-profile-term-filter).
//
// Propósito: o filtro de `checkProfileText` recusa palavrões, termos sexuais explícitos, ofensas,
// termos discriminatórios (palavras inteiras) e nomes de empresas reais de delivery (só no nome).
// As categorias ficam em base64, cada uma com os termos sem acento separados por "|".
// A codificação serve só para os termos não aparecerem em buscas no repositório: não é sigilo.
//
// Para ver a lista decodificada:
//   npx tsx -e 'import("./src/lib/moderation/blocked-terms.ts").then((m) => console.log(m.BLOCKED_TERMS, m.BLOCKED_BRANDS))'

const PROFANITY = [
  "bWVyZGF8Ym9zdGF8cG9ycmF8Y2FyYWxob3xmb2Rlcnxmb2RhfGZvZGFzZXxmb2RpZG98ZmRwfHBxcHxjYWNldGV8Y3V8",
  "Y3V6YW98YXJyb21iYWRvfHB1dGFyaWE=",
].join("")

const SEXUAL = [
  "YnVjZXRhfGJ1Y2V0aW5oYXx4b3hvdGF8eGVyZWNhfHBpcm9jYXxwdW5oZXRhfHNpcmlyaWNhfGJvcXVldGV8dGVzYW98",
  "b3JnaWF8ZXN0dXByb3xlc3R1cHJhZG9yfHBpbnRvfHBvcm5vfHBvcm5vZ3JhZmlh",
].join("")

const OFFENSE = [
  "cHV0YXxwdXRvfGlkaW90YXxpbWJlY2lsfGJhYmFjYXxvdGFyaW98dmFnYWJ1bmRvfHZhZ2FidW5kYXxjb3Jub3xyZXRh",
  "cmRhZG98Y3JldGlub3xzYWZhZG98c2FmYWRhfHBhbmFjYXxlc2Nyb3Rv",
].join("")

const DISCRIMINATORY = [
  "dmlhZG98Y3Jpb3Vsb3xtb25nb2xvaWRlfGJvaW9sYXx0cmF2ZWNvfHNhcGF0YW98bmF6aXN0YXxiYWl0b2xh",
].join("")

const BRANDS = [
  "aWZvb2R8cmFwcGl8dWJlciBlYXRzfDk5Zm9vZHxrZWV0YXxhaXFmb21lfGphbWVzIGRlbGl2ZXJ5fGRpZGkgZm9vZHx6",
  "ZSBkZWxpdmVyeXxkZWxpdmVyb298ZG9vcmRhc2h8Z2xvdm8=",
].join("")

function decode(base64: string): readonly string[] {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes).split("|")
}

export const BLOCKED_TERMS: readonly string[] = [
  ...decode(PROFANITY),
  ...decode(SEXUAL),
  ...decode(OFFENSE),
  ...decode(DISCRIMINATORY),
]

export const BLOCKED_BRANDS: readonly string[] = decode(BRANDS)
