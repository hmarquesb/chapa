// Verifica contra o banco `dev` que as consultas de conversa respeitam o dono (ADR 0021).
// ⚠️ Grava no banco do DATABASE_URL (2 contas demo e 1 conversa, apagadas no fim): rode só com
// autorização. Recusa rodar se o host não terminar em neon.tech, para nunca tocar o `prod`.
// npm run authz-check
// Nunca imprime ids nem conteúdo, só o nome de cada caso.
import { randomUUID } from "node:crypto"
import { SessionNotFoundError } from "@/core/errors"
import type { SessionOwner } from "@/core/types"
import { closeSql, createAccountRepository, createSessionRepository, getSql } from "@/infra/db"

const REQUIRED_HOST_SUFFIX = "neon.tech"
const DEMO_TTL_MS = 60 * 60 * 1000

// Só o host do banco, nunca a URL (que tem usuário e senha).
function databaseHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname || "desconhecido"
  } catch {
    return "desconhecido"
  }
}

async function throwsNotFound(run: () => Promise<unknown>): Promise<boolean> {
  try {
    await run()
    return false
  } catch (error) {
    return error instanceof SessionNotFoundError
  }
}

async function main(): Promise<number> {
  const host = databaseHost()
  console.log(`Banco: ${host}`)
  if (!host.endsWith(REQUIRED_HOST_SUFFIX)) {
    console.error(`Recusado: o host precisa terminar em ${REQUIRED_HOST_SUFFIX} (só o banco dev).`)
    return 1
  }

  const sql = getSql()
  const accounts = createAccountRepository(sql)
  const sessions = createSessionRepository(sql)
  const results: Array<{ name: string; ok: boolean }> = []
  const check = (name: string, ok: boolean) => results.push({ name, ok })
  const createdAccounts: string[] = []
  let cleanupFailed = false

  try {
    const expiresAt = new Date(Date.now() + DEMO_TTL_MS)
    const a = await accounts.createDemo({ expiresAt, profile: {} })
    createdAccounts.push(a.id)
    const b = await accounts.createDemo({ expiresAt, profile: {} })
    createdAccounts.push(b.id)
    const ownerA: SessionOwner = { accountId: a.id }
    const ownerB: SessionOwner = { accountId: b.id }
    const noOwner: SessionOwner = { accountId: null }

    const idB = randomUUID()
    await sessions.touch({ id: idB, channel: "web", owner: ownerB })
    await sessions.appendTurn(idB, ownerB, {
      user: "Pergunta de teste",
      assistant: "Resposta de teste",
      status: "answered",
      sources: [],
    })
    const before = await sessions.get(idB, ownerB)

    check("1. get(conversa de B, A) devolve null", (await sessions.get(idB, ownerA)) === null)
    check(
      "2. listMessages(conversa de B, A) devolve []",
      (await sessions.listMessages(idB, ownerA)).length === 0,
    )

    const touchRefused = await throwsNotFound(() =>
      sessions.touch({ id: idB, channel: "web", owner: ownerA }),
    )
    const afterTouch = await sessions.get(idB, ownerB)
    check(
      "3. touch(conversa de B, A) lança SessionNotFoundError e não muda last_activity_at",
      touchRefused &&
        before !== null &&
        afterTouch !== null &&
        afterTouch.lastActivityAt.getTime() === before.lastActivityAt.getTime(),
    )

    const appendRefused = await throwsNotFound(() =>
      sessions.appendTurn(idB, ownerA, {
        user: "Intruso",
        assistant: "Intruso",
        status: "answered",
        sources: [],
      }),
    )
    check(
      "4. appendTurn(conversa de B, A) lança SessionNotFoundError e B segue com 2 mensagens",
      appendRefused && (await sessions.listMessages(idB, ownerB)).length === 2,
    )

    // Cases 5 to 7 also check the owner's own call, so a query that never matches can't pass.
    await sessions.saveSummary(idB, ownerA, "resumo do intruso", 1)
    const afterSummary = await sessions.get(idB, ownerB)
    await sessions.saveSummary(idB, ownerB, "resumo de B", 1)
    const ownSummary = await sessions.get(idB, ownerB)
    check(
      "5. saveSummary(conversa de B, A) não grava resumo (e o de B grava)",
      afterSummary !== null &&
        afterSummary.summary === null &&
        ownSummary?.summary === "resumo de B",
    )

    const listA = await sessions.listForAccount(a.id, 50)
    const listB = await sessions.listForAccount(b.id, 50)
    check(
      "6. listForAccount(A) não traz a conversa de B (e a de B traz)",
      !listA.some((item) => item.id === idB) && listB.some((item) => item.id === idB),
    )

    check(
      "7. deleteForAccount(conversa de B, A) devolve false e a conversa continua",
      (await sessions.deleteForAccount(idB, a.id)) === false &&
        (await sessions.get(idB, ownerB)) !== null,
    )
    check(
      "8. get(conversa de B, sem conta) devolve null",
      (await sessions.get(idB, noOwner)) === null,
    )

    await accounts.delete(b.id)
    check("9. accounts.delete(B) apaga a conversa de B", (await sessions.get(idB, ownerB)) === null)
  } finally {
    for (const id of createdAccounts) {
      try {
        await accounts.delete(id)
      } catch {
        cleanupFailed = true
        console.error("Erro: não consegui apagar uma conta de teste (ela vence em 1 hora).")
      }
    }
  }

  for (const { name, ok } of results) console.log(`${ok ? "✅" : "❌"} ${name}`)
  const failed = results.filter((r) => !r.ok).length
  if (results.length !== 9 || cleanupFailed) return 1
  return failed === 0 ? 0 : 1
}

main()
  .then(async (code) => {
    await closeSql()
    process.exitCode = code
  })
  .catch(async (error: unknown) => {
    console.error(`Erro: ${error instanceof Error ? error.name : typeof error}`)
    await closeSql().catch(() => {})
    process.exitCode = 1
  })
