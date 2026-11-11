// Normalização do texto do perfil antes de comparar com as listas (decisão 1 da change
// add-profile-term-filter). Só a comparação usa o resultado: o valor salvo nunca muda.

const LEET: Readonly<Record<string, string>> = {
  "4": "a",
  "@": "a",
  "3": "e",
  "1": "i",
  "!": "i",
  "0": "o",
  "5": "s",
  $: "s",
  "7": "t",
}

const MIN_SPLIT_RUN = 3
const SINGLE_LETTER = /^[a-z]$/

// Minúsculas, sem diacríticos, leetspeak trocado, corte em tudo que não é letra nem dígito,
// letras soltas (3 ou mais seguidas) juntas num token só e letras repetidas reduzidas a uma.
export function normalizeForModeration(text: string): string[] {
  const plain = text.toLowerCase().normalize("NFD").replace(/\p{M}/gu, "")
  const mapped = Array.from(plain, (char) => LEET[char] ?? char).join("")
  const raw = mapped.split(/[^\p{L}\p{N}]+/u).filter((token) => token !== "")

  const tokens: string[] = []
  let run: string[] = []
  const flush = () => {
    if (run.length >= MIN_SPLIT_RUN) tokens.push(run.join(""))
    else tokens.push(...run)
    run = []
  }
  for (const token of raw) {
    if (SINGLE_LETTER.test(token)) {
      run.push(token)
    } else {
      flush()
      tokens.push(token)
    }
  }
  flush()

  return tokens.map((token) => token.replace(/(\p{L})\1+/gu, "$1"))
}
