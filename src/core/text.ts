import "server-only"

// Minúsculas, sem acentos (marcas combinantes removidas após NFD) e espaços colapsados.
export function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim()
}

// Compara as duas strings normalizadas. Uma agulha vazia nunca casa.
export function includesNormalized(haystack: string, needle: string): boolean {
  const target = normalize(needle)
  return target !== "" && normalize(haystack).includes(target)
}
