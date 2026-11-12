import "server-only"
import { normalize } from "@/core/text"

export type GreetingKind = "bom_dia" | "boa_tarde" | "boa_noite" | "neutro"
export type GreetingMatch = { kind: GreetingKind; asksHowAreYou: boolean }

// Vocabulário de linguagem (não é parâmetro de RAG, por isso fica aqui e não em src/config.ts).
// Tudo já normalizado: minúsculas, sem acento e sem pontuação.
const GREETINGS: ReadonlyArray<{ term: string; kind: GreetingKind }> = [
  { term: "bom dia", kind: "bom_dia" },
  { term: "boa tarde", kind: "boa_tarde" },
  { term: "boa noite", kind: "boa_noite" },
  { term: "oi", kind: "neutro" },
  { term: "ola", kind: "neutro" },
  { term: "opa", kind: "neutro" },
  { term: "e ai", kind: "neutro" },
  { term: "eai", kind: "neutro" },
]

const COMPLEMENTS: ReadonlyArray<{ term: string; asksHowAreYou: boolean }> = [
  { term: "tudo bem", asksHowAreYou: true },
  { term: "tudo bom", asksHowAreYou: true },
  { term: "tudo certo", asksHowAreYou: true },
  { term: "como vai", asksHowAreYou: true },
  { term: "chapa", asksHowAreYou: false },
  { term: "pessoal", asksHowAreYou: false },
]

// normalize e depois troca tudo o que não é letra, dígito ou espaço por espaço (some a
// pontuação e os emojis) e colapsa os espaços.
export function normalizeGreeting(message: string): string {
  return normalize(message)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

// "oiii" vira "oi": só as letras repetidas no fim da palavra são reduzidas a uma.
function collapseTrailing(word: string): string {
  return word.replace(/(\p{L})\1+$/u, "$1")
}

// Tenta casar o termo (uma ou duas palavras) a partir de `at`. Devolve quantas palavras consumiu.
function termLength(words: string[], at: number, term: string): number | null {
  const parts = term.split(" ")
  for (let i = 0; i < parts.length; i++) {
    const word = words[at + i]
    if (word === undefined || collapseTrailing(word) !== parts[i]) return null
  }
  return parts.length
}

// Só a mensagem inteira: um cumprimento no começo e, depois, complementos (cada um, no máximo,
// uma vez). Sobrou qualquer palavra, é uma dúvida ou outra coisa e segue para o fluxo normal.
export function matchGreeting(message: string): GreetingMatch | null {
  const words = normalizeGreeting(message)
    .split(" ")
    .filter((word) => word !== "")
  if (words.length === 0) return null

  let kind: GreetingKind | null = null
  let position = 0
  for (const greeting of GREETINGS) {
    const length = termLength(words, 0, greeting.term)
    if (length !== null) {
      kind = greeting.kind
      position = length
      break
    }
  }
  if (kind === null) return null

  let asksHowAreYou = false
  const used = new Set<string>()
  while (position < words.length) {
    const found = COMPLEMENTS.find(
      (complement) =>
        !used.has(complement.term) && termLength(words, position, complement.term) !== null,
    )
    if (found === undefined) return null
    used.add(found.term)
    position += found.term.split(" ").length
    if (found.asksHowAreYou) asksHowAreYou = true
  }
  return { kind, asksHowAreYou }
}
