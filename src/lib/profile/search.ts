// Comparação de texto sem acento, sem diferença de maiúsculas e com espaços reduzidos.
export function normalizeSearch(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim()
}

export function matchesSearch(label: string, query: string): boolean {
  return normalizeSearch(label).includes(normalizeSearch(query))
}
