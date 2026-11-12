// CLI de desenvolvimento do assistente (S05, RF8).
// ⚠️ Chama a API do Gemini e grava no banco do DATABASE_URL: rode só com autorização.
// npm run chat -- --perfil perfil.json --nome "Pizzaria Bella" --plano misto
// npm run chat -- --sessao <uuid> --debug
import { randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import { createInterface } from "node:readline/promises"
import { chunkConfigKey } from "@/config"
import {
  LlmQuotaError,
  LlmRequestError,
  LlmUnavailableError,
  SessionNotFoundError,
} from "@/core/errors"
import type { AssistantReply, RetrievedChunk } from "@/core/types"
import { getContainer } from "@/infra/container"
import { closeSql } from "@/infra/db"
import { parsePlanId } from "@/lib/plans"
import { parseProfileInput } from "@/lib/profile/parse"
import { isUuid } from "@/lib/session-id"
import { PROFILE_VERSION, type RestaurantProfile } from "@/lib/types"
import { parseArgs } from "./lib/args"

const EXIT_COMMAND = "sair"

// --cozinha, --cidade e --horario saíram quando o perfil virou estruturado (v2): a cozinha é
// um id da lista e o local é uma UF com o código IBGE da cidade, que só cabem num arquivo.
const REMOVED_FLAGS = ["cozinha", "cidade", "horario"] as const
const REMOVED_FLAGS_MESSAGE =
  "As flags --cozinha, --cidade e --horario saíram. Use --perfil <arquivo.json> com o perfil v2, " +
  'por exemplo { "version": 2, "plan": "misto", "cuisine": { "id": "pizza" }, ' +
  '"location": { "uf": "RJ", "cityCode": 3303302 } }.'
const INVALID_PLAN_MESSAGE = "--plano precisa ser proprio, entrega ou misto (ou o nome do plano)."

// Perfil do CLI: o --perfil (JSON no formato v2) validado pelo parser único, com o --nome e o
// --plano por cima. Sem nenhuma flag, devolve undefined para manter o perfil da sessão. Um
// arquivo ilegível ou inválido, ou um --nome que o filtro recusa, viram erro.
async function profileFromFlags(
  flags: Record<string, string | true>,
): Promise<RestaurantProfile | undefined | { error: string }> {
  if (REMOVED_FLAGS.some((flag) => flags[flag] !== undefined)) {
    return { error: REMOVED_FLAGS_MESSAGE }
  }
  const fileFlag = flags.perfil
  const name = flags.nome
  const plan = flags.plano
  if (fileFlag === true) return { error: "--perfil precisa do caminho de um arquivo JSON." }
  const hasName = typeof name === "string" && name.trim() !== ""
  const hasPlan = typeof plan === "string" && plan.trim() !== ""
  if (fileFlag === undefined && !hasName && !hasPlan) return undefined

  let body: Record<string, unknown> = { version: PROFILE_VERSION }
  if (typeof fileFlag === "string") {
    try {
      const parsed: unknown = JSON.parse(await readFile(fileFlag, "utf8"))
      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        return { error: "O arquivo do --perfil precisa conter um objeto JSON." }
      }
      body = { ...parsed }
    } catch {
      return { error: "Não consegui ler o arquivo do --perfil como JSON." }
    }
  }
  if (hasName) body.name = name
  if (hasPlan) {
    const planId = parsePlanId(plan)
    if (planId === null) return { error: INVALID_PLAN_MESSAGE }
    body.plan = planId
  }
  const result = await parseProfileInput(body, { requirePlan: false })
  return result.ok ? result.value : { error: result.error }
}

const SESSION_NOT_FOUND_MESSAGE = "Esta conversa não existe ou não é do CLI."

function friendlyError(error: unknown): string {
  if (error instanceof SessionNotFoundError) return SESSION_NOT_FOUND_MESSAGE
  if (error instanceof LlmQuotaError) {
    return "A cota do Gemini acabou por enquanto. Espere um pouco e tente de novo."
  }
  if (error instanceof LlmUnavailableError) {
    return "O Gemini está indisponível no momento. Tente de novo em instantes."
  }
  if (error instanceof LlmRequestError) {
    return "O Gemini recusou a requisição. Confira a chave e o nome do modelo."
  }
  // Só o nome e a mensagem do erro, nunca variáveis de ambiente.
  return error instanceof Error
    ? `Erro inesperado (${error.name}): ${error.message}`
    : "Erro inesperado."
}

function formatScore(value: number): string {
  return value.toFixed(2)
}

function formatChunk(chunk: RetrievedChunk): string {
  const scores = [chunk.score, chunk.semantic, chunk.keyword].map(formatScore).join(" | ")
  const location = chunk.section === "" ? chunk.source : `${chunk.source} › ${chunk.section}`
  return `  [${scores}] ${location}`
}

