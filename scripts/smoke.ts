// Teste de fumaça de um ambiente publicado (S09, RF1). Fala só com a API pública do deploy.
// ⚠️ Faz 3 chamadas ao chat (2 delas gastam cota do Gemini), grava uma sessão fictícia no
// banco daquele ambiente e cria uma conta demo (gasta 1 das 5 demos do IP no dia): rode só com
// autorização. Nunca imprime o cookie de sessão nem o csrfToken.
// npm run smoke -- --url https://<deploy>.vercel.app
// Deploy com Deployment Protection (preview): exporte VERCEL_AUTOMATION_BYPASS_SECRET no shell.
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
  checkDemoProfile,
  checkDemoSignIn,
  checkHealth,
  checkHistory,
  checkHomePage,
  checkSessionList,
  checkSignInPage,
  checkUnauthenticatedChat,
  formatStepLine,
  mergeCookies,
  parseBaseUrl,
  readChatSessionId,
  SMOKE_MESSAGES,
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
// que aparecer como falha, não como a página de login respondendo 200. O login demo também
// responde com um redirecionamento, que o checkDemoSignIn lê.
// Os cookies de cada resposta entram no pote (jar), enviado nos pedidos seguintes.
async function request(
  url: string,
  init: RequestInit & { timeoutMs?: number; headers?: Record<string, string> },
  jar: { cookie: string },
): Promise<SmokeResponse> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, headers = {}, ...rest } = init
  const response = await fetch(url, {
    ...rest,
    headers: jar.cookie === "" ? headers : { ...headers, cookie: jar.cookie },
    redirect: "manual",
    signal: AbortSignal.timeout(timeoutMs),
  })
  jar.cookie = mergeCookies(jar.cookie, response.headers)
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
  // O servidor gera o id: o primeiro chat vai sem ele e guarda o da resposta.
  let sessionId: string | null = null
  const at = (path: string) => `${base.url}${path}`

  // Sem cookie: os passos 1 a 3 (e o 7) rodam como um visitante anônimo.
  const anonymous = { cookie: "" }
  // Com o cookie da conta demo criada no passo 4.
  const signedIn = { cookie: "" }

  const chat = (message: string, jar = signedIn) =>
    request(
      at("/api/chat"),
      {
        method: "POST",
        headers: { ...commonHeaders, "content-type": "application/json" },
        body: JSON.stringify({
          ...(sessionId === null ? {} : { sessionId }),
          message,
        }),
        timeoutMs: CHAT_TIMEOUT_MS,
      },
      jar,
    )
  const get = (path: string, jar = anonymous) =>
    request(at(path), { method: "GET", headers: commonHeaders }, jar)

  // GET /api/auth/csrf (guarda o cookie e o csrfToken) e POST /api/auth/callback/demo.
  async function signInAsDemo(): Promise<CheckResult> {
    const csrf = await get("/api/auth/csrf", signedIn)
    const body = csrf.body
    const csrfToken =
      typeof body === "object" && body !== null && "csrfToken" in body ? body.csrfToken : null
    if (csrf.status !== 200 || typeof csrfToken !== "string") {
      return { ok: false, reason: `GET /api/auth/csrf respondeu ${csrf.status} sem csrfToken` }
    }
    const res = await request(
      at("/api/auth/callback/demo"),
      {
        method: "POST",
        headers: { ...commonHeaders, "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ csrfToken, callbackUrl: "/" }).toString(),
      },
      signedIn,
    )
    return checkDemoSignIn(res)
  }

  const steps: Step[] = [
    {
      title: "GET /api/health",
      run: async () => checkHealth(await get("/api/health")),
    },
    {
      title: "POST /api/chat sem cookie → 401",
      run: async () => checkUnauthenticatedChat(await chat(SMOKE_MESSAGES.inScope, anonymous)),
    },
    {
      title: "GET /entrar → 200",
      run: async () => checkSignInPage(await get("/entrar")),
    },
    {
      title: "Entrar como demo (POST /api/auth/callback/demo) → cookie de sessão",
      run: signInAsDemo,
    },
    {
      title: "GET /api/profile → plano Misto da demo",
      run: async () => checkDemoProfile(await get("/api/profile", signedIn)),
    },
    {
      title: "POST /api/chat no escopo → answered com fontes",
      run: async () => {
        const res = await chat(SMOKE_MESSAGES.inScope)
        const result = checkChatAnswered(res)
        if (result.ok) {
          sessionId = readChatSessionId(res)
          if (sessionId === null) return { ok: false, reason: "a resposta não trouxe sessionId" }
        }
        return result
      },
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
      run: async () => {
        if (sessionId === null) return { ok: false, reason: "sem sessionId do primeiro chat" }
        return checkHistory(await get(`/api/sessions/${sessionId}/messages`, signedIn), sessionId)
      },
    },
    {
      title: "GET /api/sessions → lista com a conversa",
      run: async () => {
        if (sessionId === null) return { ok: false, reason: "sem sessionId do primeiro chat" }
        return checkSessionList(await get("/api/sessions", signedIn), sessionId)
      },
    },
    {
      title: "GET /api/cron/cleanup sem Authorization → 401",
      run: async () => checkCronUnauthorized(await get("/api/cron/cleanup")),
    },
    {
      title: "GET / com o cookie, Referrer-Policy e X-Content-Type-Options",
      run: async () => checkHomePage(await get("/", signedIn)),
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
