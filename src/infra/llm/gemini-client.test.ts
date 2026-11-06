import { afterEach, describe, expect, it, vi } from "vitest"
import { config, MODEL_THINKING_LEVEL } from "@/config"
import { LlmQuotaError, LlmRequestError } from "@/core/errors"
import type { ChatMessage } from "@/core/types"
import { createGeminiClient, type GeminiSdk } from "@/infra/llm/gemini-client"

type GenerateResult = Awaited<ReturnType<GeminiSdk["models"]["generateContent"]>>
type EmbedResult = Awaited<ReturnType<GeminiSdk["models"]["embedContent"]>>

// Fake model ids keep RNF3 (no model names outside src/config.ts) and avoid the
// thinking table, unless a test asks for a configured model.
const MODEL = "fake-chat-model"
const EMBED_MODEL = "fake-embedding-model"

function fakeSdk(opts: {
  generate?: (params: unknown) => Promise<GenerateResult>
  embed?: (params: unknown) => Promise<EmbedResult>
}) {
  const generateContent = vi.fn(
    opts.generate ?? (async (): Promise<GenerateResult> => ({ text: "", usageMetadata: {} })),
  )
  const embedContent = vi.fn(opts.embed ?? (async (): Promise<EmbedResult> => ({ embeddings: [] })))
  const sdk: GeminiSdk = { models: { generateContent, embedContent } }
  return { sdk, generateContent, embedContent }
}

// Echoes one vector per text whose first value is the text index, so order can be checked.
function echoEmbed(dimensions: number) {
  return async (params: unknown): Promise<EmbedResult> => {
    const { contents } = params as { contents: string[] }
    return {
      embeddings: contents.map((text) => ({
        values: [Number(text.replace("t", "")), ...new Array<number>(dimensions - 1).fill(0)],
      })),
    }
  }
}

function client(
  sdk: GeminiSdk,
  overrides: Partial<{ retries: number; embedBatchSize: number }> = {},
) {
  return createGeminiClient({
    sdk,
    retries: overrides.retries ?? 3,
    baseDelayMs: 1,
    embedBatchSize: overrides.embedBatchSize ?? 50,
    sleep: async () => {},
  })
}

function httpError(status: number, message = `HTTP ${status}`): Error {
  return Object.assign(new Error(message), { status })
}

