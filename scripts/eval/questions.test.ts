import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { LlmQuotaError, LlmUnavailableError } from "@/core/errors"
import { validateInput } from "@/core/guardrails"
import { KNOWLEDGE_FILE_PATTERN } from "@/core/rag/ingest"
import type { Assistant, AssistantReply, HandleMessageInput, Usage } from "@/core/types"
import {
  type EvalQuestion,
  type EvalQuestionType,
  IN_SCOPE_TYPES,
  runQuestions,
  validateQuestions,
} from "./questions"

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

// Conjunto mínimo válido com a distribuição exigida (15/6/5/5/5/7/4/3), com uma pergunta
// factual por arquivo de FILES.
function validSet(): EvalQuestion[] {
  const items: EvalQuestion[] = []
  let id = 1
  for (let i = 0; i < 15; i++) {
    items.push(q({ id: id++, fonte_esperada: [i === 0 ? "02-b.md" : "01-a.md"] }))
  }
  for (let i = 0; i < 6; i++) items.push(q({ id: id++, tipo: "parafrase" }))
  for (let i = 0; i < 5; i++) {
    items.push(q({ id: id++, tipo: "perfil", perfil: { plan: "Plano Próprio" } }))
  }
  for (let i = 0; i < 5; i++) {
    items.push(q({ id: id++, tipo: "multi_doc", fonte_esperada: ["01-a.md", "02-b.md"] }))
  }
  for (let i = 0; i < 5; i++) {
    items.push(q({ id: id++, tipo: "multi_turno", pergunta: undefined, turnos: ["a", "b"] }))
  }
  for (let i = 0; i < 7; i++) {
    items.push({
      id: id++,
      tipo: "fora_de_escopo",
      pergunta: "x?",
      esperado: "fallback",
      nota: "n",
    })
  }
  for (let i = 0; i < 4; i++) {
    items.push({ id: id++, tipo: "adversarial", pergunta: "z?", esperado: "recusa", nota: "n" })
  }
  for (let i = 0; i < 3; i++) {
    items.push({ id: id++, tipo: "bloqueio", pergunta: "y?", esperado: "recusa", nota: "n" })
  }
  return items
}

// Índice da primeira pergunta do tipo no validSet().
function firstOf(items: EvalQuestion[], tipo: EvalQuestionType): number {
  return items.findIndex((item) => item.tipo === tipo)
}

function replace(items: unknown[], index: number, overrides: Record<string, unknown>): number {
  items[index] = { ...(items[index] as EvalQuestion), ...overrides }
  return (items[index] as EvalQuestion).id
}

function errorsOf(data: unknown, files = FILES): string[] {
  const result = validateQuestions(data, files)
  return result.ok ? [] : result.errors
}

function onlyMessages(items: unknown[]): string[] {
  return (items as EvalQuestion[]).flatMap((item) => item.turnos ?? [item.pergunta ?? ""])
}

