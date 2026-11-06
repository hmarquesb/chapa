// CLI de desenvolvimento do assistente (S05, RF8).
// ⚠️ Chama a API do Gemini e grava no banco do DATABASE_URL: rode só com autorização.
// npm run chat -- --nome "Pizzaria Bella" --plano "Plano Básico" --cidade "São Paulo"
// npm run chat -- --sessao <uuid> --debug
import { randomUUID } from "node:crypto"
import { createInterface } from "node:readline/promises"
import { chunkConfigKey } from "@/config"
import { LlmQuotaError, LlmRequestError, LlmUnavailableError } from "@/core/errors"
import type { AssistantReply, RetrievedChunk } from "@/core/types"
import { getContainer } from "@/infra/container"
import { closeSql } from "@/infra/db"
import { isUuid } from "@/lib/session-id"
import type { RestaurantProfile } from "@/lib/types"
import { parseArgs } from "./lib/args"

const PROFILE_FLAGS: Record<string, keyof RestaurantProfile> = {
  nome: "name",
  plano: "plan",
  cozinha: "cuisine",
  cidade: "city",
  horario: "hours",
}

const EXIT_COMMAND = "sair"

// Perfil só com as flags informadas. Sem nenhuma, devolve undefined para manter o da sessão.
function profileFromFlags(flags: Record<string, string | true>): RestaurantProfile | undefined {
  const profile: RestaurantProfile = {}
  for (const [flag, field] of Object.entries(PROFILE_FLAGS)) {
    const value = flags[flag]
    if (typeof value === "string" && value.trim() !== "") profile[field] = value.trim()
  }
  return Object.keys(profile).length > 0 ? profile : undefined
}

function friendlyError(error: unknown): string {
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
  const profile = profileFromFlags(flags)

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
  const existing = sessionFlag === undefined ? null : await sessions.get(sessionId)
  if (existing === null) {
    console.log("Sessão: nova")
  } else {
    const count = (await sessions.listMessages(sessionId)).length
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
          profile,
        })
        printReply(reply, debug)
      } catch (error) {
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