describe("generate (RF7)", () => {
  it("maps assistant to model and returns text and usage", async () => {
    const { sdk, generateContent } = fakeSdk({
      generate: async () => ({
        text: "oi",
        usageMetadata: { promptTokenCount: 7, candidatesTokenCount: 2 },
      }),
    })
    const messages: ChatMessage[] = [
      { role: "user", content: "Olá" },
      { role: "assistant", content: "Oi, como posso ajudar?" },
      { role: "user", content: "Qual o prazo do repasse?" },
    ]

    const result = await client(sdk).generate({ model: MODEL, messages })

    expect(result).toEqual({ text: "oi", usage: { calls: 1, inputTokens: 7, outputTokens: 2 } })
    expect(generateContent).toHaveBeenCalledTimes(1)
    const params = generateContent.mock.calls[0]?.[0] as {
      model: string
      contents: Array<{ role: string; parts: Array<{ text: string }> }>
    }
    expect(params.model).toBe(MODEL)
    expect(params.contents).toEqual([
      { role: "user", parts: [{ text: "Olá" }] },
      { role: "model", parts: [{ text: "Oi, como posso ajudar?" }] },
      { role: "user", parts: [{ text: "Qual o prazo do repasse?" }] },
    ])
  })

  it("passes system, temperature, maxOutputTokens and json mode", async () => {
    const { sdk, generateContent } = fakeSdk({})
    await client(sdk).generate({
      model: MODEL,
      system: "Você é um assistente.",
      messages: [{ role: "user", content: "Oi" }],
      temperature: 0.2,
      maxOutputTokens: 300,
      json: true,
    })
    const params = generateContent.mock.calls[0]?.[0] as { config: Record<string, unknown> }
    expect(params.config).toEqual({
      systemInstruction: "Você é um assistente.",
      temperature: 0.2,
      maxOutputTokens: 300,
      responseMimeType: "application/json",
    })
  })

  it("omits optional fields that were not given", async () => {
    const { sdk, generateContent } = fakeSdk({})
    await client(sdk).generate({ model: MODEL, messages: [{ role: "user", content: "Oi" }] })
    const params = generateContent.mock.calls[0]?.[0] as { config: Record<string, unknown> }
    expect(params.config).toEqual({})
  })

  it("sets the minimum thinking level of the configured models", async () => {
    const { sdk, generateContent } = fakeSdk({})
    const gemini = client(sdk)
    const messages: ChatMessage[] = [{ role: "user", content: "Oi" }]
    await gemini.generate({ model: config.models.chat, messages })
    await gemini.generate({ model: config.models.fast, messages })

    const thinking = generateContent.mock.calls.map(
      (call) => (call[0] as { config: { thinkingConfig?: { thinkingLevel?: string } } }).config,
    )
    expect(MODEL_THINKING_LEVEL[config.models.chat]).toBe("low")
    expect(thinking[0]?.thinkingConfig).toEqual({ thinkingLevel: "LOW" })
    expect(thinking[1]?.thinkingConfig).toEqual({ thinkingLevel: "MINIMAL" })
  })

  it("returns an empty string when the SDK brings no text", async () => {
    const { sdk } = fakeSdk({ generate: async () => ({}) })
    const result = await client(sdk).generate({
      model: MODEL,
      messages: [{ role: "user", content: "Oi" }],
    })
    expect(result).toEqual({ text: "", usage: { calls: 1, inputTokens: 0, outputTokens: 0 } })
  })

  it("rejects empty messages without calling the SDK", async () => {
    const { sdk, generateContent } = fakeSdk({})
    await expect(client(sdk).generate({ model: MODEL, messages: [] })).rejects.toThrow(/messages/)
    expect(generateContent).not.toHaveBeenCalled()
  })

  it("rejects a history that does not start with user without calling the SDK", async () => {
    const { sdk, generateContent } = fakeSdk({})
    await expect(
      client(sdk).generate({ model: MODEL, messages: [{ role: "assistant", content: "Oi" }] }),
    ).rejects.toThrow(/user/)
    expect(generateContent).not.toHaveBeenCalled()
  })

  it("retries transient errors through withRetry", async () => {
    let calls = 0
    const { sdk, generateContent } = fakeSdk({
      generate: async () => {
        calls += 1
        if (calls === 1) throw httpError(503)
        return { text: "ok" }
      },
    })
    const result = await client(sdk).generate({
      model: MODEL,
      messages: [{ role: "user", content: "Oi" }],
    })
    expect(result.text).toBe("ok")
    expect(generateContent).toHaveBeenCalledTimes(2)
  })

  it("translates a persistent 429 into LlmQuotaError", async () => {
    const { sdk, generateContent } = fakeSdk({
      generate: async () => {
        throw httpError(429)
      },
    })
    await expect(
      client(sdk, { retries: 2 }).generate({
        model: MODEL,
        messages: [{ role: "user", content: "Oi" }],
      }),
    ).rejects.toBeInstanceOf(LlmQuotaError)
    expect(generateContent).toHaveBeenCalledTimes(2)
  })

  it("returns fresh usage on each call (no shared counter)", async () => {
    const { sdk } = fakeSdk({
      generate: async () => ({ text: "x", usageMetadata: { promptTokenCount: 3 } }),
    })
    const gemini = client(sdk)
    const messages: ChatMessage[] = [{ role: "user", content: "Oi" }]
    const first = await gemini.generate({ model: MODEL, messages })
    const second = await gemini.generate({ model: MODEL, messages })
    expect(first.usage).toEqual({ calls: 1, inputTokens: 3, outputTokens: 0 })
    expect(second.usage).toEqual({ calls: 1, inputTokens: 3, outputTokens: 0 })
  })
})