describe("validateQuestions with the real eval/perguntas.json", () => {
  it("passes against the files of knowledge-base/", () => {
    expect(KNOWLEDGE_FILES.length).toBe(11)
    const result = validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
    expect(result.ok ? [] : result.errors).toEqual([])
    expect(result.ok && result.questions).toHaveLength(50)
  })

  it("uses the ids 101 to 150, grouped by type in the distribution order", () => {
    const result = validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
    if (!result.ok) throw new Error(result.errors.join("\n"))
    expect(result.questions.map((item) => item.id)).toEqual(
      Array.from({ length: 50 }, (_, i) => 101 + i),
    )
    const order: EvalQuestionType[] = [
      "factual",
      "parafrase",
      "perfil",
      "multi_doc",
      "multi_turno",
      "fora_de_escopo",
      "adversarial",
      "bloqueio",
    ]
    const types = result.questions.map((item) => item.tipo)
    expect([...types].sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(types)
  })

  it("has a factual question for every knowledge document", () => {
    const result = validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
    if (!result.ok) throw new Error(result.errors.join("\n"))
    const factualSources = new Set(
      result.questions
        .filter((item) => item.tipo === "factual")
        .flatMap((item) => item.fonte_esperada ?? []),
    )
    expect([...factualSources].sort()).toEqual([...KNOWLEDGE_FILES].sort())
  })

  it("covers at least 5 documents in the parafrase questions", () => {
    const result = validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
    if (!result.ok) throw new Error(result.errors.join("\n"))
    const sources = new Set(
      result.questions
        .filter((item) => item.tipo === "parafrase")
        .flatMap((item) => item.fonte_esperada ?? []),
    )
    expect(sources.size).toBeGreaterThanOrEqual(5)
  })

  it("matches the input guardrail: blocks the bloqueio questions and nothing in scope", () => {
    const result = validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
    if (!result.ok) throw new Error(result.errors.join("\n"))
    for (const item of result.questions) {
      // adversarial: any refusal counts, so the guardrail may or may not block it.
      if (item.tipo === "adversarial") continue
      const blocked = onlyMessages([item]).some((message) => !validateInput(message, 1000).ok)
      expect({ id: item.id, blocked }).toEqual({ id: item.id, blocked: item.tipo === "bloqueio" })
    }
  })

  it("has an in-scope question with a loose sensitive word (CPF, CNPJ, Pix, senha, cartão)", () => {
    const result = validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
    if (!result.ok) throw new Error(result.errors.join("\n"))
    const sensitive = /\b(cpf|cnpj|pix|senha|cart[aã]o)\b/i
    const found = result.questions.filter(
      (item) => item.esperado === "resposta" && onlyMessages([item]).some((t) => sensitive.test(t)),
    )
    expect(found.length).toBeGreaterThanOrEqual(1)
  })

  it("never uses a bare number as a nao_deve_conter term", () => {
    const result = validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
    if (!result.ok) throw new Error(result.errors.join("\n"))
    const bare = result.questions.flatMap((item) =>
      (item.nao_deve_conter ?? [])
        .filter((term) => /^\d+$/.test(term.trim()))
        .map((term) => `${item.id}: ${term}`),
    )
    expect(bare).toEqual([])
  })
})

describe("validateQuestions", () => {
  it("accepts a valid set", () => {
    const result = validateQuestions(validSet(), FILES)
    expect(result.ok ? [] : result.errors).toEqual([])
  })

  it("rejects data that is not an array", () => {
    expect(errorsOf({ perguntas: [] })).toEqual(["O arquivo precisa ser uma lista de perguntas."])
  })

  it("requires exactly 50 items", () => {
    const errors = errorsOf(validSet().slice(0, 49))
    expect(errors).toContain("São 49 perguntas; precisam ser 50.")
  })

  it("rejects duplicated ids", () => {
    const items = validSet()
    replace(items, 1, { id: 1 })
    expect(errorsOf(items)).toContain("Pergunta 1: id repetido.")
  })

  it("checks the distribution by type", () => {
    const items = validSet()
    replace(items, firstOf(items, "parafrase"), { tipo: "factual" })
    const errors = errorsOf(items)
    expect(errors).toContain('Tipo "factual": 16 perguntas; precisam ser 15.')
    expect(errors).toContain('Tipo "parafrase": 5 perguntas; precisam ser 6.')
  })

  it("rejects an unknown type", () => {
    const items: unknown[] = validSet()
    replace(items, 1, { tipo: "outro" })
    expect(errorsOf(items)).toContain('Pergunta 2: tipo inválido "outro".')
  })

  it("treats perfil as in scope and adversarial as out of scope", () => {
    expect(IN_SCOPE_TYPES.has("perfil")).toBe(true)
    expect(IN_SCOPE_TYPES.has("adversarial")).toBe(false)
  })

  it("accepts adversarial questions with esperado recusa and rejects other values", () => {
    const items = validSet()
    expect(items.filter((item) => item.tipo === "adversarial")).toHaveLength(4)
    expect(errorsOf(items)).toEqual([])
    const id = replace(items, firstOf(items, "adversarial"), { esperado: "fallback" })
    expect(errorsOf(items)).toContain(
      `Pergunta ${id}: tipo adversarial precisa de esperado "recusa".`,
    )
  })

  it("requires esperado resposta, fonte_esperada and deve_conter in perfil", () => {
    const items = validSet()
    const index = firstOf(items, "perfil")
    const id = replace(items, index, { esperado: "recusa" })
    const id2 = replace(items, index + 1, { fonte_esperada: undefined, deve_conter: undefined })
    const errors = errorsOf(items)
    expect(errors).toContain(`Pergunta ${id}: tipo perfil precisa de esperado "resposta".`)
    expect(errors).toContain(`Pergunta ${id2}: perguntas no escopo precisam de fonte_esperada.`)
    expect(errors).toContain(`Pergunta ${id2}: deve_conter precisa ter de 1 a 3 termos não vazios.`)
  })

  it("requires perfil.plan in perfil questions", () => {
    const items = validSet()
    const index = firstOf(items, "perfil")
    const noPlan = replace(items, index, { perfil: { name: "Pizzaria Bella" } })
    const blankPlan = replace(items, index + 1, { perfil: { plan: "   " } })
    const noProfile = replace(items, index + 2, { perfil: undefined })
    const errors = errorsOf(items)
    for (const id of [noPlan, blankPlan, noProfile]) {
      expect(errors).toContain(`Pergunta ${id}: perfil precisa de perfil.plan preenchido.`)
    }
  })

  it("does not require a plan in the profile of other types", () => {
    const items = validSet()
    replace(items, 0, { perfil: { name: "Pizzaria Bella" } })
    expect(errorsOf(items)).toEqual([])
  })

  it("accepts nao_deve_conter with 1 to 5 terms in any type", () => {
    const items = validSet()
    replace(items, 0, { nao_deve_conter: ["22%"] })
    replace(items, firstOf(items, "adversarial"), { nao_deve_conter: ["a", "b", "c", "d", "e"] })
    replace(items, firstOf(items, "fora_de_escopo"), { nao_deve_conter: ["x"] })
    expect(errorsOf(items)).toEqual([])
  })

  it("rejects an empty nao_deve_conter, more than 5 terms and blank terms", () => {
    const items: unknown[] = validSet()
    const empty = replace(items, 0, { nao_deve_conter: [] })
    const six = replace(items, 1, { nao_deve_conter: ["a", "b", "c", "d", "e", "f"] })
    const blank = replace(items, 2, { nao_deve_conter: ["ok", " "] })
    const notList = replace(items, 3, { nao_deve_conter: "22%" })
    const errors = errorsOf(items)
    for (const id of [empty, six, blank, notList]) {
      expect(errors).toContain(
        `Pergunta ${id}: nao_deve_conter precisa ter de 1 a 5 termos não vazios.`,
      )
    }
  })

  it("requires a factual question for every knowledge document", () => {
    const items = validSet()
    replace(items, 0, { fonte_esperada: ["01-a.md"] })
    const errors = errorsOf(items)
    expect(errors).toContain('Documento "02-b.md" sem pergunta factual.')
    expect(errors).not.toContain('Documento "01-a.md" sem pergunta factual.')
  })

  it("does not count other types toward document coverage", () => {
    const items = validSet()
    replace(items, 0, { fonte_esperada: ["01-a.md"] })
    // parafrase and multi_doc still cite 02-b.md, but only factual counts.
    replace(items, firstOf(items, "parafrase"), { fonte_esperada: ["02-b.md"] })
    expect(errorsOf(items)).toContain('Documento "02-b.md" sem pergunta factual.')
  })

  it("requires pergunta and turnos to be mutually exclusive", () => {
    const items = validSet()
    replace(items, 0, { turnos: ["a", "b"] })
    replace(items, 1, { pergunta: undefined })
    const errors = errorsOf(items)
    expect(errors).toContain("Pergunta 1: use pergunta ou turnos, não os dois.")
    expect(errors).toContain("Pergunta 2: falta pergunta ou turnos.")
  })

  it("requires turnos (at least 2) in multi_turno and only there", () => {
    const items = validSet()
    const id = replace(items, firstOf(items, "multi_turno"), { turnos: ["só um"] })
    replace(items, 0, { pergunta: undefined, turnos: ["a", "b"] })
    const errors = errorsOf(items)
    expect(errors).toContain(
      `Pergunta ${id}: multi_turno precisa de turnos com 2 ou mais mensagens.`,
    )
    expect(errors).toContain("Pergunta 1: só multi_turno usa turnos.")
  })

  it("requires esperado coherent with the type", () => {
    const items = validSet()
    replace(items, 0, { esperado: "fallback" })
    const out = replace(items, firstOf(items, "fora_de_escopo"), { esperado: "recusa" })
    const block = replace(items, firstOf(items, "bloqueio"), { esperado: "fallback" })
    const errors = errorsOf(items)
    expect(errors).toContain('Pergunta 1: tipo factual precisa de esperado "resposta".')
    expect(errors).toContain(`Pergunta ${out}: tipo fora_de_escopo precisa de esperado "fallback".`)
    expect(errors).toContain(`Pergunta ${block}: tipo bloqueio precisa de esperado "recusa".`)
  })

  it("requires every fonte_esperada to exist in knowledge-base/", () => {
    const items = validSet()
    replace(items, 1, { fonte_esperada: ["12-inexistente.md"] })
    expect(errorsOf(items)).toContain(
      'Pergunta 2: fonte_esperada "12-inexistente.md" não existe em knowledge-base/.',
    )
  })

  it("requires fonte_esperada and 1 to 3 deve_conter terms in scope", () => {
    const items = validSet()
    replace(items, 1, { fonte_esperada: [] })
    replace(items, 2, { deve_conter: ["a", "b", "c", "d"] })
    replace(items, 3, { deve_conter: [""] })
    const errors = errorsOf(items)
    expect(errors).toContain("Pergunta 2: perguntas no escopo precisam de fonte_esperada.")
    expect(errors).toContain("Pergunta 3: deve_conter precisa ter de 1 a 3 termos não vazios.")
    expect(errors).toContain("Pergunta 4: deve_conter precisa ter de 1 a 3 termos não vazios.")
  })

  it("requires 2 or more distinct sources in multi_doc", () => {
    const items = validSet()
    const id = replace(items, firstOf(items, "multi_doc"), { fonte_esperada: ["01-a.md"] })
    expect(errorsOf(items)).toContain(
      `Pergunta ${id}: multi_doc precisa de 2 ou mais arquivos em fonte_esperada.`,
    )
  })

  it("requires a nota on every question", () => {
    const items = validSet()
    replace(items, 0, { nota: " " })
    expect(errorsOf(items)).toContain("Pergunta 1: falta a nota.")
  })

  it("rejects an invalid perfil", () => {
    const items: unknown[] = validSet()
    replace(items, 0, { perfil: { name: 3, idade: "x" } })
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
        accountId: null,
        profile: { plan: "Plano Básico" },
      },
      {
        sessionId: "sessao-2",
        message: "Faço entrega própria.",
        channel: "eval",
        accountId: null,
        profile: { name: "Loja" },
      },
      {
        sessionId: "sessao-2",
        message: "E a comissão?",
        channel: "eval",
        accountId: null,
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
