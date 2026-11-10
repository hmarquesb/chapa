import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { LlmQuotaError, LlmUnavailableError } from "@/core/errors"
import { validateInput } from "@/core/guardrails"
import { KNOWLEDGE_FILE_PATTERN } from "@/core/rag/ingest"
import type { Assistant, AssistantReply, HandleMessageInput, Usage } from "@/core/types"
import { type EvalQuestion, runQuestions, validateQuestions } from "./questions"

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..")
const KNOWLEDGE_FILES = readdirSync(join(ROOT, "knowledge-base")).filter((name) =>
  KNOWLEDGE_FILE_PATTERN.test(name),
)
const REAL_QUESTIONS: unknown = JSON.parse(
  readFileSync(join(ROOT, "eval", "perguntas.json"), "utf8"),
)

const FILES = ["01-a.md", "02-b.md"]

function q(overrides: Partial<EvalQuestion> & { id: number }): EvalQuestion {
  return {
    tipo: "factual",
    pergunta: "Pergunta?",
    fonte_esperada: ["01-a.md"],
    deve_conter: ["termo"],
    esperado: "resposta",
    nota: "nota",
    ...overrides,
  }
}

// Conjunto mínimo válido com a distribuição exigida (7/3/2/2/4/2).
function validSet(): EvalQuestion[] {
  const items: EvalQuestion[] = []
  let id = 1
  for (let i = 0; i < 7; i++) items.push(q({ id: id++ }))
  for (let i = 0; i < 3; i++) items.push(q({ id: id++, tipo: "parafrase" }))
  for (let i = 0; i < 2; i++) {
    items.push(q({ id: id++, tipo: "multi_turno", pergunta: undefined, turnos: ["a", "b"] }))
  }
  for (let i = 0; i < 2; i++) {
    items.push(q({ id: id++, tipo: "multi_doc", fonte_esperada: ["01-a.md", "02-b.md"] }))
  }
  for (let i = 0; i < 4; i++) {
    items.push({
      id: id++,
      tipo: "fora_de_escopo",
      pergunta: "x?",
      esperado: "fallback",
      nota: "n",
    })
  }
  for (let i = 0; i < 2; i++) {
    items.push({ id: id++, tipo: "bloqueio", pergunta: "y?", esperado: "recusa", nota: "n" })
  }
  return items
}

function errorsOf(data: unknown, files = FILES): string[] {
  const result = validateQuestions(data, files)
  return result.ok ? [] : result.errors
}

describe("validateQuestions with the real eval/perguntas.json", () => {
  it("passes against the files of knowledge-base/", () => {
    expect(KNOWLEDGE_FILES.length).toBe(11)
    const result = validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
    expect(result.ok ? [] : result.errors).toEqual([])
    expect(result.ok && result.questions).toHaveLength(20)
  })

  it("uses a profile in at least 2 in-scope questions", () => {
    const result = validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
    if (!result.ok) throw new Error(result.errors.join("\n"))
    const withProfile = result.questions.filter(
      (item) => item.esperado === "resposta" && item.perfil !== undefined,
    )
    expect(withProfile.length).toBeGreaterThanOrEqual(2)
  })

  // Documents 08 to 11 get their factual questions in the expand-eval-to-50-questions change,
  // which restores the one-per-document check over all 11 files.
  it("has one factual question per knowledge document from 01 to 07", () => {
    const result = validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
    if (!result.ok) throw new Error(result.errors.join("\n"))
    const factualSources = result.questions
      .filter((item) => item.tipo === "factual")
      .flatMap((item) => item.fonte_esperada ?? [])
    const covered = KNOWLEDGE_FILES.filter((name) => /^0[1-7]-/.test(name))
    expect(covered).toHaveLength(7)
    expect([...factualSources].sort()).toEqual([...covered].sort())
  })

  it("matches the input guardrail: blocks only the bloqueio questions", () => {
    const result = validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
    if (!result.ok) throw new Error(result.errors.join("\n"))
    for (const item of result.questions) {
      const messages = item.turnos ?? [item.pergunta ?? ""]
      const blocked = messages.some((message) => !validateInput(message, 1000).ok)
      expect({ id: item.id, blocked }).toEqual({ id: item.id, blocked: item.tipo === "bloqueio" })
    }
  })

  it("has an in-scope question with a loose sensitive word (CPF, CNPJ, Pix, senha, cartão)", () => {
    const result = validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
    if (!result.ok) throw new Error(result.errors.join("\n"))
    const sensitive = /\b(cpf|cnpj|pix|senha|cart[aã]o)\b/i
    const found = result.questions.filter(
      (item) =>
        item.esperado === "resposta" &&
        (item.turnos ?? [item.pergunta ?? ""]).some((text) => sensitive.test(text)),
    )
    expect(found.length).toBeGreaterThanOrEqual(1)
  })
})