describe("embed (RF8)", () => {
  it("splits 120 texts into batches of 50, 50 and 20 and keeps the order", async () => {
    const dims = config.models.embeddingDimensions
    const { sdk, embedContent } = fakeSdk({ embed: echoEmbed(dims) })
    const texts = Array.from({ length: 120 }, (_, i) => `t${i}`)

    const result = await client(sdk, { embedBatchSize: 50 }).embed({
      model: EMBED_MODEL,
      texts,
      task: "document",
      dimensions: dims,
    })

    expect(embedContent).toHaveBeenCalledTimes(3)
    const sizes = embedContent.mock.calls.map(
      (call) => (call[0] as { contents: string[] }).contents.length,
    )
    expect(sizes).toEqual([50, 50, 20])
    expect(result.vectors).toHaveLength(120)
    expect(result.vectors.map((v) => v[0])).toEqual(texts.map((_, i) => i))
    expect(result.vectors.every((v) => v.length === dims)).toBe(true)
    expect(result.usage).toEqual({ calls: 3, inputTokens: 0, outputTokens: 0 })
  })

  it.each([
    ["query", "RETRIEVAL_QUERY"],
    ["document", "RETRIEVAL_DOCUMENT"],
  ] as const)("uses taskType %s -> %s and outputDimensionality", async (task, taskType) => {
    const { sdk, embedContent } = fakeSdk({ embed: echoEmbed(8) })
    await client(sdk).embed({ model: EMBED_MODEL, texts: ["t0"], task, dimensions: 8 })
    expect(embedContent.mock.calls[0]?.[0]).toEqual({
      model: EMBED_MODEL,
      contents: ["t0"],
      config: { taskType, outputDimensionality: 8 },
    })
  })

  it("throws citing the dimension when a vector has 767 positions", async () => {
    const { sdk } = fakeSdk({ embed: echoEmbed(767) })
    await expect(
      client(sdk).embed({ model: EMBED_MODEL, texts: ["t0"], task: "query", dimensions: 768 }),
    ).rejects.toThrow(/767.*768|768.*767/)
  })

  it("throws when a vector has no values", async () => {
    const { sdk } = fakeSdk({ embed: async () => ({ embeddings: [{}] }) })
    await expect(
      client(sdk).embed({ model: EMBED_MODEL, texts: ["t0"], task: "query", dimensions: 768 }),
    ).rejects.toThrow(/dimens/)
  })

  it("throws when a batch returns fewer vectors than texts", async () => {
    const { sdk } = fakeSdk({
      embed: async () => ({ embeddings: [{ values: new Array<number>(4).fill(0) }] }),
    })
    await expect(
      client(sdk).embed({ model: EMBED_MODEL, texts: ["t0", "t1"], task: "query", dimensions: 4 }),
    ).rejects.toThrow(/1.*2/)
  })

  it("throws when the SDK returns no embeddings field", async () => {
    const { sdk } = fakeSdk({ embed: async () => ({}) })
    await expect(
      client(sdk).embed({ model: EMBED_MODEL, texts: ["t0"], task: "query", dimensions: 4 }),
    ).rejects.toThrow(Error)
  })

  it("returns no vectors and no calls for an empty input", async () => {
    const { sdk, embedContent } = fakeSdk({})
    const result = await client(sdk).embed({
      model: EMBED_MODEL,
      texts: [],
      task: "query",
      dimensions: 4,
    })
    expect(result).toEqual({ vectors: [], usage: { calls: 0, inputTokens: 0, outputTokens: 0 } })
    expect(embedContent).not.toHaveBeenCalled()
  })

  it("retries each batch through withRetry", async () => {
    let calls = 0
    const echo = echoEmbed(4)
    const { sdk, embedContent } = fakeSdk({
      embed: async (params) => {
        calls += 1
        if (calls === 2) throw httpError(429)
        return echo(params)
      },
    })
    const result = await client(sdk, { embedBatchSize: 1 }).embed({
      model: EMBED_MODEL,
      texts: ["t0", "t1"],
      task: "document",
      dimensions: 4,
    })
    expect(embedContent).toHaveBeenCalledTimes(3)
    expect(result.vectors.map((v) => v[0])).toEqual([0, 1])
    expect(result.usage.calls).toBe(2)
  })
})

