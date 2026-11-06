// Ingestão da base de conhecimento (S04, RF7).
// ⚠️ Chama a API de embeddings e grava no banco do DATABASE_URL: rode só com autorização.
// npm run ingest                      # preset padrao
// npm run ingest -- --preset baseline
import { readdir, readFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import { config, RAG_PRESETS, withRag } from "@/config"
import { ingestDocuments, type SourceDocument } from "@/core/rag/ingest"
import { closeSql, createChunkRepository, getSql } from "@/infra/db"
import { getLlmClient } from "@/infra/llm"
import { parseArgs } from "./lib/args"

const KNOWLEDGE_DIR = resolve(process.cwd(), "knowledge-base")

type PresetName = keyof typeof RAG_PRESETS

function isPreset(value: string | true | undefined): value is PresetName {
  return typeof value === "string" && Object.hasOwn(RAG_PRESETS, value)
}

// Só o host do banco, nunca a URL (que tem usuário e senha).
function databaseHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname || "desconhecido"
  } catch {
    return "desconhecido"
  }
}

async function readKnowledgeBase(): Promise<SourceDocument[]> {
  const entries = await readdir(KNOWLEDGE_DIR, { withFileTypes: true })
  const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
  return Promise.all(
    files.map(async (entry) => ({
      name: entry.name,
      content: await readFile(join(KNOWLEDGE_DIR, entry.name), "utf8"),
    })),
  )
}

async function main(): Promise<void> {
  const { flags } = parseArgs(process.argv.slice(2))
  const preset = flags.preset ?? "padrao"
  if (!isPreset(preset)) {
    const received = preset === true ? "(sem valor)" : preset
    console.error(
      `Preset desconhecido: ${received}. Use --preset ${Object.keys(RAG_PRESETS).join(" ou --preset ")}.`,
    )
    process.exitCode = 1
    return
  }

  const appConfig = withRag(config, RAG_PRESETS[preset])
  const chunks = createChunkRepository(getSql())
  const result = await ingestDocuments({
    documents: await readKnowledgeBase(),
    config: appConfig,
    llm: getLlmClient(),
    chunks,
  })

  for (const file of result.perFile) {
    console.log(`${file.name}: ${file.chunks} ${file.chunks === 1 ? "trecho" : "trechos"}`)
  }
  console.log(`Total gravado: ${result.total} trechos`)
  console.log(`Preset: ${preset}`)
  console.log(`Modelo de embedding: ${result.key.embeddingModel}`)
  console.log(`chunkConfig: ${result.key.chunkConfig}`)
  console.log(`Banco: ${databaseHost()}`)
  console.log(`Trechos no banco para este conjunto (count): ${await chunks.count(result.key)}`)
  console.log(`Chamadas de embedding (usage.calls): ${result.usage.calls}`)
}

main()
  .catch((error: unknown) => {
    // Só o nome e a mensagem do erro, nunca variáveis de ambiente.
    console.error(error instanceof Error ? `${error.name}: ${error.message}` : "Erro desconhecido")
    process.exitCode = 1
  })
  .finally(() => closeSql())
