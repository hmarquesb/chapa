import "server-only"
import type { Sql } from "postgres"
import type { Chunk, ChunkRepository } from "@/core/types"
import { type ChunkRow, toChunkCandidate, toVectorLiteral } from "@/infra/db/mappers"

const INSERT_BATCH_SIZE = 100

export function createChunkRepository(sql: Sql): ChunkRepository {
  return {
    async replaceAll(key, chunks) {
      return sql.begin(async (tx) => {
        await tx`
          delete from public.document_chunks
          where embedding_model = ${key.embeddingModel}
            and chunk_config = ${key.chunkConfig}
        `
        let inserted = 0
        for (let start = 0; start < chunks.length; start += INSERT_BATCH_SIZE) {
          const batch = chunks.slice(start, start + INSERT_BATCH_SIZE)
          const result = await tx`
            insert into public.document_chunks
              (source, section, content, embedding_model, chunk_config, embedding)
            select t.source, t.section, t.content, ${key.embeddingModel}, ${key.chunkConfig},
                   t.embedding::extensions.vector
            from unnest(
              ${batch.map((chunk) => chunk.source)}::text[],
              ${batch.map((chunk) => chunk.section)}::text[],
              ${batch.map((chunk) => chunk.content)}::text[],
              ${batch.map((chunk) => toVectorLiteral(chunk.embedding))}::text[]
            ) as t (source, section, content, embedding)
          `
          inserted += result.count
        }
        return inserted
      })
    },

    async search({ key, embedding, query, limit }) {
      const rows = await sql<ChunkRow[]>`
        select id, source, section, content, semantic, keyword
        from public.match_chunks(
          ${toVectorLiteral(embedding)}::extensions.vector,
          ${query},
          ${key.embeddingModel},
          ${key.chunkConfig},
          ${limit}
        )
      `
      return rows.map(toChunkCandidate)
    },

    async listBySources(key, sources) {
      if (sources.length === 0) return []
      return sql<Chunk[]>`
        select source, section, content
        from public.document_chunks
        where embedding_model = ${key.embeddingModel}
          and chunk_config = ${key.chunkConfig}
          and source = any(${sources}::text[])
        order by id
      `
    },

    async count(key) {
      const [row] = await sql<[{ count: number }]>`
        select count(*)::int as count
        from public.document_chunks
        where embedding_model = ${key.embeddingModel}
          and chunk_config = ${key.chunkConfig}
      `
      return row.count
    },
  }
}
