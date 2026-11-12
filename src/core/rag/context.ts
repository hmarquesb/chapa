import "server-only"
import { type AppConfig, chunkConfigKey } from "@/config"
import type { Chunk, ChunkRepository, ContextBlock, RetrievedChunk } from "@/core/types"

// Arquivos únicos, na ordem do score (results já vem ordenado), até maxDocs.
export function selectSources(results: RetrievedChunk[], maxDocs: number): string[] {
  return [...new Set(results.map((chunk) => chunk.source))].slice(0, maxDocs)
}

// Um bloco por arquivo, na ordem de sources, com os trechos unidos por linha em branco.
// Arquivo sem trechos na releitura usa os da busca.
export function assembleDocuments(
  sources: string[],
  stored: Chunk[],
  results: RetrievedChunk[],
): ContextBlock[] {
  return sources.map((source) => {
    const fromStore = stored.filter((chunk) => chunk.source === source)
    const parts = fromStore.length > 0 ? fromStore : results.filter((c) => c.source === source)
    return { source, section: "", content: parts.map((chunk) => chunk.content).join("\n\n") }
  })
}

export async function buildContext(input: {
  results: RetrievedChunk[]
  config: AppConfig
  chunks: ChunkRepository
}): Promise<ContextBlock[]> {
  const { results, config, chunks } = input
  if (config.rag.contextMode === "chunks" || results.length === 0) {
    return results.map(({ source, section, content }) => ({ source, section, content }))
  }
  const sources = selectSources(results, config.rag.maxContextDocs)
  const stored = await chunks.listBySources(
    { embeddingModel: config.models.embedding, chunkConfig: chunkConfigKey(config.rag) },
    sources,
  )
  return assembleDocuments(sources, stored, results)
}
