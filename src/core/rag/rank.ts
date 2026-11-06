import "server-only"
import type { ChunkCandidate, RetrievedChunk } from "@/core/types"

export function hybridScore(semantic: number, keyword: number, alpha: number): number {
  return alpha * semantic + (1 - alpha) * keyword
}

// Combina os scores que o SQL devolve, filtra por minScore e corta em topK. Não altera a entrada.
export function rankChunks(
  candidates: ChunkCandidate[],
  opts: { alpha: number; minScore: number; topK: number },
): RetrievedChunk[] {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: hybridScore(candidate.semantic, candidate.keyword, opts.alpha),
    }))
    .filter((chunk) => chunk.score >= opts.minScore)
    .sort((a, b) => b.score - a.score || b.semantic - a.semantic || a.id - b.id)
    .slice(0, opts.topK)
}
