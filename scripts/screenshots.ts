// Takes the screenshots of the screens in both themes and two viewports (change apply-rango-brand-to-screens).
// ⚠️ Signs in as demo ONCE (creates 1 demo account: 5 per IP per day). POST /api/chat and
// GET /api/sessions are answered by fixtures, so the LLM is never called. The session cookie is
// kept in memory only and never printed.
// npm run screenshots -- --url http://localhost:3000 [--out .screenshots] [--only entrada,chat]
// Needs the browser once: npx playwright install chromium
import { mkdir } from "node:fs/promises"
import { join } from "node:path"
import { type Browser, type BrowserContext, chromium, type Page } from "playwright"
import {
  ANSWERED_RESPONSE,
  BLOCKED_RESPONSE,
  FALLBACK_RESPONSE,
  SHOT_BLOCKED_QUESTION,
  SHOT_OFF_TOPIC_QUESTION,
  SHOT_QUESTION,
  sampleConversations,
} from "./screenshots/fixtures"
import { buildShotPlan, parseScreenshotArgs, type Shot, VIEWPORTS } from "./screenshots/shots"

// Screens that need no account: they are shot without the demo session.
const PUBLIC_SHOTS: ReadonlySet<string> = new Set(["entrada", "marca"])

type StorageState = Awaited<ReturnType<BrowserContext["storageState"]>>

async function assertServerUp(url: string): Promise<void> {
  try {
    await fetch(url, { signal: AbortSignal.timeout(10_000) })
  } catch {
    throw new Error(`Servidor fora do ar em ${url}. Suba o app (npm run dev) e tente de novo.`)
  }
}

async function demoSignIn(browser: Browser, baseUrl: string): Promise<StorageState> {
  const context = await browser.newContext()
  try {
    const page = await context.newPage()
    await page.goto(`${baseUrl}/entrar`)
    await page.getByRole("button", { name: "Testar como demo" }).click()
    try {
      await page.waitForURL((url) => !url.pathname.startsWith("/entrar"), { timeout: 20_000 })
    } catch {
      throw new Error("O login demo falhou: a tela de entrada continuou aberta (limite de demos?).")
    }
    return await context.storageState()
  } finally {
    await context.close()
  }
}

async function mockApi(page: Page, responses: { current: unknown }): Promise<void> {
  const sessions = { sessions: sampleConversations(new Date()) }
  await page.route("**/api/sessions", (route) =>
    route.request().method() === "GET" ? route.fulfill({ json: sessions }) : route.continue(),
  )
  await page.route("**/api/chat", (route) => route.fulfill({ json: responses.current }))
}

async function ask(page: Page, question: string): Promise<void> {
  await page.getByLabel("Sua pergunta").fill(question)
  await page.getByRole("button", { name: "Enviar" }).click()
  await page
    .getByRole("log", { name: "Conversa" })
    .getByText(/Chapa: /)
    .last()
    .waitFor()
}

// The demo opens the welcome card on every load of the chat: close it before the shot.
async function openChat(page: Page, baseUrl: string): Promise<void> {
  await page.goto(baseUrl)
  await page.getByRole("button", { name: "Entendi" }).click()
  await page.getByRole("dialog").waitFor({ state: "hidden" })
}

async function capture(page: Page, shot: Shot, baseUrl: string, responses: { current: unknown }) {
  switch (shot.id) {
    case "entrada":
      await page.goto(`${baseUrl}/entrar`)
      break
    case "marca":
      await page.goto(`${baseUrl}/marca`)
      break
    case "perfil":
      await page.goto(`${baseUrl}/perfil`)
      break
    case "demo":
      await openChat(page, baseUrl)
      break
    case "boas-vindas":
      await page.goto(baseUrl)
      await page.getByRole("dialog", { name: "Boas-vindas ao Chapa" }).waitFor()
      break
    case "chat":
      await openChat(page, baseUrl)
      responses.current = ANSWERED_RESPONSE
      await ask(page, SHOT_QUESTION)
      break
    case "menu":
      await openChat(page, baseUrl)
      await page.getByRole("button", { name: /Menu da conta/ }).click()
      await page.getByRole("menu").waitFor()
      break
    case "avisos":
      await openChat(page, baseUrl)
      responses.current = FALLBACK_RESPONSE
      await ask(page, SHOT_OFF_TOPIC_QUESTION)
      responses.current = BLOCKED_RESPONSE
      await ask(page, SHOT_BLOCKED_QUESTION)
      break
  }
}

async function main(): Promise<void> {
  const args = parseScreenshotArgs(process.argv.slice(2))
  const baseUrl = args.url.replace(/\/+$/, "")
  const plan = buildShotPlan(args.only)
  await assertServerUp(baseUrl)
  await mkdir(args.out, { recursive: true })

  const browser = await chromium.launch()
  try {
    const needsSession = plan.some((shot) => !PUBLIC_SHOTS.has(shot.id))
    const session = needsSession ? await demoSignIn(browser, baseUrl) : undefined
    for (const shot of plan) {
      const viewport = VIEWPORTS[shot.viewport]
      const context = await browser.newContext({
        viewport,
        isMobile: shot.viewport === "mobile",
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
        ...(!PUBLIC_SHOTS.has(shot.id) && session !== undefined ? { storageState: session } : {}),
      })
      try {
        await context.addInitScript(
          (theme) => localStorage.setItem("chapa-tema", theme),
          shot.theme,
        )
        const page = await context.newPage()
        const responses = { current: ANSWERED_RESPONSE as unknown }
        await mockApi(page, responses)
        await capture(page, shot, baseUrl, responses)
        // Hides the Next.js dev indicator, which is not part of the app.
        await page.addStyleTag({ content: "nextjs-portal { display: none !important; }" })
        await page.screenshot({ path: join(args.out, shot.file), fullPage: true })
        console.log(`ok  ${shot.file}`)
      } finally {
        await context.close()
      }
    }
  } finally {
    await browser.close()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Erro inesperado.")
  process.exit(1)
})
