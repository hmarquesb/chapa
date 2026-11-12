import { readdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import { LlmQuotaError, LlmUnavailableError } from "@/core/errors"
import { validateInput } from "@/core/guardrails"
import { KNOWLEDGE_FILE_PATTERN } from "@/core/rag/ingest"
import type { Assistant, AssistantReply, HandleMessageInput, Usage } from "@/core/types"
import {
  CONVERSATION_TYPES,
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
    rota_esperada: "rag",
    nota: "nota",
    ...overrides,
  }
}

// Conjunto mínimo válido com a distribuição exigida (15/10/6/5/5/4/9/4/3/4/4/4), com uma pergunta
// factual por arquivo de FILES.
function validSet(): EvalQuestion[] {
  const items: EvalQuestion[] = []
  let id = 1
  for (let i = 0; i < 15; i++) {
    items.push(q({ id: id++, fonte_esperada: [i === 0 ? "02-b.md" : "01-a.md"] }))
  }
  for (let i = 0; i < 10; i++) items.push(q({ id: id++, tipo: "parafrase" }))
  for (let i = 0; i < 6; i++) {
    items.push(q({ id: id++, tipo: "perfil", perfil: { version: 2, plan: "proprio" } }))
  }
  for (let i = 0; i < 5; i++) {
    items.push(q({ id: id++, tipo: "multi_doc", fonte_esperada: ["01-a.md", "02-b.md"] }))
  }
  for (let i = 0; i < 5; i++) {
    items.push(q({ id: id++, tipo: "multi_turno", pergunta: undefined, turnos: ["a", "b"] }))
  }
  for (let i = 0; i < 4; i++) items.push(q({ id: id++, tipo: "aberta" }))
  for (let i = 0; i < 9; i++) {
    items.push({
      id: id++,
      tipo: "fora_de_escopo",
      pergunta: "x?",
      esperado: "fallback",
      rota_esperada: "rag",
      nota: "n",
    })
  }
  for (let i = 0; i < 4; i++) {
    items.push({
      id: id++,
      tipo: "adversarial",
      pergunta: "z?",
      esperado: "recusa",
      rota_esperada: "rag",
      nota: "n",
    })
  }
  for (let i = 0; i < 3; i++) {
    items.push({
      id: id++,
      tipo: "bloqueio",
      pergunta: "y?",
      esperado: "recusa",
      rota_esperada: "rag",
      nota: "n",
    })
  }
  for (let i = 0; i < 4; i++) {
    items.push({
      id: id++,
      tipo: "cumprimento",
      pergunta: "bom dia",
      perfil: { version: 2, name: "Cantina" },
      deve_conter: ["Bom dia, Cantina"],
      esperado: "conversa",
      rota_esperada: "cumprimento",
      nota: "n",
    })
  }
  for (let i = 0; i < 4; i++) {
    items.push({
      id: id++,
      tipo: "conversa",
      pergunta: "valeu",
      esperado: "conversa",
      rota_esperada: "conversa",
      nota: "n",
    })
  }
  for (let i = 0; i < 4; i++) {
    items.push({
      id: id++,
      tipo: "misto",
      pergunta: "bom dia! taxa?",
      fonte_esperada: ["01-a.md"],
      deve_conter: ["bom dia", "11%"],
      esperado: "resposta",
      rota_esperada: "rag",
      nota: "n",
    })
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

async function errorsOf(data: unknown, files = FILES): Promise<string[]> {
  const result = await validateQuestions(data, files)
  return result.ok ? [] : result.errors
}

function onlyMessages(items: unknown[]): string[] {
  return (items as EvalQuestion[]).flatMap((item) => item.turnos ?? [item.pergunta ?? ""])
}

describe("validateQuestions with the real eval/perguntas.json", () => {
  it("passes against the files of knowledge-base/", async () => {
    expect(KNOWLEDGE_FILES.length).toBe(11)
    const result = await validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
    expect(result.ok ? [] : result.errors).toEqual([])
    expect(result.ok && result.questions).toHaveLength(73)
  })

  it("uses the ids 101 to 173, the first 62 grouped by type in the distribution order", async () => {
    const result = await validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
    if (!result.ok) throw new Error(result.errors.join("\n"))
    expect(result.questions.map((item) => item.id)).toEqual(
      Array.from({ length: 73 }, (_, i) => 101 + i),
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
      "cumprimento",
      "conversa",
      "misto",
    ]
    // As perguntas 163 a 173 foram acrescentadas depois, sem renumerar as antigas.
    const types = result.questions.filter((item) => item.id <= 162).map((item) => item.tipo)
    expect([...types].sort((a, b) => order.indexOf(a) - order.indexOf(b))).toEqual(types)
  })

  it("has a factual question for every knowledge document", async () => {
    const result = await validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
    if (!result.ok) throw new Error(result.errors.join("\n"))
    const factualSources = new Set(
      result.questions
        .filter((item) => item.tipo === "factual")
        .flatMap((item) => item.fonte_esperada ?? []),
    )
    expect([...factualSources].sort()).toEqual([...KNOWLEDGE_FILES].sort())
  })

  it("covers at least 5 documents in the parafrase questions", async () => {
    const result = await validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
    if (!result.ok) throw new Error(result.errors.join("\n"))
    const sources = new Set(
      result.questions
        .filter((item) => item.tipo === "parafrase")
        .flatMap((item) => item.fonte_esperada ?? []),
    )
    expect(sources.size).toBeGreaterThanOrEqual(5)
  })

  it("matches the input guardrail: blocks the bloqueio questions and nothing in scope", async () => {
    const result = await validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
    if (!result.ok) throw new Error(result.errors.join("\n"))
    for (const item of result.questions) {
      // adversarial: any refusal counts, so the guardrail may or may not block it.
      if (item.tipo === "adversarial") continue
      const blocked = onlyMessages([item]).some((message) => !validateInput(message, 1000).ok)
      expect({ id: item.id, blocked }).toEqual({ id: item.id, blocked: item.tipo === "bloqueio" })
    }
  })

  it("has an in-scope question with a loose sensitive word (CPF, CNPJ, Pix, senha, cartão)", async () => {
    const result = await validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
    if (!result.ok) throw new Error(result.errors.join("\n"))
    const sensitive = /\b(cpf|cnpj|pix|senha|cart[aã]o)\b/i
    const found = result.questions.filter(
      (item) => item.esperado === "resposta" && onlyMessages([item]).some((t) => sensitive.test(t)),
    )
    expect(found.length).toBeGreaterThanOrEqual(1)
  })

  it("never uses a bare number as a nao_deve_conter term", async () => {
    const result = await validateQuestions(REAL_QUESTIONS, KNOWLEDGE_FILES)
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
  it("accepts a valid set", async () => {
    const result = await validateQuestions(validSet(), FILES)
    expect(result.ok ? [] : result.errors).toEqual([])
  })

  it("rejects data that is not an array", async () => {
    expect(await errorsOf({ perguntas: [] })).toEqual([
      "O arquivo precisa ser uma lista de perguntas.",
    ])
  })

  it("requires exactly 73 items", async () => {
    const errors = await errorsOf(validSet().slice(0, 72))
    expect(errors).toContain("São 72 perguntas; precisam ser 73.")
  })

  it("rejects duplicated ids", async () => {
    const items = validSet()
    replace(items, 1, { id: 1 })
    expect(await errorsOf(items)).toContain("Pergunta 1: id repetido.")
  })

  it("checks the distribution by type", async () => {
    const items = validSet()
    replace(items, firstOf(items, "parafrase"), { tipo: "factual" })
    const errors = await errorsOf(items)
    expect(errors).toContain('Tipo "factual": 16 perguntas; precisam ser 15.')
    expect(errors).toContain('Tipo "parafrase": 9 perguntas; precisam ser 10.')
  })

  it("accepts the aberta type as an in-scope question answered by the rag route", async () => {
    const items = validSet()
    const index = firstOf(items, "aberta")
    expect(items[index]).toMatchObject({ esperado: "resposta", rota_esperada: "rag" })
    expect(await errorsOf(items)).toEqual([])
    expect(IN_SCOPE_TYPES.has("aberta")).toBe(true)
  })

  it("requires deve_conter in an aberta question", async () => {
    const items = validSet()
    const id = replace(items, firstOf(items, "aberta"), { deve_conter: undefined })
    expect(await errorsOf(items)).toContain(
      `Pergunta ${id}: deve_conter precisa ter de 1 a 3 termos não vazios.`,
    )
  })

  it("requires esperado resposta and route rag in an aberta question", async () => {
    const items = validSet()
    const id = replace(items, firstOf(items, "aberta"), { esperado: "fallback" })
    expect(await errorsOf(items)).toContain(
      `Pergunta ${id}: tipo aberta precisa de esperado "resposta".`,
    )
  })

  it("rejects an unknown type", async () => {
    const items: unknown[] = validSet()
    replace(items, 1, { tipo: "outro" })
    expect(await errorsOf(items)).toContain('Pergunta 2: tipo inválido "outro".')
  })

  it("accepts the three conversation types with their esperado and route", async () => {
    const items = validSet()
    expect(items.filter((item) => item.tipo === "cumprimento")).toHaveLength(4)
    expect(items.filter((item) => item.tipo === "conversa")).toHaveLength(4)
    expect(items.filter((item) => item.tipo === "misto")).toHaveLength(4)
    expect(await errorsOf(items)).toEqual([])
    expect(CONVERSATION_TYPES).toEqual(new Set(["cumprimento", "conversa", "misto"]))
    expect(IN_SCOPE_TYPES.has("misto")).toBe(false)
  })

  it("requires esperado conversa in cumprimento and conversa, and resposta in misto", async () => {
    const items = validSet()
    const a = replace(items, firstOf(items, "cumprimento"), { esperado: "resposta" })
    const b = replace(items, firstOf(items, "conversa"), { esperado: "fallback" })
    const c = replace(items, firstOf(items, "misto"), { esperado: "conversa" })
    const errors = await errorsOf(items)
    expect(errors).toContain(`Pergunta ${a}: tipo cumprimento precisa de esperado "conversa".`)
    expect(errors).toContain(`Pergunta ${b}: tipo conversa precisa de esperado "conversa".`)
    expect(errors).toContain(`Pergunta ${c}: tipo misto precisa de esperado "resposta".`)
  })

  it("requires rota_esperada coherent with the type", async () => {
    const items = validSet()
    const a = replace(items, firstOf(items, "multi_turno"), { rota_esperada: "conversa" })
    const b = replace(items, firstOf(items, "cumprimento"), { rota_esperada: "rag" })
    const c = replace(items, firstOf(items, "conversa"), { rota_esperada: "cumprimento" })
    const errors = await errorsOf(items)
    expect(errors).toContain(`Pergunta ${a}: tipo multi_turno precisa de rota_esperada "rag".`)
    expect(errors).toContain(
      `Pergunta ${b}: tipo cumprimento precisa de rota_esperada "cumprimento".`,
    )
    expect(errors).toContain(`Pergunta ${c}: tipo conversa precisa de rota_esperada "conversa".`)
  })

  it("requires rota_esperada on every question", async () => {
    const items = validSet()
    replace(items, 0, { rota_esperada: undefined })
    expect(await errorsOf(items)).toContain("Pergunta 1: falta rota_esperada.")
  })

  it("requires perfil.name in cumprimento questions", async () => {
    const items = validSet()
    const index = firstOf(items, "cumprimento")
    const noName = replace(items, index, { perfil: { version: 2 } })
    const noProfile = replace(items, index + 1, { perfil: undefined })
    const blank = replace(items, index + 2, { perfil: { version: 2, name: "  " } })
    const errors = await errorsOf(items)
    for (const id of [noName, noProfile, blank]) {
      expect(errors).toContain(`Pergunta ${id}: cumprimento precisa de perfil.name preenchido.`)
    }
  })

  it("requires 1 to 3 deve_conter terms in cumprimento and misto, optional in conversa", async () => {
    const items = validSet()
    const a = replace(items, firstOf(items, "cumprimento"), { deve_conter: undefined })
    const b = replace(items, firstOf(items, "misto"), { deve_conter: [] })
    replace(items, firstOf(items, "conversa"), { deve_conter: undefined })
    const errors = await errorsOf(items)
    expect(errors).toContain(`Pergunta ${a}: deve_conter precisa ter de 1 a 3 termos não vazios.`)
    expect(errors).toContain(`Pergunta ${b}: deve_conter precisa ter de 1 a 3 termos não vazios.`)
    expect(errors).toHaveLength(2)
  })

  it("treats perfil as in scope and adversarial as out of scope", () => {
    expect(IN_SCOPE_TYPES.has("perfil")).toBe(true)
    expect(IN_SCOPE_TYPES.has("adversarial")).toBe(false)
  })

  it("accepts adversarial questions with esperado recusa and rejects other values", async () => {
    const items = validSet()
    expect(items.filter((item) => item.tipo === "adversarial")).toHaveLength(4)
    expect(await errorsOf(items)).toEqual([])
    const id = replace(items, firstOf(items, "adversarial"), { esperado: "fallback" })
    expect(await errorsOf(items)).toContain(
      `Pergunta ${id}: tipo adversarial precisa de esperado "recusa".`,
    )
  })

  it("requires esperado resposta, fonte_esperada and deve_conter in perfil", async () => {
    const items = validSet()
    const index = firstOf(items, "perfil")
    const id = replace(items, index, { esperado: "recusa" })
    const id2 = replace(items, index + 1, { fonte_esperada: undefined, deve_conter: undefined })
    const errors = await errorsOf(items)
    expect(errors).toContain(`Pergunta ${id}: tipo perfil precisa de esperado "resposta".`)
    expect(errors).toContain(`Pergunta ${id2}: perguntas no escopo precisam de fonte_esperada.`)
    expect(errors).toContain(`Pergunta ${id2}: deve_conter precisa ter de 1 a 3 termos não vazios.`)
  })

  it("requires perfil.plan in perfil questions", async () => {
    const items = validSet()
    const index = firstOf(items, "perfil")
    const noPlan = replace(items, index, { perfil: { version: 2, name: "Pizzaria Bella" } })
    const blankPlan = replace(items, index + 1, { perfil: { version: 2, plan: "   " } })
    const noProfile = replace(items, index + 2, { perfil: undefined })
    const errors = await errorsOf(items)
    for (const id of [noPlan, blankPlan, noProfile]) {
      expect(errors).toContain(`Pergunta ${id}: perfil precisa de perfil.plan preenchido.`)
    }
  })

  it("does not require a plan in the profile of other types", async () => {
    const items = validSet()
    replace(items, 0, { perfil: { version: 2, name: "Pizzaria Bella" } })
    expect(await errorsOf(items)).toEqual([])
  })

  it("accepts nao_deve_conter with 1 to 5 terms in any type", async () => {
    const items = validSet()
    replace(items, 0, { nao_deve_conter: ["22%"] })
    replace(items, firstOf(items, "adversarial"), { nao_deve_conter: ["a", "b", "c", "d", "e"] })
    replace(items, firstOf(items, "fora_de_escopo"), { nao_deve_conter: ["x"] })
    expect(await errorsOf(items)).toEqual([])
  })

  it("rejects an empty nao_deve_conter, more than 5 terms and blank terms", async () => {
    const items: unknown[] = validSet()
    const empty = replace(items, 0, { nao_deve_conter: [] })
    const six = replace(items, 1, { nao_deve_conter: ["a", "b", "c", "d", "e", "f"] })
    const blank = replace(items, 2, { nao_deve_conter: ["ok", " "] })
    const notList = replace(items, 3, { nao_deve_conter: "22%" })
    const errors = await errorsOf(items)
    for (const id of [empty, six, blank, notList]) {
      expect(errors).toContain(
        `Pergunta ${id}: nao_deve_conter precisa ter de 1 a 5 termos não vazios.`,
      )
    }
  })

  it("requires a factual question for every knowledge document", async () => {
    const items = validSet()
    replace(items, 0, { fonte_esperada: ["01-a.md"] })
    const errors = await errorsOf(items)
    expect(errors).toContain('Documento "02-b.md" sem pergunta factual.')
    expect(errors).not.toContain('Documento "01-a.md" sem pergunta factual.')
  })

  it("does not count other types toward document coverage", async () => {
    const items = validSet()
    replace(items, 0, { fonte_esperada: ["01-a.md"] })
    // parafrase and multi_doc still cite 02-b.md, but only factual counts.
    replace(items, firstOf(items, "parafrase"), { fonte_esperada: ["02-b.md"] })
    expect(await errorsOf(items)).toContain('Documento "02-b.md" sem pergunta factual.')
  })

  it("requires pergunta and turnos to be mutually exclusive", async () => {
    const items = validSet()
    replace(items, 0, { turnos: ["a", "b"] })
    replace(items, 1, { pergunta: undefined })
    const errors = await errorsOf(items)
    expect(errors).toContain("Pergunta 1: use pergunta ou turnos, não os dois.")
    expect(errors).toContain("Pergunta 2: falta pergunta ou turnos.")
  })

  it("requires turnos (at least 2) in multi_turno and only there", async () => {
    const items = validSet()
    const id = replace(items, firstOf(items, "multi_turno"), { turnos: ["só um"] })
    replace(items, 0, { pergunta: undefined, turnos: ["a", "b"] })
    const errors = await errorsOf(items)
    expect(errors).toContain(
      `Pergunta ${id}: multi_turno precisa de turnos com 2 ou mais mensagens.`,
    )
    expect(errors).toContain("Pergunta 1: só multi_turno usa turnos.")
  })

  it("requires esperado coherent with the type", async () => {
    const items = validSet()
    replace(items, 0, { esperado: "fallback" })
    const out = replace(items, firstOf(items, "fora_de_escopo"), { esperado: "recusa" })
    const block = replace(items, firstOf(items, "bloqueio"), { esperado: "fallback" })
    const errors = await errorsOf(items)
    expect(errors).toContain('Pergunta 1: tipo factual precisa de esperado "resposta".')
    expect(errors).toContain(`Pergunta ${out}: tipo fora_de_escopo precisa de esperado "fallback".`)
    expect(errors).toContain(`Pergunta ${block}: tipo bloqueio precisa de esperado "recusa".`)
  })

  it("requires every fonte_esperada to exist in knowledge-base/", async () => {
    const items = validSet()
    replace(items, 1, { fonte_esperada: ["12-inexistente.md"] })
    expect(await errorsOf(items)).toContain(
      'Pergunta 2: fonte_esperada "12-inexistente.md" não existe em knowledge-base/.',
    )
  })

  it("requires fonte_esperada and 1 to 3 deve_conter terms in scope", async () => {
    const items = validSet()
    replace(items, 1, { fonte_esperada: [] })
    replace(items, 2, { deve_conter: ["a", "b", "c", "d"] })
    replace(items, 3, { deve_conter: [""] })
    const errors = await errorsOf(items)
    expect(errors).toContain("Pergunta 2: perguntas no escopo precisam de fonte_esperada.")
    expect(errors).toContain("Pergunta 3: deve_conter precisa ter de 1 a 3 termos não vazios.")
    expect(errors).toContain("Pergunta 4: deve_conter precisa ter de 1 a 3 termos não vazios.")
  })

  it("requires 2 or more distinct sources in multi_doc", async () => {
    const items = validSet()
    const id = replace(items, firstOf(items, "multi_doc"), { fonte_esperada: ["01-a.md"] })
    expect(await errorsOf(items)).toContain(
      `Pergunta ${id}: multi_doc precisa de 2 ou mais arquivos em fonte_esperada.`,
    )
  })

  it("requires a nota on every question", async () => {
    const items = validSet()
    replace(items, 0, { nota: " " })
    expect(await errorsOf(items)).toContain("Pergunta 1: falta a nota.")
  })

  it("rejects a perfil.plan outside the list", async () => {
    const items: unknown[] = validSet()
    replace(items, 0, { perfil: { version: 2, plan: "Plano Próprio" } })
    expect(await errorsOf(items)).toContain(
      'Pergunta 1: perfil.plan precisa ser "proprio", "entrega" ou "misto".',
    )
  })

  it("rejects an invalid perfil with the message of the shared parser", async () => {
    const items: unknown[] = validSet()
    replace(items, 0, { perfil: { version: 2, name: 3 } })
    replace(items, 1, { perfil: { version: 2, idade: "x" } })
    replace(items, 2, { perfil: { version: 2, cuisine: { id: "tailandesa" } } })
    replace(items, 3, { perfil: { version: 2, location: { uf: "SP", cityCode: 3304557 } } })
    const errors = await errorsOf(items)
    expect(errors).toContain("Pergunta 1: perfil inválido: O perfil do restaurante é inválido.")
    expect(errors).toContain("Pergunta 2: perfil inválido: O pedido tem campos desconhecidos.")
    expect(errors).toContain(
      "Pergunta 3: perfil inválido: Escolha o tipo de cozinha da lista ou descreva em até 30 caracteres.",
    )
    expect(errors).toContain("Pergunta 4: perfil inválido: Escolha o estado e a cidade da lista.")
  })

  it("rejects a profile in the old format with the message of the PUT", async () => {
    const items: unknown[] = validSet()
    replace(items, 0, { perfil: { plan: "misto", city: "Campinas" } })
    replace(items, 1, { perfil: { plan: "misto", name: "Bella" } })
    const errors = await errorsOf(items)
    expect(errors).toContain(
      "Pergunta 1: perfil inválido: O formulário do perfil mudou. Recarregue a página.",
    )
    expect(errors).toContain(
      "Pergunta 2: perfil inválido: O formulário do perfil mudou. Recarregue a página.",
    )
  })

  it("accepts a v2 profile with a cuisine and a city", async () => {
    const items: unknown[] = validSet()
    replace(items, 0, {
      perfil: {
        version: 2,
        plan: "entrega",
        cuisine: { id: "japonesa" },
        location: { uf: "SP", cityCode: 3509502 },
      },
    })
    expect(await errorsOf(items)).toEqual([])
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
    context: [],
    searchQuery: "busca",
    usage: ONE_CALL,
    latencyMs: 100,
    routerMs: null,
    route: "rag",
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
  const single = q({ id: 1, pergunta: "Qual a comissão?", perfil: { version: 2, plan: "misto" } })
  const multi = q({
    id: 2,
    tipo: "multi_turno",
    pergunta: undefined,
    turnos: ["Faço entrega própria.", "E a comissão?"],
    perfil: { version: 2, name: "Loja" },
  })

  it("records the context terms missing in the last turn of in-scope questions", async () => {
    const block = (content: string) => ({ source: "01-a.md", section: "", content })
    const turnContexts = [[block("sem nada")], [block("A comissão é 11%.")]]
    let call = 0
    const assistant = fakeAssistant((input) =>
      input.message === "Qual a comissão?"
        ? reply({ context: [block("A comissão é 12%.")] })
        : reply({ context: turnContexts[call++] ?? [] }),
    )
    const { options } = baseOptions(assistant)
    const withTerms = { ...single, deve_conter: ["12%", "900"] }
    const multiTerms = { ...multi, deve_conter: ["11%"] }
    const { results } = await runQuestions([withTerms, multiTerms], options)
    expect(results[0]?.contextMissing).toEqual(["900"])
    expect(results[1]?.contextMissing).toEqual([])
  })

  it("leaves contextMissing out for out-of-scope questions and errors", async () => {
    const outOfScope = q({
      id: 3,
      tipo: "fora_de_escopo",
      esperado: "fallback",
      deve_conter: undefined,
    })
    const assistant = fakeAssistant((input) =>
      input.message === "Qual a comissão?" ? new LlmUnavailableError() : reply(),
    )
    const { options } = baseOptions(assistant)
    const { results } = await runQuestions([single, outOfScope], options)
    expect(results[0]?.contextMissing).toBeUndefined()
    expect(results[1]?.contextMissing).toBeUndefined()
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
        profile: { version: 2, plan: "misto" },
      },
      {
        sessionId: "sessao-2",
        message: "Faço entrega própria.",
        channel: "eval",
        accountId: null,
        profile: { version: 2, name: "Loja" },
      },
      {
        sessionId: "sessao-2",
        message: "E a comissão?",
        channel: "eval",
        accountId: null,
        profile: { version: 2, name: "Loja" },
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
