export const SESSION_STORAGE_KEY = "chapa:sessionId"
export const SESSION_QUERY_PARAM = "sessao"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value)
}

// Priority: valid id from the link → valid id from localStorage → brand-new id.
export function resolveInitialSession(input: {
  queryValue: string | null
  storedValue: string | null
  newId: () => string
}): { sessionId: string; source: "link" | "storage" | "new" } {
  if (input.queryValue !== null && isUuid(input.queryValue)) {
    return { sessionId: input.queryValue, source: "link" }
  }
  if (input.storedValue !== null && isUuid(input.storedValue)) {
    return { sessionId: input.storedValue, source: "storage" }
  }
  return { sessionId: input.newId(), source: "new" }
}

export const INVALID_LINK_NOTICE_STORAGE =
  "Este link de conversa não é válido. Mostramos a conversa salva neste navegador."
export const INVALID_LINK_NOTICE_NEW =
  "Este link de conversa não é válido. Começamos uma nova conversa."

// A malformed ?sessao= is ignored (resolveInitialSession), but silently falling back to the stored
// session makes a truncated link look like it worked. Tell the user what happened instead.
export function invalidLinkNotice(
  queryValue: string | null,
  source: "link" | "storage" | "new",
): string | null {
  if (queryValue === null || source === "link") return null
  return source === "storage" ? INVALID_LINK_NOTICE_STORAGE : INVALID_LINK_NOTICE_NEW
}

export function buildContinueLink(origin: string, sessionId: string): string {
  const base = origin.replace(/\/+$/, "")
  return `${base}/?${SESSION_QUERY_PARAM}=${encodeURIComponent(sessionId)}`
}

type CryptoLike = {
  randomUUID?: () => string
  getRandomValues: <T extends ArrayBufferView | null>(array: T) => T
}

// crypto.randomUUID only exists in secure contexts (https or localhost). Opening the dev
// server through a LAN IP is not one, so fall back to a v4 UUID built from getRandomValues.
export function randomSessionId(cryptoImpl: CryptoLike = globalThis.crypto): string {
  if (typeof cryptoImpl.randomUUID === "function") return cryptoImpl.randomUUID()
  const bytes = cryptoImpl.getRandomValues(new Uint8Array(16))
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("")
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