describe("validateQuestions", () => {
  it("accepts a valid set", () => {
    const result = validateQuestions(validSet(), FILES)
    expect(result.ok).toBe(true)
  })

  it("rejects data that is not an array", () => {
    expect(errorsOf({ perguntas: [] })).toEqual(["O arquivo precisa ser uma lista de perguntas."])
  })

  it("requires exactly 20 items", () => {
    const errors = errorsOf(validSet().slice(0, 19))
    expect(errors).toContain("São 19 perguntas; precisam ser 20.")
  })

  it("rejects duplicated ids", () => {
    const items = validSet()
    items[1] = { ...(items[1] as EvalQuestion), id: 1 }
    expect(errorsOf(items)).toContain("Pergunta 1: id repetido.")
  })

  it("checks the distribution by type", () => {
    const items = validSet()
    items[0] = { ...(items[0] as EvalQuestion), tipo: "parafrase" }
    const errors = errorsOf(items)
    expect(errors).toContain('Tipo "factual": 6 perguntas; precisam ser 7.')
    expect(errors).toContain('Tipo "parafrase": 4 perguntas; precisam ser 3.')
  })

  it("rejects an unknown type", () => {
    const items: unknown[] = validSet()
    items[0] = { ...(items[0] as EvalQuestion), tipo: "outro" }
    expect(errorsOf(items)).toContain('Pergunta 1: tipo inválido "outro".')
  })

  it("requires pergunta and turnos to be mutually exclusive", () => {
    const items = validSet()
    items[0] = { ...(items[0] as EvalQuestion), turnos: ["a", "b"] }
    items[1] = { ...(items[1] as EvalQuestion), pergunta: undefined }
    const errors = errorsOf(items)
    expect(errors).toContain("Pergunta 1: use pergunta ou turnos, não os dois.")
    expect(errors).toContain("Pergunta 2: falta pergunta ou turnos.")
  })

  it("requires turnos (at least 2) in multi_turno and only there", () => {
    const items = validSet()
    items[10] = { ...(items[10] as EvalQuestion), turnos: ["só um"] }
    items[0] = { ...(items[0] as EvalQuestion), pergunta: undefined, turnos: ["a", "b"] }
    const errors = errorsOf(items)
    expect(errors).toContain("Pergunta 11: multi_turno precisa de turnos com 2 ou mais mensagens.")
    expect(errors).toContain("Pergunta 1: só multi_turno usa turnos.")
  })

  it("requires esperado coherent with the type", () => {
    const items = validSet()
    items[0] = { ...(items[0] as EvalQuestion), esperado: "fallback" }
    items[15] = { ...(items[15] as EvalQuestion), esperado: "recusa" }
    items[19] = { ...(items[19] as EvalQuestion), esperado: "fallback" }
    const errors = errorsOf(items)
    expect(errors).toContain('Pergunta 1: tipo factual precisa de esperado "resposta".')
    expect(errors).toContain('Pergunta 16: tipo fora_de_escopo precisa de esperado "fallback".')
    expect(errors).toContain('Pergunta 20: tipo bloqueio precisa de esperado "recusa".')
  })

  it("requires every fonte_esperada to exist in knowledge-base/", () => {
    const items = validSet()
    items[0] = { ...(items[0] as EvalQuestion), fonte_esperada: ["99-nao-existe.md"] }
    expect(errorsOf(items)).toContain(
      'Pergunta 1: fonte_esperada "99-nao-existe.md" não existe em knowledge-base/.',
    )
  })

  it("requires fonte_esperada and 1 to 3 deve_conter terms in scope", () => {
    const items = validSet()
    items[0] = { ...(items[0] as EvalQuestion), fonte_esperada: [] }
    items[1] = { ...(items[1] as EvalQuestion), deve_conter: ["a", "b", "c", "d"] }
    items[2] = { ...(items[2] as EvalQuestion), deve_conter: [""] }
    const errors = errorsOf(items)
    expect(errors).toContain("Pergunta 1: perguntas no escopo precisam de fonte_esperada.")
    expect(errors).toContain("Pergunta 2: deve_conter precisa ter de 1 a 3 termos não vazios.")
    expect(errors).toContain("Pergunta 3: deve_conter precisa ter de 1 a 3 termos não vazios.")
  })

  it("requires 2 or more distinct sources in multi_doc", () => {
    const items = validSet()
    items[12] = { ...(items[12] as EvalQuestion), fonte_esperada: ["01-a.md"] }
    expect(errorsOf(items)).toContain(
      "Pergunta 13: multi_doc precisa de 2 ou mais arquivos em fonte_esperada.",
    )
  })

  it("requires a nota on every question", () => {
    const items = validSet()
    items[0] = { ...(items[0] as EvalQuestion), nota: " " }
    expect(errorsOf(items)).toContain("Pergunta 1: falta a nota.")
  })

  it("rejects an invalid perfil", () => {
    const items: unknown[] = validSet()
    items[0] = { ...(items[0] as EvalQuestion), perfil: { name: 3, idade: "x" } }
    const errors = errorsOf(items)
    expect(errors).toContain("Pergunta 1: perfil.name precisa ser texto.")
    expect(errors).toContain('Pergunta 1: perfil tem campo desconhecido "idade".')
  })
})

