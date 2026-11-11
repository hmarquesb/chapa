import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  chunkConfigKey,
  config,
  loadConfig,
  MODEL_THINKING_LEVEL,
  RAG_PRESETS,
  type RagConfig,
  withRag,
} from "@/config"

describe("loadConfig defaults (RF1)", () => {
  it("returns the default values when the env is empty", () => {
    const cfg = loadConfig({})
    expect(cfg.models.chat).toBeTypeOf("string")
    expect(cfg.models.chat.length).toBeGreaterThan(0)
    expect(cfg.models.fast).toBeTypeOf("string")
    expect(cfg.models.fast.length).toBeGreaterThan(0)
    // Model ids are asserted only by shape: RNF3 forbids model names outside src/config.ts.
    expect(cfg.models.embedding).toBeTypeOf("string")
    expect(cfg.models.embedding.length).toBeGreaterThan(0)
    expect(cfg.models.embeddingDimensions).toBe(768)
    expect(cfg.memory).toEqual({ recentMessages: 10, summarizeAbove: 16 })
    expect(cfg.limits).toEqual({
      maxInputChars: 1000,
      maxBodyBytes: 4096,
      rateLimitPerMinute: 10,
      rateLimitPerDay: 100,
    })
    expect(cfg.sessionTtlDays).toBe(7)
    expect(cfg.llm).toEqual({
      retries: 3,
      baseDelayMs: 1000,
      timeoutMs: 25000,
      embedBatchSize: 50,
      embedBatchDelayMs: 60000,
    })
    expect(cfg.rag).toEqual(RAG_PRESETS.padrao)
  })

  it("returns the account and session defaults", () => {
    expect(loadConfig({}).accounts).toEqual({
      sessionMaxAgeDays: 30,
      demoTtlDays: 7,
      demoAccountsPerIpPerDay: 5,
      googleInactiveDays: 180,
    })
  })

  it("does not share the rag object with the preset", () => {
    const cfg = loadConfig({})
    expect(cfg.rag).not.toBe(RAG_PRESETS.padrao)
  })

  it("exports config built from process.env with the default rag preset", () => {
    expect(config.rag).toEqual(RAG_PRESETS.padrao)
    expect(config.models.embeddingDimensions).toBe(768)
  })

  it("uses the same model for chat and fast by default (ADR 0014)", () => {
    const cfg = loadConfig({})
    expect(cfg.models.chat).toBe(cfg.models.fast)
  })

  it("declares the minimum thinking level for the default chat and fast models", () => {
    const cfg = loadConfig({})
    expect(MODEL_THINKING_LEVEL[cfg.models.chat]).toBe("minimal")
    expect(MODEL_THINKING_LEVEL[cfg.models.fast]).toBe("minimal")
  })
})

describe("RAG_PRESETS (RF2)", () => {
  it("has the padrao values", () => {
    expect(RAG_PRESETS.padrao).toEqual({
      topK: 5,
      minScore: 0.55,
      alpha: 0.7,
      candidateLimit: 30,
      chunkStrategy: "markdown",
      chunkSize: 1200,
      chunkOverlap: 150,
      rewriteQuery: true,
    })
  })

  it("has the baseline values", () => {
    expect(RAG_PRESETS.baseline).toEqual({
      topK: 5,
      minScore: 0.7,
      alpha: 0.7,
      candidateLimit: 30,
      chunkStrategy: "fixed",
      chunkSize: 500,
      chunkOverlap: 100,
      rewriteQuery: false,
    })
  })

  it("builds the chunk config key", () => {
    expect(chunkConfigKey(RAG_PRESETS.baseline)).toBe("fixed:500:100")
    expect(chunkConfigKey(RAG_PRESETS.padrao)).toBe("markdown:1200:150")
  })
})

