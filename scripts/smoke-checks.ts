// Checagens puras do teste de fumaça (S09, RF1). Recebem a resposta já lida e dizem se o
// passo passou. Nunca devolvem o texto da resposta, o sessionId nem segredos: só status,
// contagens e nomes de campo.
import type { ReplyStatus } from "@/lib/types"

export type SmokeResponse = { status: number; headers: Headers; body: unknown }

export type CheckResult = { ok: true; detail?: string } | { ok: false; reason: string }

// Intervalo entre as chamadas de chat (spec S09, RF1).
export const CHAT_INTERVAL_MS = 2000

// Dois turnos salvos (pergunta + resposta cada); o turno bloqueado não é salvo.
export const EXPECTED_HISTORY_LENGTH = 4

// Textos fictícios (RNF4). O CPF é um número de exemplo, não de uma pessoa.
export const SMOKE_MESSAGES = {
  inScope: "Quando o repasse cai na minha conta?",
  outOfScope: "Me passa uma receita de lasanha?",
  blocked: "Meu CPF é 123.456.789-09",
} as const

export const SMOKE_PROFILE = { name: "Restaurante Fictício da Fumaça" } as const

// Header da Protection Bypass for Automation da Vercel, para deploys com Deployment Protection
// (normalmente os previews). O valor vem de VERCEL_AUTOMATION_BYPASS_SECRET, no shell.
export const BYPASS_HEADER = "x-vercel-protection-bypass"
export const BYPASS_ENV = "VERCEL_AUTOMATION_BYPASS_SECRET"

const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"])

export function parseBaseUrl(
  value: string | true | undefined,
): { ok: true; url: string } | { ok: false; error: string } {
  const usage = "Use: npm run smoke -- --url https://<deploy>.vercel.app"
  if (typeof value !== "string" || value.trim() === "") {
    return { ok: false, error: `Informe a URL do deploy. ${usage}` }
  }
  let parsed: URL
  try {
    parsed = new URL(value.trim())
  } catch {
    return { ok: false, error: `URL inválida. ${usage}` }
  }
  const isHttps = parsed.protocol === "https:"
  const isLocalHttp = parsed.protocol === "http:" && LOCAL_HOSTS.has(parsed.hostname)
  if (!isHttps && !isLocalHttp) {
    return { ok: false, error: `A URL precisa usar https (http só para localhost). ${usage}` }
  }
  return { ok: true, url: parsed.origin }
}

export function buildRequestHeaders(bypassSecret: string | undefined): Record<string, string> {
  return bypassSecret !== undefined && bypassSecret !== "" ? { [BYPASS_HEADER]: bypassSecret } : {}
}

