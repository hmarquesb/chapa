import { describe, expect, it } from "vitest"
import { config, RAG_PRESETS, withRag } from "@/config"
import { chunkDocument } from "@/core/rag/chunking"
import { ingestDocuments, KNOWLEDGE_FILE_PATTERN, type SourceDocument } from "@/core/rag/ingest"
import type {
  Chunk,
  ChunkRepository,
  ChunkSetKey,
  EmbedInput,
  GenerateInput,
  LlmClient,
} from "@/core/types"

function fakeLlm(): LlmClient & { embedCalls: EmbedInput[] } {
  const embedCalls: EmbedInput[] = []
  return {
    embedCalls,
    async generate(_input: GenerateInput) {
      throw new Error("generate não deveria ser chamado")
    },
    async embed(input) {
      embedCalls.push(input)
      return {
        vectors: input.texts.map((_, i) => [i, 0.5, 1]),
        usage: { calls: 1, inputTokens: 0, outputTokens: 0 },
      }
    },
  }
}

type ReplaceCall = { key: ChunkSetKey; chunks: Array<Chunk & { embedding: number[] }> }

function fakeChunks(): ChunkRepository & { replaceCalls: ReplaceCall[] } {
  const replaceCalls: ReplaceCall[] = []
  return {
    replaceCalls,
    async replaceAll(key, chunks) {
      replaceCalls.push({ key, chunks })
      return chunks.length
    },
    async search() {
      throw new Error("search não deveria ser chamado")
    },
    async count() {
      return 0
    },
  }
}

const docA = "# Documento A\n\n> Fonte: x\n\n## Um\n\nTexto um.\n\n## Dois\n\nTexto dois."
const docB = "# Documento B\n\n> Fonte: y\n\n## Único\n\nTexto único."
const documents: SourceDocument[] = [
  { name: "FONTES.md", content: "# Fontes\n\n## Lista\n\nurl" },
  { name: "02-b.md", content: docB },
  { name: "01-a.md", content: docA },
]

describe("KNOWLEDGE_FILE_PATTERN", () => {
  it("matches only numbered markdown files", () => {
    expect(KNOWLEDGE_FILE_PATTERN.test("02-repasse-financeiro.md")).toBe(true)
    expect(KNOWLEDGE_FILE_PATTERN.test("FONTES.md")).toBe(false)
    expect(KNOWLEDGE_FILE_PATTERN.test("README.md")).toBe(false)
    expect(KNOWLEDGE_FILE_PATTERN.test("02-repasse.txt")).toBe(false)
    expect(KNOWLEDGE_FILE_PATTERN.test("2-repasse.md")).toBe(false)
  })
})

describe("ingestDocuments", () => {
  it("ignores FONTES.md, replaces the preset set once and counts per file", async () => {
    const llm = fakeLlm()
    const chunks = fakeChunks()
    const result = await ingestDocuments({ documents, config, llm, chunks })

    expect(chunks.replaceCalls).toHaveLength(1)
    const expectedKey = {
      embeddingModel: config.models.embedding,
      chunkConfig: "markdown:1200:150",
    }
    expect(chunks.replaceCalls[0]?.key).toEqual(expectedKey)
    expect(result.key).toEqual(expectedKey)

    expect(result.perFile).toEqual([
      { name: "01-a.md", chunks: 2 },
      { name: "02-b.md", chunks: 1 },
    ])
    expect(result.total).toBe(3)
    expect(result.usage).toEqual({ calls: 1, inputTokens: 0, outputTokens: 0 })
  })

  it("embeds every chunk in one document-task call and keeps chunk/vector pairs aligned", async () => {
    const llm = fakeLlm()
    const chunks = fakeChunks()
    await ingestDocuments({ documents, config, llm, chunks })

    const expectedChunks = [
      ...chunkDocument("01-a.md", docA, config.rag),
      ...chunkDocument("02-b.md", docB, config.rag),
    ]
    expect(llm.embedCalls).toEqual([
      {
        model: config.models.embedding,
        texts: expectedChunks.map((chunk) => chunk.content),
        task: "document",
        dimensions: config.models.embeddingDimensions,
      },
    ])
    expect(chunks.replaceCalls[0]?.chunks).toEqual(
      expectedChunks.map((chunk, i) => ({ ...chunk, embedding: [i, 0.5, 1] })),
    )
  })

  it("uses the chunk config of the preset it receives", async () => {
    const llm = fakeLlm()
    const chunks = fakeChunks()
    const baseline = withRag(config, RAG_PRESETS.baseline)
    const result = await ingestDocuments({ documents, config: baseline, llm, chunks })
    expect(result.key.chunkConfig).toBe("fixed:500:100")
    expect(chunks.replaceCalls[0]?.chunks.every((chunk) => chunk.section === "")).toBe(true)
  })

  it("throws when no document matches the pattern", async () => {
    const llm = fakeLlm()
    const chunks = fakeChunks()
    await expect(
      ingestDocuments({
        documents: [{ name: "FONTES.md", content: "x" }],
        config,
        llm,
        chunks,
      }),
    ).rejects.toThrow("Nenhum documento encontrado em knowledge-base/")
    expect(llm.embedCalls).toHaveLength(0)
    expect(chunks.replaceCalls).toHaveLength(0)
  })

  it("throws without replacing anything when the vector count does not match", async () => {
    const chunks = fakeChunks()
    const llm: LlmClient = {
      ...fakeLlm(),
      async embed() {
        return { vectors: [[1]], usage: { calls: 1, inputTokens: 0, outputTokens: 0 } }
      },
    }
    await expect(ingestDocuments({ documents, config, llm, chunks })).rejects.toThrow()
    expect(chunks.replaceCalls).toHaveLength(0)
  })
})