describe("privacy (RNF4)", () => {
  const SECRET = "SEGREDO-123"

  it("does not leak messages or system into errors from generate", async () => {
    for (const status of [400, 429, 503]) {
      const { sdk } = fakeSdk({
        generate: async (params) => {
          throw httpError(status, `bad request: ${JSON.stringify(params)}`)
        },
      })
      const error = await client(sdk, { retries: 2 })
        .generate({
          model: MODEL,
          system: `system ${SECRET}`,
          messages: [{ role: "user", content: `user ${SECRET}` }],
        })
        .catch((e: unknown) => e)
      expect(error).toBeInstanceOf(Error)
      expect((error as Error).message).not.toContain(SECRET)
    }
  })

  it("does not leak messages into the validation error", async () => {
    const { sdk } = fakeSdk({})
    const error = await client(sdk)
      .generate({ model: MODEL, messages: [{ role: "assistant", content: SECRET }] })
      .catch((e: unknown) => e)
    expect((error as Error).message).not.toContain(SECRET)
  })

  it("does not leak texts into errors from embed", async () => {
    const { sdk } = fakeSdk({
      embed: async (params) => {
        throw httpError(400, `bad request: ${JSON.stringify(params)}`)
      },
    })
    const error = await client(sdk)
      .embed({ model: EMBED_MODEL, texts: [SECRET], task: "query", dimensions: 4 })
      .catch((e: unknown) => e)
    expect(error).toBeInstanceOf(LlmRequestError)
    expect((error as Error).message).not.toContain(SECRET)
  })

  it("does not leak texts into the dimension error", async () => {
    const { sdk } = fakeSdk({ embed: async () => ({ embeddings: [{ values: [1, 2] }] }) })
    const error = await client(sdk)
      .embed({ model: EMBED_MODEL, texts: [SECRET], task: "query", dimensions: 4 })
      .catch((e: unknown) => e)
    expect((error as Error).message).not.toContain(SECRET)
  })
})

describe("getLlmClient (RF9)", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it("does not throw on import without GEMINI_API_KEY", async () => {
    vi.stubEnv("GEMINI_API_KEY", "")
    vi.resetModules()
    await expect(import("@/infra/llm")).resolves.toHaveProperty("getLlmClient")
  })

  it("throws MissingEnvError when GEMINI_API_KEY is missing", async () => {
    vi.stubEnv("GEMINI_API_KEY", "")
    vi.resetModules()
    const { getLlmClient } = await import("@/infra/llm")
    // resetModules reloads @/core/errors too, so compare against the fresh class.
    const errors = await import("@/core/errors")
    expect(() => getLlmClient()).toThrow(errors.MissingEnvError)
    expect(() => getLlmClient()).toThrow("Defina GEMINI_API_KEY no .env.local")
  })

  it("creates the client once and reuses it (no network call)", async () => {
    vi.stubEnv("GEMINI_API_KEY", "fake-key-for-tests")
    vi.resetModules()
    const { getLlmClient } = await import("@/infra/llm")
    const first = getLlmClient()
    expect(getLlmClient()).toBe(first)
    expect(typeof first.generate).toBe("function")
    expect(typeof first.embed).toBe("function")
  })
})