// ---------- runQuestions ----------

const ONE_CALL: Usage = { calls: 1, inputTokens: 10, outputTokens: 5 }

function reply(overrides: Partial<AssistantReply> = {}): AssistantReply {
  return {
    status: "answered",
    answer: "resposta",
    sources: ["01-a.md"],
    retrieved: [],
    searchQuery: "busca",
    usage: ONE_CALL,
    latencyMs: 100,
    ...overrides,
  }
}

type Handler = (input: HandleMessageInput) => AssistantReply | Error

function fakeAssistant(handler: Handler): Assistant & { inputs: HandleMessageInput[] } {
  const inputs: HandleMessageInput[] = []
  return {
    inputs,
    async handleMessage(input) {
      inputs.push(input)
      const result = handler(input)
      if (result instanceof Error) throw result
      return result
    },
  }
}

function baseOptions(assistant: Assistant) {
  const sleeps: number[] = []
  let sessionCounter = 0
  return {
    sleeps,
    options: {
      assistant,
      delayMs: 4000,
      sleep: async (ms: number) => {
        sleeps.push(ms)
      },
      newSessionId: () => `sessao-${++sessionCounter}`,
      now: () => 0,
    },
  }
}

describe("runQuestions", () => {
  const single = q({ id: 1, pergunta: "Qual a comissão?", perfil: { plan: "Plano Básico" } })
  const multi = q({
    id: 2,
    tipo: "multi_turno",
    pergunta: undefined,
    turnos: ["Faço entrega própria.", "E a comissão?"],
    perfil: { name: "Loja" },
  })

  it("runs each question in a new eval session and sums turns in multi_turno", async () => {
    const assistant = fakeAssistant(() => reply())
    const { options, sleeps } = baseOptions(assistant)
    const { results, stoppedByQuota } = await runQuestions([single, multi], options)

    expect(stoppedByQuota).toBe(false)
    expect(assistant.inputs).toEqual([
      {
        sessionId: "sessao-1",
        message: "Qual a comissão?",
        channel: "eval",
        profile: { plan: "Plano Básico" },
      },
      {
        sessionId: "sessao-2",
        message: "Faço entrega própria.",
        channel: "eval",
        profile: { name: "Loja" },
      },
      {
        sessionId: "sessao-2",
        message: "E a comissão?",
        channel: "eval",
        profile: { name: "Loja" },
      },
    ])
    // Delay between questions and between turns, never before the first message.
    expect(sleeps).toEqual([4000, 4000])
    expect(results[1]).toMatchObject({
      latencyMs: 200,
      usage: { calls: 2, inputTokens: 20, outputTokens: 10 },
    })
    expect(results[1]?.reply).toEqual(reply())
    expect(results[0]?.error).toBeUndefined()
  })

  it("records the error name and keeps going when a question fails", async () => {
    let call = 0
    const assistant = fakeAssistant(() => {
      call++
      return call === 1 ? new LlmUnavailableError("fora") : reply()
    })
    const { options } = baseOptions(assistant)
    const { results, stoppedByQuota } = await runQuestions([single, single], options)

    expect(stoppedByQuota).toBe(false)
    expect(results).toHaveLength(2)
    expect(results[0]).toMatchObject({ reply: null, error: "LlmUnavailableError" })
    expect(results[1]?.reply?.status).toBe("answered")
  })

  it("keeps the usage and latency of the turns that finished before an error", async () => {
    let call = 0
    const assistant = fakeAssistant(() => {
      call++
      return call === 2 ? new LlmUnavailableError("fora") : reply()
    })
    const { options } = baseOptions(assistant)
    const { results } = await runQuestions([multi], options)
    expect(results[0]).toMatchObject({
      reply: null,
      error: "LlmUnavailableError",
      latencyMs: 100,
      usage: ONE_CALL,
    })
  })

  it("stops after 3 consecutive LlmQuotaError and returns the partial results", async () => {
    let call = 0
    const assistant = fakeAssistant(() => {
      call++
      return call === 1 ? reply() : new LlmQuotaError("cota")
    })
    const { options } = baseOptions(assistant)
    const questions = [1, 2, 3, 4, 5, 6].map((id) => q({ id }))
    const { results, stoppedByQuota } = await runQuestions(questions, options)

    expect(stoppedByQuota).toBe(true)
    expect(results.map((result) => result.error ?? "ok")).toEqual([
      "ok",
      "LlmQuotaError",
      "LlmQuotaError",
      "LlmQuotaError",
    ])
  })

  it("resets the quota streak after a question that did not hit the quota", async () => {
    const errors = [
      new LlmQuotaError("cota"),
      new LlmQuotaError("cota"),
      null,
      new LlmQuotaError("cota"),
      new LlmQuotaError("cota"),
      null,
    ]
    let call = 0
    const assistant = fakeAssistant(() => errors[call++] ?? reply())
    const { options } = baseOptions(assistant)
    const questions = [1, 2, 3, 4, 5, 6].map((id) => q({ id }))
    const { results, stoppedByQuota } = await runQuestions(questions, options)
    expect(stoppedByQuota).toBe(false)
    expect(results).toHaveLength(6)
  })

  it("judges only answered replies and adds the judge usage", async () => {
    const statuses: AssistantReply["status"][] = ["answered", "fallback"]
    let call = 0
    const assistant = fakeAssistant(() => reply({ status: statuses[call++] ?? "answered" }))
    const { options, sleeps } = baseOptions(assistant)
    const judged: string[] = []
    const { results } = await runQuestions([single, q({ id: 3, pergunta: "Outra?" })], {
      ...options,
      judge: async ({ question }) => {
        judged.push(question)
        return { result: { corretude: 4, fidelidade: 5, justificativa: "ok" }, usage: ONE_CALL }
      },
    })

    expect(judged).toEqual(["Qual a comissão?"])
    expect(results[0]?.judge).toEqual({ corretude: 4, fidelidade: 5, justificativa: "ok" })
    expect(results[0]?.usage.calls).toBe(2)
    expect(results[1]?.judge).toBeNull()
    expect(sleeps).toEqual([4000, 4000])
  })

  it("passes the last turn to the judge and survives a judge error", async () => {
    const assistant = fakeAssistant(() => reply())
    const { options } = baseOptions(assistant)
    const judged: string[] = []
    const { results } = await runQuestions([multi], {
      ...options,
      judge: async ({ question }) => {
        judged.push(question)
        throw new LlmUnavailableError("fora")
      },
    })
    expect(judged).toEqual(["E a comissão?"])
    expect(results[0]?.judge).toBeNull()
    expect(results[0]?.reply?.status).toBe("answered")
  })

  it("reports progress after each question", async () => {
    const assistant = fakeAssistant(() => reply())
    const { options } = baseOptions(assistant)
    const seen: string[] = []
    await runQuestions([single, multi], {
      ...options,
      onProgress: ({ index, total, result }) => {
        seen.push(`${index}/${total}:${result.question.id}`)
      },
    })
    expect(seen).toEqual(["1/2:1", "2/2:2"])
  })

  it("counts a judge LlmQuotaError toward the quota streak", async () => {
    const assistant = fakeAssistant(() => reply())
    const { options } = baseOptions(assistant)
    const questions = [1, 2, 3, 4].map((id) => q({ id }))
    const { results, stoppedByQuota } = await runQuestions(questions, {
      ...options,
      judge: async () => {
        throw new LlmQuotaError("cota")
      },
    })
    expect(stoppedByQuota).toBe(true)
    expect(results).toHaveLength(3)
    expect(results.every((result) => result.judge === null)).toBe(true)
  })
})
