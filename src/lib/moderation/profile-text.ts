import { ALLOWED_TERMS } from "@/lib/moderation/allowed-terms"
import { BLOCKED_BRANDS, BLOCKED_TERMS } from "@/lib/moderation/blocked-terms"
import { normalizeForModeration } from "@/lib/moderation/normalize"

export type ProfileTextField = "name" | "cuisine"
export type ProfileTextRejection = "caractere" | "termo_inadequado" | "instrucao" | "marca"

export type ProfileTextCheck = { ok: true } | { ok: false; reason: ProfileTextRejection }

const CHARACTERS_MESSAGE = "Use só letras, números, espaço e os sinais & ' - . , ( )"
const TERM_MESSAGES: Record<ProfileTextField, string> = {
  name: "Esse nome tem um termo que não é permitido. Escolha outro.",
  cuisine: "Esse tipo de cozinha tem um termo que não é permitido. Escolha outro.",
}

// Texto fixo da recusa. É o único lugar com esses textos.
export function profileTextMessage(field: ProfileTextField, reason: ProfileTextRejection): string {
  return reason === "caractere" ? CHARACTERS_MESSAGE : TERM_MESSAGES[field]
}

const ALLOWED_CHAR = /^[\p{L}\p{N} &'\-.,()]$/u
// Símbolos de leetspeak: um termo disfarçado com eles ("m3rd@") é recusado pelo termo, não pelo
// caractere. Se nada mais falhar, o símbolo ainda é recusado como caractere.
const LEET_SYMBOLS: ReadonlySet<string> = new Set(["@", "!", "$"])

// Verbo de comando e alvo, em texto claro (não são ofensivos). Passam pela normalização ao carregar.
const COMMAND_VERBS = [
  "ignore",
  "ignora",
  "ignorar",
  "ignorem",
  "esqueca",
  "esquecer",
  "esquecam",
  "desconsidere",
  "desconsidera",
  "desconsiderar",
  "finja",
  "finge",
  "fingir",
  "invente",
  "inventa",
  "inventar",
  "revele",
  "revela",
  "revelar",
]
const COMMAND_TARGETS = [
  "instrucao",
  "instrucoes",
  "prompt",
  "sistema",
  "assistente",
  "regra",
  "regras",
]

function tokenSet(words: readonly string[]): ReadonlySet<string> {
  return new Set(words.flatMap((word) => normalizeForModeration(word)))
}

function sequences(words: readonly string[]): string[][] {
  const unique = new Map<string, string[]>()
  for (const word of words) {
    const tokens = normalizeForModeration(word)
    if (tokens.length > 0) unique.set(tokens.join(" "), tokens)
  }
  return [...unique.values()]
}

const VERBS = tokenSet(COMMAND_VERBS)
const TARGETS = tokenSet(COMMAND_TARGETS)
const ALLOWED = tokenSet(ALLOWED_TERMS)
const TERM_SEQUENCES = sequences(BLOCKED_TERMS)
const BRAND_NAMES: ReadonlySet<string> = new Set(
  sequences(BLOCKED_BRANDS).map((tokens) => tokens.join("")),
)
const LONGEST_BRAND = Math.max(...[...BRAND_NAMES].map((brand) => brand.length))
// Marca para o token que o filtro de termos nunca casa (token de lista de permitidos).
const MASKED = "\u0000"

function containsSequence(tokens: readonly string[], sequence: readonly string[]): boolean {
  for (let start = 0; start + sequence.length <= tokens.length; start++) {
    if (sequence.every((token, offset) => tokens[start + offset] === token)) return true
  }
  return false
}

function hasInstruction(tokens: readonly string[]): boolean {
  return tokens.some((token) => VERBS.has(token)) && tokens.some((token) => TARGETS.has(token))
}

// A marca casa como sequência de palavras ou junta ("uber eats" e "ubereats").
function hasBrand(tokens: readonly string[]): boolean {
  for (let start = 0; start < tokens.length; start++) {
    let joined = ""
    for (let end = start; end < tokens.length; end++) {
      joined += tokens[end]
      if (BRAND_NAMES.has(joined)) return true
      if (joined.length >= LONGEST_BRAND) break
    }
  }
  return false
}

function hasBlockedTerm(tokens: readonly string[]): boolean {
  const compared = tokens.map((token) => (ALLOWED.has(token) ? MASKED : token))
  return TERM_SEQUENCES.some((sequence) => containsSequence(compared, sequence))
}

// Ordem: caractere, instrução, marca (só no nome) e termo inadequado. O texto chega aparado e
// o texto vazio passa (o campo é opcional).
export function checkProfileText(field: ProfileTextField, text: string): ProfileTextCheck {
  const chars = [...text.normalize("NFC")].filter((char) => !ALLOWED_CHAR.test(char))
  if (chars.some((char) => !LEET_SYMBOLS.has(char))) return { ok: false, reason: "caractere" }

  const tokens = normalizeForModeration(text)
  if (hasInstruction(tokens)) return { ok: false, reason: "instrucao" }
  if (field === "name" && hasBrand(tokens)) return { ok: false, reason: "marca" }
  if (hasBlockedTerm(tokens)) return { ok: false, reason: "termo_inadequado" }
  if (chars.length > 0) return { ok: false, reason: "caractere" }
  return { ok: true }
}
