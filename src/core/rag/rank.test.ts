import { describe, expect, it } from "vitest"
import { hybridScore, rankChunks } from "@/core/rag/rank"
import type { ChunkCandidate } from "@/core/types"

function candidate(id: number, semantic: number, keyword: number): ChunkCandidate {
  return { id, source: `0${id}-x.md`, section: "", content: `trecho ${id}`, semantic, keyword }
}

describe("hybridScore", () => {
  it("weights semantic by alpha and keyword by 1 - alpha", () => {
    expect(hybridScore(0.8, 0.5, 0.7)).toBeCloseTo(0.71)
    expect(hybridScore(0.8, 0.5, 1)).toBeCloseTo(0.8)
    expect(hybridScore(0.8, 0.5, 0)).toBeCloseTo(0.5)
  })
})

describe("rankChunks", () => {
  // Scores com alpha 0.7: 1 → 0.56, 2 → 0.79, 3 → 0.35, 4 → 0.70
  const candidates = [
    candidate(1, 0.8, 0),
    candidate(2, 0.7, 1),
    candidate(3, 0.5, 0),
    candidate(4, 0.85, 0.35),
  ]

  it("keeps the top-K scores above minScore, in descending order", () => {
    const result = rankChunks(candidates, { alpha: 0.7, minScore: 0.5, topK: 2 })
    expect(result.map((chunk) => chunk.id)).toEqual([2, 4])
    expect(result[0]?.score).toBeCloseTo(0.79)
    expect(result[1]?.score).toBeCloseTo(0.7)
    expect(result[0]).toMatchObject({ source: "02-x.md", semantic: 0.7, keyword: 1 })
  })

  it("filters out everything below minScore", () => {
    const result = rankChunks(candidates, { alpha: 0.7, minScore: 0.5, topK: 10 })
    expect(result.map((chunk) => chunk.id)).toEqual([2, 4, 1])
  })

  it("returns [] when nothing reaches minScore", () => {
    expect(rankChunks(candidates, { alpha: 0.7, minScore: 0.99, topK: 2 })).toEqual([])
  })

  it("keeps a candidate whose score equals minScore", () => {
    const result = rankChunks([candidate(1, 0.5, 0.5)], { alpha: 0.7, minScore: 0.5, topK: 1 })
    expect(result).toHaveLength(1)
  })

  it("breaks ties by semantic descending, then by id ascending", () => {
    const tied = [candidate(9, 0.5, 0.5), candidate(3, 0.5, 0.5), candidate(5, 1, 0)]
    // alpha 0.5: todos com score 0.5
    const result = rankChunks(tied, { alpha: 0.5, minScore: 0, topK: 3 })
    expect(result.map((chunk) => chunk.id)).toEqual([5, 3, 9])
  })

  it("does not mutate the input", () => {
    const input = [candidate(1, 0.1, 0.1), candidate(2, 0.9, 0.9)]
    const snapshot = structuredClone(input)
    rankChunks(input, { alpha: 0.7, minScore: 0, topK: 2 })
    expect(input).toEqual(snapshot)
  })

  it("returns [] for no candidates", () => {
    expect(rankChunks([], { alpha: 0.7, minScore: 0, topK: 5 })).toEqual([])
  })
})
