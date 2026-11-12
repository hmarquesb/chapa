import { describe, expect, it } from "vitest"
import { chunkConfigKey, config, withRag } from "@/config"
import { assembleDocuments, buildContext, selectSources } from "@/core/rag/context"
import type { Chunk, ChunkRepository, ChunkSetKey, RetrievedChunk } from "@/core/types"

function result(id: number, source: string, section = "S", score = 0.9): RetrievedChunk {
  return { id, source, section, content: `trecho ${id}`, semantic: 0.5, keyword: 0.5, score }
}

function chunk(source: string, section: string, content: string): Chunk {
  return { source, section, content }
}

describe("selectSources", () => {
  it("keeps the score order and drops repeated files", () => {
    const results = [result(1, "b.md"), result(2, "a.md"), result(3, "b.md"), result(4, "c.md")]
    expect(selectSources(results, 5)).toEqual(["b.md", "a.md", "c.md"])
  })

  it("cuts at maxDocs", () => {
    const results = [result(1, "a.md"), result(2, "b.md"), result(3, "c.md")]
    expect(selectSources(results, 2)).toEqual(["a.md", "b.md"])
  })

  it("returns an empty list for no results", () => {
    expect(selectSources([], 3)).toEqual([])
  })
})

describe("assembleDocuments", () => {
  it("builds one block per file in the order of sources, joining chunks with a blank line", () => {
    const stored = [chunk("a.md", "X", "a1"), chunk("b.md", "Y", "b1"), chunk("a.md", "Z", "a2")]
    expect(assembleDocuments(["b.md", "a.md"], stored, [])).toEqual([
      { source: "b.md", section: "", content: "b1" },
      { source: "a.md", section: "", content: "a1\n\na2" },
    ])
  })

  it("falls back to the retrieved chunks of a file with nothing stored", () => {
    const results = [result(1, "a.md"), result(2, "a.md"), result(3, "b.md")]
    const stored = [chunk("b.md", "S", "b-full")]
    expect(assembleDocuments(["a.md", "b.md"], stored, results)).toEqual([
      { source: "a.md", section: "", content: "trecho 1\n\ntrecho 2" },
      { source: "b.md", section: "", content: "b-full" },
    ])
  })
})

describe("buildContext", () => {
  function setup(stored: Chunk[]) {
    const calls: Array<{ key: ChunkSetKey; sources: string[] }> = []
    const chunks: ChunkRepository = {
      async replaceAll() {
        return 0
      },
      async search() {
        return []
      },
      async count() {
        return 0
      },
      async listBySources(key, sources) {
        calls.push({ key, sources })
        return stored
      },
    }
    return { calls, chunks }
  }

  const results = [result(1, "a.md", "Sa"), result(2, "b.md", "Sb"), result(3, "a.md", "Sc")]

  it("returns the chunks themselves in chunks mode, without querying", async () => {
    const { calls, chunks } = setup([])
    const cfg = withRag(config, { contextMode: "chunks" })
    const context = await buildContext({ results, config: cfg, chunks })
    expect(context).toEqual([
      { source: "a.md", section: "Sa", content: "trecho 1" },
      { source: "b.md", section: "Sb", content: "trecho 2" },
      { source: "a.md", section: "Sc", content: "trecho 3" },
    ])
    expect(calls).toHaveLength(0)
  })

  it("returns [] and does not query on empty results", async () => {
    const { calls, chunks } = setup([])
    const cfg = withRag(config, { contextMode: "documents" })
    expect(await buildContext({ results: [], config: cfg, chunks })).toEqual([])
    expect(calls).toHaveLength(0)
  })

  it("queries once in documents mode with the active key and the chosen files", async () => {
    const { calls, chunks } = setup([chunk("a.md", "Sa", "a-full"), chunk("b.md", "Sb", "b-full")])
    const cfg = withRag(config, { contextMode: "documents", maxContextDocs: 1 })
    const context = await buildContext({ results, config: cfg, chunks })
    expect(calls).toEqual([
      {
        key: { embeddingModel: cfg.models.embedding, chunkConfig: chunkConfigKey(cfg.rag) },
        sources: ["a.md"],
      },
    ])
    expect(context.map((b) => b.source)).toEqual(["a.md"])
  })
})
