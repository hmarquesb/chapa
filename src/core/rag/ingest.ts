import "server-only"
import { type AppConfig, chunkConfigKey } from "@/config"
import { chunkDocument } from "@/core/rag/chunking"
import type { Chunk, ChunkRepository, ChunkSetKey, LlmClient, Usage } from "@/core/types"

export type SourceDocument = { name: string; content: string }

// Só os documentos numerados (01-...md). FONTES.md e README.md ficam de fora.
export const KNOWLEDGE_FILE_PATTERN: RegExp = /^\d{2}-.*\.md$/

export async function ingestDocuments(input: {
  documents: SourceDocument[]
  config: AppConfig
  llm: LlmClient
  chunks: ChunkRepository
}): Promise<{
  perFile: Array<{ name: string; chunks: number }>
  total: number
  key: ChunkSetKey
  usage: Usage
}> {
  const { config, llm } = input
  const documents = input.documents
    .filter((doc) => KNOWLEDGE_FILE_PATTERN.test(doc.name))
    .sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))
  if (documents.length === 0) {
    throw new Error("Nenhum documento encontrado em knowledge-base/")
  }

  const key: ChunkSetKey = {
    embeddingModel: config.models.embedding,
    chunkConfig: chunkConfigKey(config.rag),
  }

  const perFile: Array<{ name: string; chunks: number }> = []
  const allChunks: Chunk[] = []
  for (const doc of documents) {
    const docChunks = chunkDocument(doc.name, doc.content, config.rag)
    perFile.push({ name: doc.name, chunks: docChunks.length })
    allChunks.push(...docChunks)
  }

  // Uma chamada só: o cliente de LLM divide em lotes de embedBatchSize.
  const { vectors, usage } = await llm.embed({
    model: config.models.embedding,
    texts: allChunks.map((chunk) => chunk.content),
    task: "document",
    dimensions: config.models.embeddingDimensions,
  })
  if (vectors.length !== allChunks.length) {
    throw new Error(
      `O embedding devolveu ${vectors.length} vetores para ${allChunks.length} trechos.`,
    )
  }

  const total = await input.chunks.replaceAll(
    key,
    allChunks.map((chunk, i) => ({ ...chunk, embedding: vectors[i] as number[] })),
  )
  return { perFile, total, key, usage }
}
