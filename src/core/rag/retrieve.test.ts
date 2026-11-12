import { describe, expect, it } from "vitest"
import { config, RAG_PRESETS, withRag } from "@/config"
import { retrieve } from "@/core/rag/retrieve"
import type { ChunkCandidate, ChunkRepository, EmbedInput, LlmClient } from "@/core/types"

type SearchInput = Parameters<ChunkRepository["search"]>[0]

function candidate(id: number, semantic: number, keyword: number): ChunkCandidate {
  return { id, source: `0${id}-x.md`, section: "S", content: `trecho ${id}`, semantic, keyword }
}

const CANDIDATES = [
  candidate(1, 0.4, 0), // 0.28
  candidate(2, 0.9, 1), // 0.93
  candidate(3, 0.8, 0.2), // 0.62
]

function setup() {
  const embedCalls: EmbedInput[] = []
  const searchCalls: SearchInput[] = []
  const llm: LlmClient = {
    async generate() {
      throw new Error("generate não deveria ser chamado")
    },
    async embed(input) {
      embedCalls.push(input)
      return { vectors: [[0.1, 0.2, 0.3]], usage: { calls: 1, inputTokens: 7, outputTokens: 0 } }
    },
  }
  const chunks: ChunkRepository = {
    async replaceAll() {
      throw new Error("replaceAll não deveria ser chamado")
    },
    async search(input) {
      searchCalls.push(input)
      return CANDIDATES
    },
    async count() {
      return 0
    },
    async listBySources() {
      return []
    },
  }
  return { llm, chunks, embedCalls, searchCalls }
}

describe("retrieve", () => {
  it("embeds the query, searches the preset set and returns ranked results", async () => {
    const { llm, chunks, embedCalls, searchCalls } = setup()
    const { results, usage } = await retrieve({
      query: "Quando cai o repasse?",
      config,
      llm,
      chunks,
    })

    expect(embedCalls).toEqual([
      {
        model: config.models.embedding,
        texts: ["Quando cai o repasse?"],
        task: "query",
        dimensions: config.models.embeddingDimensions,
      },
    ])
    expect(searchCalls).toEqual([
      {
        key: { embeddingModel: config.models.embedding, chunkConfig: "markdown:1200:150" },
        embedding: [0.1, 0.2, 0.3],
        query: "Quando cai o repasse?",
        limit: config.rag.candidateLimit,
      },
    ])
    // minScore 0.5 do padrao: o candidato 1 cai fora.
    expect(results.map((chunk) => chunk.id)).toEqual([2, 3])
    expect(results[0]?.score).toBeCloseTo(0.93)
    expect(usage).toEqual({ calls: 1, inputTokens: 7, outputTokens: 0 })
  })

  it("uses the chunk config, limit and ranking options of the given preset", async () => {
    const { llm, chunks, searchCalls } = setup()
    const custom = withRag(config, { ...RAG_PRESETS.baseline, candidateLimit: 12, topK: 1 })
    const { results } = await retrieve({ query: "q", config: custom, llm, chunks })
    expect(searchCalls[0]?.key.chunkConfig).toBe("fixed:500:100")
    expect(searchCalls[0]?.limit).toBe(12)
    // baseline: minScore 0.7 e topK 1
    expect(results.map((chunk) => chunk.id)).toEqual([2])
  })

  it("throws when the embedding comes back empty", async () => {
    const { chunks } = setup()
    const llm: LlmClient = {
      async generate() {
        throw new Error("não usado")
      },
      async embed() {
        return { vectors: [], usage: { calls: 1, inputTokens: 0, outputTokens: 0 } }
      },
    }
    await expect(retrieve({ query: "q", config, llm, chunks })).rejects.toThrow()
  })
})
