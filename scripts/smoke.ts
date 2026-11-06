// Teste de fumaça de um ambiente publicado (S09, RF1). Fala só com a API pública do deploy.
// ⚠️ Faz 3 chamadas ao chat (2 delas gastam cota do Gemini) e grava uma sessão fictícia no
// banco daquele ambiente: rode só com autorização.
// npm run smoke -- --url https://<deploy>.vercel.app
// Deploy com Deployment Protection (preview): exporte VERCEL_AUTOMATION_BYPASS_SECRET no shell.
import { randomUUID } from "node:crypto"
import { setTimeout as sleep } from "node:timers/promises"
import { parseArgs } from "./lib/args"
import {
  BYPASS_ENV,
  buildRequestHeaders,
  CHAT_INTERVAL_MS,
  type CheckResult,
  checkBlockedInput,
  checkChatAnswered,
  checkChatFallback,
  checkCronUnauthorized,
  checkHealth,
  checkHistory,
  checkHomePage,
  formatStepLine,
  parseBaseUrl,
  SMOKE_MESSAGES,
  SMOKE_PROFILE,
  type SmokeResponse,
} from "./smoke-checks"

// A rota de chat tem maxDuration = 60 s; damos uma folga para a rede.
const CHAT_TIMEOUT_MS = 75_000
const DEFAULT_TIMEOUT_MS = 20_000

type Step = { title: string; run: () => Promise<CheckResult> }

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  const contentType = response.headers.get("content-type") ?? ""
  if (!contentType.toLowerCase().includes("application/json")) return text
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

// Sem seguir redirects: um deploy protegido redireciona para o login da Vercel, e isso tem
// que aparecer como falha, não como a página de login respondendo 200.
async function request(
  url: string,
  init: RequestInit & { timeoutMs?: number },
): Promise<SmokeResponse> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, ...rest } = init
  const response = await fetch(url, {
    ...rest,
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  })
  return { status: response.status, headers: response.headers, body: await readBody(response) }
}

// Só o nome do erro e o código de rede, nunca URLs com segredo nem corpos.
function networkFailure(error: unknown): CheckResult {
  if (!(error instanceof Error)) return { ok: false, reason: "erro de rede desconhecido" }
  const cause = error.cause
  const code =
    typeof cause === "object" && cause !== null && "code" in cause && typeof cause.code === "string"
      ? ` ${cause.code}`
      : ""
  const timeout = error.name === "TimeoutError" ? " (tempo esgotado)" : ""
  return { ok: false, reason: `erro de rede: ${error.name}${code}${timeout}` }
}

async function main(): Promise<void> {
  const { flags } = parseArgs(process.argv.slice(2))
  const base = parseBaseUrl(flags.url)
  if (!base.ok) {
    console.error(base.error)
    process.exitCode = 1
    return
  }

  const bypassSecret = process.env[BYPASS_ENV]
  const commonHeaders = buildRequestHeaders(bypassSecret)
  const sessionId = randomUUID()
  const at = (path: string) => `${base.url}${path}`

  const chat = (message: string) =>
    request(at("/api/chat"), {
      method: "POST",
      headers: { ...commonHeaders, "content-type": "application/json" },
      body: JSON.stringify({ sessionId, message, profile: SMOKE_PROFILE }),
      timeoutMs: CHAT_TIMEOUT_MS,
    })
  const get = (path: string) => request(at(path), { method: "GET", headers: commonHeaders })

  const steps: Step[] = [
    {
      title: "GET /api/health",
      run: async () => checkHealth(await get("/api/health")),
    },
    {
      title: "POST /api/chat no escopo → answered com fontes",
      run: async () => checkChatAnswered(await chat(SMOKE_MESSAGES.inScope)),
    },
    {
      title: "POST /api/chat fora do escopo → fallback",
      run: async () => {
        await sleep(CHAT_INTERVAL_MS)
        return checkChatFallback(await chat(SMOKE_MESSAGES.outOfScope))
      },
    },
    {
      title: "POST /api/chat com CPF → blocked_input",
      run: async () => {
        await sleep(CHAT_INTERVAL_MS)
        return checkBlockedInput(await chat(SMOKE_MESSAGES.blocked))
      },
    },
    {
      title: "GET /api/sessions/{id}/messages → 4 mensagens",
      run: async () => checkHistory(await get(`/api/sessions/${sessionId}/messages`), sessionId),
    },
    {
      title: "GET /api/cron/cleanup sem Authorization → 401",
      run: async () => checkCronUnauthorized(await get("/api/cron/cleanup")),
    },
    {
      title: "GET / com Referrer-Policy e X-Content-Type-Options",
      run: async () => checkHomePage(await get("/")),
    },
  ]

  console.log(`Fumaça em ${base.url}`)
  if (bypassSecret) console.log(`(usando ${BYPASS_ENV} para a Deployment Protection)`)
  else console.log(`(sem ${BYPASS_ENV}: um preview protegido vai responder 302 ou 401)`)

  let failures = 0
  for (const [index, step] of steps.entries()) {
    let result: CheckResult
    try {
      result = await step.run()
    } catch (error) {
      result = networkFailure(error)
    }
    if (!result.ok) failures++
    console.log(formatStepLine(index + 1, step.title, result))
  }

  console.log(
    failures === 0
      ? `Todos os ${steps.length} passos passaram.`
      : `${failures} de ${steps.length} passos falharam.`,
  )
  if (failures > 0) process.exitCode = 1
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? `${error.name}: ${error.message}` : "Erro desconhecido")
  process.exitCode = 1
})