export function hintForStatus(status: number): string | undefined {
  switch (status) {
    case 302:
    case 303:
    case 307:
    case 308:
      return (
        `redirecionado, provavelmente para o login da Vercel (deploy protegido); ` +
        `exporte ${BYPASS_ENV} no mesmo terminal antes de rodar o smoke`
      )
    case 401:
      return (
        `o deploy pode estar protegido pela Vercel Authentication (comum em preview); ` +
        `exporte ${BYPASS_ENV} no shell antes de rodar o smoke`
      )
    case 404:
      return "confira a URL: a rota não existe nesse deploy"
    case 429:
      return "limite de uso: rate limit por IP da demo ou cota do Gemini; espere e rode de novo"
    case 500:
      return (
        "costuma ser variável de ambiente faltando na Vercel (GEMINI_API_KEY, DATABASE_URL, " +
        "IP_HASH_SECRET, CRON_SECRET); confira e faça um redeploy"
      )
    case 503:
      return "banco ou Gemini indisponível; confira se o projeto Supabase está pausado"
    default:
      return undefined
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function unexpectedStatus(status: number, expected: number): CheckResult {
  const hint = hintForStatus(status)
  const base = `status ${status} (esperado ${expected})`
  return { ok: false, reason: hint === undefined ? base : `${base}; dica: ${hint}` }
}

export function checkHealth(res: SmokeResponse): CheckResult {
  if (res.status !== 200) return unexpectedStatus(res.status, 200)
  const body = res.body
  if (!isRecord(body) || typeof body.ok !== "boolean" || typeof body.chunks !== "number") {
    return { ok: false, reason: "o corpo não segue o contrato { ok, chunks, embeddingModel }" }
  }
  if (!body.ok) return { ok: false, reason: "ok: false" }
  if (body.chunks <= 0) {
    return {
      ok: false,
      reason:
        "chunks = 0; rode a ingestão (npm run ingest) no banco deste ambiente, com o mesmo " +
        "modelo de embedding e preset",
    }
  }
  const model = typeof body.embeddingModel === "string" ? `, ${body.embeddingModel}` : ""
  return { ok: true, detail: `${body.chunks} trechos${model}` }
}

function checkChatStatus(
  res: SmokeResponse,
  expected: ReplyStatus,
  requireSources: boolean,
): CheckResult {
  if (res.status !== 200) return unexpectedStatus(res.status, 200)
  const body = res.body
  if (
    !isRecord(body) ||
    typeof body.status !== "string" ||
    typeof body.answer !== "string" ||
    !Array.isArray(body.sources)
  ) {
    return { ok: false, reason: "o corpo não segue o contrato { status, answer, sources }" }
  }
  if (body.status !== expected) {
    return { ok: false, reason: `status "${body.status}" (esperado "${expected}")` }
  }
  const count = body.sources.length
  if (requireSources && count === 0) return { ok: false, reason: "sources veio vazio" }
  return { ok: true, detail: `${count} ${count === 1 ? "fonte" : "fontes"}` }
}

export function checkChatAnswered(res: SmokeResponse): CheckResult {
  return checkChatStatus(res, "answered", true)
}

export function checkChatFallback(res: SmokeResponse): CheckResult {
  return checkChatStatus(res, "fallback", false)
}

export function checkBlockedInput(res: SmokeResponse): CheckResult {
  return checkChatStatus(res, "blocked_input", false)
}

const EXPECTED_TURNS: ReadonlyArray<{ role: "user" | "assistant"; status: ReplyStatus | null }> = [
  { role: "user", status: null },
  { role: "assistant", status: "answered" },
  { role: "user", status: null },
  { role: "assistant", status: "fallback" },
]

export function checkHistory(res: SmokeResponse, sessionId: string): CheckResult {
  if (res.status !== 200) return unexpectedStatus(res.status, 200)
  const body = res.body
  if (!isRecord(body) || !Array.isArray(body.messages)) {
    return { ok: false, reason: "o corpo não segue o contrato { sessionId, profile, messages }" }
  }
  if (body.sessionId !== sessionId) {
    return { ok: false, reason: "sessionId diferente do enviado" }
  }
  const messages: unknown[] = body.messages
  if (messages.length !== EXPECTED_HISTORY_LENGTH) {
    return {
      ok: false,
      reason: `${messages.length} mensagens (esperado ${EXPECTED_HISTORY_LENGTH})`,
    }
  }
  const userTexts = [SMOKE_MESSAGES.inScope, SMOKE_MESSAGES.outOfScope]
  for (const [index, message] of messages.entries()) {
    const expected = EXPECTED_TURNS[index]
    if (!isRecord(message) || expected === undefined) {
      return { ok: false, reason: `mensagem ${index + 1} fora do formato` }
    }
    if (typeof message.content === "string" && message.content.includes("123.456.789-09")) {
      return { ok: false, reason: "o turno bloqueado (CPF) foi salvo no histórico" }
    }
    if (message.role !== expected.role || message.status !== expected.status) {
      return {
        ok: false,
        reason:
          `mensagem ${index + 1}: role "${String(message.role)}" e status ` +
          `"${String(message.status)}" (esperado "${expected.role}" e "${String(expected.status)}")`,
      }
    }
    if (expected.role === "user" && message.content !== userTexts[index / 2]) {
      return { ok: false, reason: `mensagem ${index + 1} não é a pergunta enviada` }
    }
  }
  return { ok: true, detail: `${messages.length} mensagens` }
}

export function checkCronUnauthorized(res: SmokeResponse): CheckResult {
  if (res.status !== 401) {
    const reason =
      res.status === 200
        ? "status 200: a limpeza rodou sem Authorization"
        : `status ${res.status} (esperado 401)`
    return { ok: false, reason }
  }
  if (!isRecord(res.body) || typeof res.body.error !== "string") {
    return {
      ok: false,
      reason:
        "o 401 não veio da nossa API (provável Deployment Protection da Vercel); " +
        `exporte ${BYPASS_ENV} no shell antes de rodar o smoke`,
    }
  }
  return { ok: true }
}

const REQUIRED_HEADERS: ReadonlyArray<{ name: string; value: string }> = [
  { name: "Referrer-Policy", value: "no-referrer" },
  { name: "X-Content-Type-Options", value: "nosniff" },
]

export function checkHomePage(res: SmokeResponse): CheckResult {
  if (res.status !== 200) return unexpectedStatus(res.status, 200)
  for (const { name, value } of REQUIRED_HEADERS) {
    const received = res.headers.get(name)
    if (received === null) return { ok: false, reason: `header ${name} ausente` }
    if (received.trim().toLowerCase() !== value) {
      return { ok: false, reason: `header ${name}: "${received}" (esperado "${value}")` }
    }
  }
  return { ok: true }
}

export function formatStepLine(step: number, title: string, result: CheckResult): string {
  if (!result.ok) return `❌ ${step}. ${title}: ${result.reason}`
  return result.detail === undefined
    ? `✅ ${step}. ${title}`
    : `✅ ${step}. ${title} (${result.detail})`
}