describe("env overrides (RF3)", () => {
  it("overrides the models when the variables are set", () => {
    const cfg = loadConfig({ CHAT_MODEL: "x", FAST_MODEL: "y", EMBEDDING_MODEL: "z" })
    expect(cfg.models.chat).toBe("x")
    expect(cfg.models.fast).toBe("y")
    expect(cfg.models.embedding).toBe("z")
  })

  it("ignores empty variables", () => {
    const defaults = loadConfig({})
    const cfg = loadConfig({ CHAT_MODEL: "", FAST_MODEL: "", EMBEDDING_MODEL: "" })
    expect(cfg.models).toEqual(defaults.models)
  })

  it("ignores any other variable", () => {
    const defaults = loadConfig({})
    const cfg = loadConfig({
      TOP_K: "9",
      MIN_SCORE: "0.1",
      EMBEDDING_DIMENSIONS: "3072",
      GEMINI_API_KEY: "fake",
    })
    expect(cfg).toEqual(defaults)
  })
})

describe("withRag (RF4)", () => {
  it("merges overrides without mutating the base", () => {
    const result = withRag(config, { topK: 3 })
    expect(result.rag.topK).toBe(3)
    expect(result.rag.minScore).toBe(config.rag.minScore)
    expect(config.rag.topK).toBe(5)
    expect(result).not.toBe(config)
    expect(result.models).toEqual(config.models)
  })

  it("accepts a full switch to the baseline preset", () => {
    expect(withRag(config, RAG_PRESETS.baseline).rag).toEqual(RAG_PRESETS.baseline)
  })

  it("rejects chunkOverlap greater than or equal to chunkSize", () => {
    expect(() => withRag(config, { chunkOverlap: 600, chunkSize: 500 })).toThrow(/chunkOverlap/)
    expect(() => withRag(config, { chunkOverlap: 500, chunkSize: 500 })).toThrow(/chunkOverlap/)
  })

  it("rejects a negative chunkOverlap", () => {
    expect(() => withRag(config, { chunkOverlap: -1 })).toThrow(/chunkOverlap/)
  })

  it.each([0, -1, 2.5, Number.NaN])("rejects topK = %s", (topK) => {
    expect(() => withRag(config, { topK })).toThrow(/topK/)
  })

  it.each([-0.1, 1.1, Number.NaN])("rejects minScore = %s", (minScore) => {
    expect(() => withRag(config, { minScore })).toThrow(/minScore/)
  })

  it.each([-0.1, 1.1, Number.NaN])("rejects alpha = %s", (alpha) => {
    expect(() => withRag(config, { alpha })).toThrow(/alpha/)
  })

  it("accepts the bounds of minScore and alpha", () => {
    expect(withRag(config, { minScore: 0, alpha: 1 }).rag).toMatchObject({ minScore: 0, alpha: 1 })
    expect(withRag(config, { minScore: 1, alpha: 0 }).rag).toMatchObject({ minScore: 1, alpha: 0 })
  })

  it.each([99, 150.5, Number.NaN])("rejects chunkSize = %s", (chunkSize) => {
    expect(() => withRag(config, { chunkSize, chunkOverlap: 0 })).toThrow(/chunkSize/)
  })

  it("rejects an unknown chunkStrategy", () => {
    const chunkStrategy = "semantic" as unknown as RagConfig["chunkStrategy"]
    expect(() => withRag(config, { chunkStrategy })).toThrow(/chunkStrategy/)
  })

  it("writes the error message in PT-BR", () => {
    expect(() => withRag(config, { topK: 0 })).toThrow(/inválid/)
  })
})

describe("importing config (RF5)", () => {
  const originalEnv = process.env

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  it("does not throw without any variable", async () => {
    // An empty env on purpose: no NODE_ENV, no keys, nothing.
    process.env = {} as NodeJS.ProcessEnv
    vi.resetModules()
    const mod = await import("@/config")
    expect(mod.config.rag).toEqual(RAG_PRESETS.padrao)
  })

  it("does not read secrets nor import server-only", () => {
    const source = readFileSync(fileURLToPath(new URL("./config.ts", import.meta.url)), "utf8")
    expect(source).not.toMatch(/import\s+["']server-only["']/)
    expect(source).not.toMatch(/GEMINI_API_KEY|DATABASE_URL|IP_HASH_SECRET|CRON_SECRET/)
  })
})