function printReply(reply: AssistantReply, debug: boolean): void {
  if (reply.status === "answered") {
    console.log(`\nChapa: ${reply.answer}`)
    if (reply.sources.length > 0) console.log(`Fontes: ${reply.sources.join(", ")}`)
  } else {
    console.log(`\nChapa: [${reply.status}] ${reply.answer}`)
  }

  if (debug) {
    console.log("\n--- debug ---")
    console.log(`Rota: ${reply.route ?? "(bloqueada)"}`)
    console.log(`Busca: ${reply.searchQuery === "" ? "(nenhuma)" : reply.searchQuery}`)
    console.log(`Trechos recuperados (${reply.retrieved.length}) [score | sem | kw]:`)
    for (const chunk of reply.retrieved) console.log(formatChunk(chunk))
    const { calls, inputTokens, outputTokens } = reply.usage
    console.log(
      `Uso: ${calls} chamadas, ${inputTokens} tokens de entrada, ${outputTokens} de saída` +
        ` | latência ${reply.latencyMs} ms`,
    )
    console.log("-------------")
  }
  console.log("")
}

async function main(): Promise<void> {
  const { flags } = parseArgs(process.argv.slice(2))
  const debug = flags.debug === true
  const sessionFlag = flags.sessao
  if (sessionFlag !== undefined && (typeof sessionFlag !== "string" || !isUuid(sessionFlag))) {
    console.error("O --sessao precisa ser um UUID, por exemplo: --sessao <id mostrado ao sair>.")
    process.exitCode = 1
    return
  }
  const sessionId = typeof sessionFlag === "string" ? sessionFlag : randomUUID()
  const parsedProfile = await profileFromFlags(flags)
  if (parsedProfile !== undefined && "error" in parsedProfile) {
    console.error(parsedProfile.error)
    process.exitCode = 1
    return
  }
  const profile = parsedProfile

  const { config, chunks, sessions, assistant } = getContainer()
  const key = { embeddingModel: config.models.embedding, chunkConfig: chunkConfigKey(config.rag) }
  const total = await chunks.count(key)

  console.log("Chapa (CLI de desenvolvimento)")
  console.log(`Modelo de chat: ${config.models.chat}`)
  console.log(`chunkConfig: ${key.chunkConfig} (${key.embeddingModel})`)
  console.log(`Trechos no banco: ${total}`)
  if (total === 0) {
    console.log("A base está vazia para esta configuração. Rode `npm run ingest` antes do chat.")
    return
  }
  const existing =
    sessionFlag === undefined ? null : await sessions.get(sessionId, { accountId: null })
  // Old web conversations without an account also match the "no account" owner until the
  // daily cleanup removes them; the CLI only resumes its own channel.
  if (existing !== null && existing.channel !== "cli") {
    console.log(SESSION_NOT_FOUND_MESSAGE)
    return
  }
  if (existing === null) {
    console.log("Sessão: nova")
  } else {
    const count = (await sessions.listMessages(sessionId, { accountId: null })).length
    console.log(`Sessão: retomada (${count} mensagens anteriores)`)
  }
  console.log(`Digite sua dúvida. Para encerrar, digite "${EXIT_COMMAND}" ou use Ctrl+D.\n`)

  const rl = createInterface({ input: process.stdin, output: process.stdout })
  rl.on("SIGINT", () => rl.close())
  // Com a entrada de um pipe, o readline fecha antes de as linhas guardadas acabarem.
  let closed = false
  rl.on("close", () => {
    closed = true
  })
  // Com a entrada vinda de um pipe, ecoa a pergunta para a transcrição ficar legível.
  const echo = !process.stdin.isTTY
  rl.setPrompt("Você: ")
  rl.prompt()

  // O iterador assíncrono guarda as linhas que chegam enquanto o assistente responde e
  // termina com Ctrl+D (fim da entrada).
  for await (const line of rl) {
    const message = line.trim()
    if (echo) console.log(line)
    if (message.toLowerCase() === EXIT_COMMAND) break
    if (message !== "") {
      try {
        const reply = await assistant.handleMessage({
          sessionId,
          message: line,
          channel: "cli",
          accountId: null,
          profile,
        })
        printReply(reply, debug)
      } catch (error) {
        if (error instanceof SessionNotFoundError) {
          console.log(`\n${SESSION_NOT_FOUND_MESSAGE}`)
          return
        }
        const detail = debug && error instanceof Error ? ` (${error.name})` : ""
        console.log(`\n${friendlyError(error)}${detail}\n`)
      }
    }
    if (!closed) rl.prompt()
  }
  // O break e o fim da entrada já fecham o readline.

  console.log(`\nPara retomar: npm run chat -- --sessao ${sessionId}`)
}

main()
  .catch((error: unknown) => {
    console.error(friendlyError(error))
    process.exitCode = 1
  })
  .finally(() => closeSql())
