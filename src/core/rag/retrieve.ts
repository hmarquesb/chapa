import "server-only"
import { type AppConfig, chunkConfigKey } from "@/config"
import { rankChunks } from "@/core/rag/rank"
import type { ChunkRepository, LlmClient, RetrievedChunk, Usage } from "@/core/types"

export async function retrieve(input: {
  query: string
  config: AppConfig
  llm: LlmClient
  chunks: ChunkRepository
}): Promise<{ results: RetrievedChunk[]; usage: Usage }> {
  const { query, config, llm } = input
  const { vectors, usage } = await llm.embed({
    model: config.models.embedding,
    texts: [query],
    task: "query",
    dimensions: config.models.embeddingDimensions,
  })
  const embedding = vectors[0]
  if (embedding === undefined) {
    throw new Error("O embedding da pergunta voltou vazio.")
  }

  // Só o conjunto do modelo e do fatiamento atuais: vetores de outros conjuntos não se comparam.
  const candidates = await input.chunks.search({
    key: { embeddingModel: config.models.embedding, chunkConfig: chunkConfigKey(config.rag) },
    embedding,
    query,
    limit: config.rag.candidateLimit,
  })

  const { alpha, minScore, topK } = config.rag
  return { results: rankChunks(candidates, { alpha, minScore, topK }), usage }
}
