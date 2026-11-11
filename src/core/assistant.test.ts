import { describe, expect, it } from "vitest"
import { type AppConfig, config, withRag } from "@/config"
import { createAssistant } from "@/core/assistant"
import { LlmUnavailableError, SessionNotFoundError } from "@/core/errors"
import {
  BLOCKED_INPUT_MESSAGES,
  BLOCKED_OUTPUT_MESSAGE,
  FALLBACK_MESSAGE,
  OUTPUT_BLOCK_SIGNALS,
} from "@/core/messages"
import { REWRITE_PROMPT, SUMMARY_PROMPT } from "@/core/prompts"
import type {
  ChunkCandidate,
  ChunkRepository,
  ConversationSummaryRecord,
  EmbedInput,
  GenerateInput,
  HandleMessageInput,
  LlmClient,
  SessionOwner,
  SessionRecord,
  SessionRepository,
  StoredMessage,
  Usage,
} from "@/core/types"
import type { Channel, RestaurantProfile } from "@/lib/types"

const SESSION_ID = "0b7c9a52-3f0e-4d4f-9a55-2a1f3c1d9e10"

const EMBED_USAGE: Usage = { calls: 1, inputTokens: 5, outputTokens: 0 }
const REWRITE_USAGE: Usage = { calls: 1, inputTokens: 50, outputTokens: 10 }
const SUMMARY_USAGE: Usage = { calls: 1, inputTokens: 200, outputTokens: 60 }
const ANSWER_USAGE: Usage = { calls: 1, inputTokens: 900, outputTokens: 120 }

function candidate(
  id: number,
  source: string,
  semantic: number,
  keyword: number,
  section = "Seção",
): ChunkCandidate {
  return { id, source, section, content: `conteúdo do trecho ${id}`, semantic, keyword }
}

// Scores com alpha 0.7: 1 → 0.93, 2 → 0.80, 3 → 0.72, 4 → 0.21 (abaixo do minScore 0.5).
const GOOD_CANDIDATES = [
  candidate(3, "01-planos-e-taxas.md", 0.8, 0.533),
  candidate(1, "02-repasse-financeiro.md", 0.9, 1),
  candidate(2, "01-planos-e-taxas.md", 0.8, 0.8),
  candidate(4, "07-embalagem-e-entrega.md", 0.3, 0),
]
const WEAK_CANDIDATES = [candidate(5, "06-avaliacoes-e-reputacao.md", 0.3, 0.1)]

type Responder = (input: GenerateInput) => string | Error

class FakeLlm implements LlmClient {
  generateCalls: GenerateInput[] = []
  embedCalls: EmbedInput[] = []
  answer: Responder = () => "O repasse é feito conforme o ciclo descrito no portal."
  rewrite: Responder = () => "Pergunta reescrita?"
  summary: Responder = () => "Resumo gerado."

  get calls(): number {
    return this.generateCalls.length + this.embedCalls.length
  }

  callsWithSystem(system: string): GenerateInput[] {
    return this.generateCalls.filter((call) => call.system === system)
  }

  answerCalls(): GenerateInput[] {
    return this.generateCalls.filter(
      (call) => call.system !== REWRITE_PROMPT && call.system !== SUMMARY_PROMPT,
    )
  }

  async generate(input: GenerateInput): Promise<{ text: string; usage: Usage }> {
    this.generateCalls.push(input)
    const [responder, usage] =
      input.system === REWRITE_PROMPT
        ? [this.rewrite, REWRITE_USAGE]
        : input.system === SUMMARY_PROMPT
          ? [this.summary, SUMMARY_USAGE]
          : [this.answer, ANSWER_USAGE]
    const output = responder(input)
    if (output instanceof Error) throw output
    return { text: output, usage }
  }

  async embed(input: EmbedInput): Promise<{ vectors: number[][]; usage: Usage }> {
    this.embedCalls.push(input)
    return { vectors: [[0.1, 0.2, 0.3]], usage: EMBED_USAGE }
  }
}

class FakeChunks implements ChunkRepository {
  candidates: ChunkCandidate[] = GOOD_CANDIDATES
  searchQueries: string[] = []

  async replaceAll(): Promise<number> {
    throw new Error("replaceAll não deveria ser chamado")
  }

  async search(input: Parameters<ChunkRepository["search"]>[0]): Promise<ChunkCandidate[]> {
    this.searchQueries.push(input.query)
    return this.candidates
  }

  async count(): Promise<number> {
    return this.candidates.length
  }
}

class FakeSessions implements SessionRepository {
  calls: string[] = []
  sessions = new Map<string, SessionRecord>()
  messages: Array<StoredMessage & { sessionId: string }> = []
  touchInputs: Array<Parameters<SessionRepository["touch"]>[0]> = []
  ownerArgs: Array<{ call: string; accountId: string | null }> = []
  savedSummaries: Array<{ sessionId: string; summary: string; untilId: number }> = []
  private nextId = 1

  // Conversa existente de outro dono; sem registro, qualquer dono passa (mensagens pré-carregadas).
  private foreign(id: string, owner: SessionOwner): boolean {
    const existing = this.sessions.get(id)
    return existing !== undefined && existing.accountId !== owner.accountId
  }

  async get(id: string, owner: SessionOwner): Promise<SessionRecord | null> {
    this.calls.push("get")
    this.ownerArgs.push({ call: "get", accountId: owner.accountId })
    return this.foreign(id, owner) ? null : (this.sessions.get(id) ?? null)
  }

  async touch(input: Parameters<SessionRepository["touch"]>[0]): Promise<SessionRecord> {
    this.calls.push("touch")
    this.touchInputs.push(input)
    this.ownerArgs.push({ call: "touch", accountId: input.owner.accountId })
    if (this.foreign(input.id, input.owner)) throw new SessionNotFoundError("outro dono")
    const now = new Date("2026-11-05T12:00:00Z")
    const existing = this.sessions.get(input.id)
    const record: SessionRecord = existing
      ? { ...existing, profile: input.profile ?? existing.profile, lastActivityAt: now }
      : {
          id: input.id,
          channel: input.channel,
          accountId: input.owner.accountId,
          profile: input.profile ?? {},
          summary: null,
          summaryUntilId: null,
          createdAt: now,
          lastActivityAt: now,
        }
    this.sessions.set(input.id, record)
    return record
  }

  async listMessages(
    sessionId: string,
    owner: SessionOwner,
    opts?: { afterId?: number },
  ): Promise<StoredMessage[]> {
    this.calls.push("listMessages")
    this.ownerArgs.push({ call: "listMessages", accountId: owner.accountId })
    if (this.foreign(sessionId, owner)) return []
    const afterId = opts?.afterId ?? 0
    return this.messages
      .filter((message) => message.sessionId === sessionId && message.id > afterId)
      .map(({ sessionId: _ignored, ...message }) => message)
  }

  async appendTurn(
    sessionId: string,
    owner: SessionOwner,
    turn: Parameters<SessionRepository["appendTurn"]>[2],
  ): Promise<void> {
    this.calls.push("appendTurn")
    this.ownerArgs.push({ call: "appendTurn", accountId: owner.accountId })
    if (this.foreign(sessionId, owner)) throw new SessionNotFoundError("outro dono")
    const createdAt = new Date("2026-11-05T12:00:00Z")
    this.messages.push(
      {
        sessionId,
        id: this.nextId++,
        role: "user",
        content: turn.user,
        status: null,
        sources: [],
        createdAt,
      },
      {
        sessionId,
        id: this.nextId++,
        role: "assistant",
        content: turn.assistant,
        status: turn.status,
        sources: turn.sources,
        createdAt,
      },
    )
  }

  async saveSummary(
    sessionId: string,
    owner: SessionOwner,
    summary: string,
    untilId: number,
  ): Promise<void> {
    this.calls.push("saveSummary")
    this.ownerArgs.push({ call: "saveSummary", accountId: owner.accountId })
    if (this.foreign(sessionId, owner)) return
    this.savedSummaries.push({ sessionId, summary, untilId })
    const session = this.sessions.get(sessionId)
    if (session) this.sessions.set(sessionId, { ...session, summary, summaryUntilId: untilId })
  }

  async listForAccount(): Promise<ConversationSummaryRecord[]> {
    throw new Error("listForAccount não deveria ser chamado")
  }

  async deleteForAccount(): Promise<boolean> {
    throw new Error("deleteForAccount não deveria ser chamado")
  }

  async deleteInactive(): Promise<number> {
    throw new Error("deleteInactive não deveria ser chamado")
  }

  // Pré-carrega mensagens alternando parceiro e assistente.
  seed(count: number): void {
    for (let index = 0; index < count; index++) {
      const role = index % 2 === 0 ? "user" : "assistant"
      this.messages.push({
        sessionId: SESSION_ID,
        id: this.nextId++,
        role,
        content: `mensagem antiga ${index + 1}`,
        status: role === "assistant" ? "answered" : null,
        sources: [],
        createdAt: new Date("2026-11-05T11:00:00Z"),
      })
    }
  }
}

function setup(appConfig: AppConfig = config) {
  const llm = new FakeLlm()
  const chunks = new FakeChunks()
  const sessions = new FakeSessions()
  let clock = 1000
  const assistant = createAssistant({
    llm,
    chunks,
    sessions,
    config: appConfig,
    now: () => {
      clock += 25
      return clock
    },
  })
  const send = (message: string, profile?: RestaurantProfile) =>
    assistant.handleMessage({
      sessionId: SESSION_ID,
      message,
      channel: "cli",
      accountId: null,
      profile,
    })
  const sendAs = (accountId: string | null, channel: Channel, message = "Quando cai o repasse?") =>
    assistant.handleMessage({
      sessionId: SESSION_ID,
      message,
      channel,
      accountId,
      accountProfile: channel === "web" ? {} : undefined,
    })
  const sendRaw = (input: Partial<HandleMessageInput> & Pick<HandleMessageInput, "channel">) =>
    assistant.handleMessage({
      sessionId: SESSION_ID,
      message: "Quando cai o repasse?",
      accountId: input.channel === "web" ? "conta-a" : null,
      ...input,
    })
  return { llm, chunks, sessions, assistant, send, sendAs, sendRaw }
}

describe("createAssistant().handleMessage", () => {
  it("blocks sensitive input without calling the LLM or the session repository", async () => {
    const { llm, sessions, send } = setup()
    const reply = await send("Meu CPF é 123.456.789-09, pode verificar?")

    expect(reply).toEqual({
      status: "blocked_input",
      answer: BLOCKED_INPUT_MESSAGES.sensitive_data,
      sources: [],
      retrieved: [],
      searchQuery: "",
      usage: { calls: 0, inputTokens: 0, outputTokens: 0 },
      latencyMs: 25,
    })
    expect(llm.calls).toBe(0)
    expect(sessions.calls).toEqual([])
  })

  it("answers with the fallback without calling the answer LLM when nothing passes minScore", async () => {
    const { llm, chunks, sessions, send } = setup()
    chunks.candidates = WEAK_CANDIDATES
    const reply = await send("Como funciona o programa de fidelidade?")

    expect(reply.status).toBe("fallback")
    expect(reply.answer).toBe(FALLBACK_MESSAGE)
    expect(reply.sources).toEqual([])
    expect(reply.retrieved).toEqual([])
    expect(llm.generateCalls).toEqual([])
    expect(llm.embedCalls).toHaveLength(1)
    expect(sessions.messages).toHaveLength(2)
    expect(sessions.messages.map((m) => m.content)).toEqual([
      "Como funciona o programa de fidelidade?",
      FALLBACK_MESSAGE,
    ])
    expect(sessions.messages[1]?.status).toBe("fallback")
  })

  it("answers with unique sources in score order and persists only the question and answer", async () => {
    const { llm, sessions, send } = setup()
    const reply = await send("Quando cai o repasse?")

    expect(reply.status).toBe("answered")
    expect(reply.answer).toBe("O repasse é feito conforme o ciclo descrito no portal.")
    expect(reply.sources).toEqual(["02-repasse-financeiro.md", "01-planos-e-taxas.md"])
    expect(reply.retrieved.map((chunk) => chunk.id)).toEqual([1, 2, 3])
    // Primeiro turno, sem histórico nem resumo: a busca usa a pergunta original.
    expect(reply.searchQuery).toBe("Quando cai o repasse?")
    expect(llm.callsWithSystem(REWRITE_PROMPT)).toEqual([])

    const [answerCall] = llm.answerCalls()
    expect(answerCall?.model).toBe(config.models.chat)
    expect(answerCall?.temperature).toBe(0.2)
    expect(answerCall?.maxOutputTokens).toBe(800)
    expect(answerCall?.messages).toHaveLength(1)
    expect(answerCall?.messages[0]?.content).toContain("[Fonte: 02-repasse-financeiro.md › Seção]")

    expect(sessions.messages).toHaveLength(2)
    expect(sessions.messages[0]?.content).toBe("Quando cai o repasse?")
    expect(sessions.messages[1]).toMatchObject({
      content: reply.answer,
      status: "answered",
      sources: reply.sources,
    })
    for (const message of sessions.messages) expect(message.content).not.toContain("[Fonte:")
    expect(reply.latencyMs).toBe(25)
  })

  it("treats an answer containing the fallback text as fallback", async () => {
    const { llm, sessions, send } = setup()
    llm.answer = () => `Desculpe. ${FALLBACK_MESSAGE.toUpperCase()}`
    const reply = await send("Como cadastro um restaurante novo?")

    expect(reply.status).toBe("fallback")
    expect(reply.answer).toBe(FALLBACK_MESSAGE)
    expect(reply.sources).toEqual([])
    expect(reply.retrieved).toHaveLength(3)
    expect(sessions.messages[1]?.content).toBe(FALLBACK_MESSAGE)
  })

  it("treats an empty answer as fallback", async () => {
    const { llm, send } = setup()
    llm.answer = () => "   "
    const reply = await send("Quando cai o repasse?")
    expect(reply.status).toBe("fallback")
    expect(reply.answer).toBe(FALLBACK_MESSAGE)
  })

  it("blocks an answer with an output signal and persists the blocked message", async () => {
    const { llm, sessions, send } = setup()
    llm.answer = () => `Bom, ${OUTPUT_BLOCK_SIGNALS[0]} trocar de plano.`
    const reply = await send("Qual plano devo escolher?")

    expect(reply.status).toBe("blocked_output")
    expect(reply.answer).toBe(BLOCKED_OUTPUT_MESSAGE)
    expect(reply.sources).toEqual([])
    expect(sessions.messages[1]).toMatchObject({
      content: BLOCKED_OUTPUT_MESSAGE,
      status: "blocked_output",
      sources: [],
    })
  })

  it("sends the first turn to the rewrite on the second turn and searches with the rewritten query", async () => {
    const { llm, chunks, send } = setup()
    await send("Qual a comissão do plano básico?")
    llm.answer = () => "No outro plano a comissão é diferente."
    const reply = await send("e no outro plano?")

    const rewriteCalls = llm.callsWithSystem(REWRITE_PROMPT)
    expect(rewriteCalls).toHaveLength(1)
    const content = rewriteCalls[0]?.messages[0]?.content ?? ""
    expect(content).toContain("Qual a comissão do plano básico?")
    expect(content).toContain("O repasse é feito conforme o ciclo descrito no portal.")
    expect(content).toContain("e no outro plano?")
    expect(rewriteCalls[0]?.model).toBe(config.models.fast)
    expect(reply.searchQuery).toBe("Pergunta reescrita?")
    expect(chunks.searchQueries).toEqual([
      "Qual a comissão do plano básico?",
      "Pergunta reescrita?",
    ])

    // A geração recebe o 1º turno como histórico e a pergunta original no prompt de RAG.
    const answerCall = llm.answerCalls()[1]
    expect(answerCall?.messages.map((m) => m.role)).toEqual(["user", "assistant", "user"])
    expect(answerCall?.messages[0]?.content).toBe("Qual a comissão do plano básico?")
    expect(answerCall?.messages[2]?.content).toContain("e no outro plano?")
    expect(answerCall?.messages[2]?.content).not.toContain("Pergunta reescrita?")
  })

  it("keeps the original question when the rewrite fails", async () => {
    const { llm, send } = setup()
    await send("Qual a comissão do plano básico?")
    llm.rewrite = () => new LlmUnavailableError("indisponível")
    const reply = await send("e no outro plano?")
    expect(reply.status).toBe("answered")
    expect(reply.searchQuery).toBe("e no outro plano?")
  })

  it("does not rewrite when rewriteQuery is off", async () => {
    const { llm, send } = setup(withRag(config, { rewriteQuery: false }))
    await send("Qual a comissão do plano básico?")
    const reply = await send("e no outro plano?")
    expect(llm.callsWithSystem(REWRITE_PROMPT)).toEqual([])
    expect(reply.searchQuery).toBe("e no outro plano?")
  })

  it("summarizes 17 pending messages up to the 7th and sends the summary to the generation", async () => {
    const { llm, sessions, send } = setup()
    sessions.seed(17)
    const reply = await send("E sobre cancelamentos?")

    expect(sessions.savedSummaries).toEqual([
      { sessionId: SESSION_ID, summary: "Resumo gerado.", untilId: 7 },
    ])
    const summaryCalls = llm.callsWithSystem(SUMMARY_PROMPT)
    expect(summaryCalls).toHaveLength(1)
    expect(summaryCalls[0]?.model).toBe(config.models.fast)
    expect(summaryCalls[0]?.messages[0]?.content).toContain("mensagem antiga 7")
    expect(summaryCalls[0]?.messages[0]?.content).not.toContain("mensagem antiga 8")

    const answerCall = llm.answerCalls()[0]
    expect(answerCall?.system).toContain("Resumo gerado.")
    // recent = mensagens 8 a 17; a 8 é do assistente e é descartada.
    expect(answerCall?.messages).toHaveLength(10)
    expect(answerCall?.messages[0]).toEqual({ role: "user", content: "mensagem antiga 9" })
    expect(reply.status).toBe("answered")
  })

  it("only lists messages after summaryUntilId", async () => {
    const { llm, sessions, send } = setup()
    sessions.seed(17)
    await send("E sobre cancelamentos?")
    // 19 mensagens no total, resumo até a 7: sobram 12 pendentes, sem novo resumo.
    await send("E sobre avaliações?")
    expect(sessions.savedSummaries).toHaveLength(1)
    expect(llm.callsWithSystem(SUMMARY_PROMPT)).toHaveLength(1)
    const rewriteCall = llm.callsWithSystem(REWRITE_PROMPT)[1]
    expect(rewriteCall?.messages[0]?.content).toContain("Resumo gerado.")
  })

  it("keeps answering with the old summary when summarizing fails", async () => {
    const { llm, sessions, send } = setup()
    sessions.seed(17)
    llm.summary = () => new Error("resumo falhou")
    const reply = await send("E sobre cancelamentos?")

    expect(reply.status).toBe("answered")
    expect(sessions.calls).not.toContain("saveSummary")
    expect(sessions.messages).toHaveLength(19)
  })

  it("passes the trimmed profile to touch and to the system instruction", async () => {
    const { llm, sessions, send } = setup()
    await send("Quando cai o repasse?", {
      name: "  Pizzaria Bella ",
      plan: "misto",
      city: " ",
    })

    expect(sessions.touchInputs[0]).toEqual({
      id: SESSION_ID,
      channel: "cli",
      owner: { accountId: null },
      profile: { name: "Pizzaria Bella", plan: "misto" },
    })
    const system = llm.answerCalls()[0]?.system ?? ""
    expect(system).toContain("Perfil do restaurante")
    expect(system).toContain("Nome: Pizzaria Bella")
    expect(system).not.toContain("Cidade:")
  })

  it("uses the stored profile when none is sent", async () => {
    const { llm, sessions, send } = setup()
    await send("Quando cai o repasse?", { name: "Pizzaria Bella" })
    await send("E a taxa?")

    expect(sessions.touchInputs[1]).toEqual({
      id: SESSION_ID,
      channel: "cli",
      owner: { accountId: null },
      profile: undefined,
    })
    expect(llm.answerCalls()[1]?.system).toContain("Nome: Pizzaria Bella")
  })

  it("uses the account profile on the web and never saves it in the conversation", async () => {
    const { llm, sessions, sendRaw } = setup()
    await sendRaw({
      channel: "web",
      accountProfile: { name: " Marmitaria Boa Panela ", plan: "misto", city: " " },
    })

    expect(sessions.touchInputs[0]).toEqual({
      id: SESSION_ID,
      channel: "web",
      owner: { accountId: "conta-a" },
    })
    expect("profile" in (sessions.touchInputs[0] ?? {})).toBe(false)
    const system = llm.answerCalls()[0]?.system ?? ""
    expect(system).toContain("Nome: Marmitaria Boa Panela")
    expect(system).toContain("Plano: Plano Misto")
    expect(system).not.toContain("Cidade:")
  })

  it("throws when the profile source disagrees with the channel", async () => {
    const { sessions, sendRaw } = setup()
    const message = "profile source disagrees with channel"
    await expect(sendRaw({ channel: "web", accountProfile: {}, profile: {} })).rejects.toThrow(
      message,
    )
    await expect(sendRaw({ channel: "web" })).rejects.toThrow(message)
    await expect(sendRaw({ channel: "cli", accountProfile: {} })).rejects.toThrow(message)
    await expect(sendRaw({ channel: "eval", accountProfile: {} })).rejects.toThrow(message)
    expect(sessions.calls).toEqual([])
  })

  it("returns the sum of every call's usage", async () => {
    const { send, sessions } = setup()
    sessions.seed(17)
    const reply = await send("E sobre cancelamentos?")
    // resumo + reescrita + embedding + geração
    expect(reply.usage).toEqual({
      calls: 4,
      inputTokens:
        SUMMARY_USAGE.inputTokens +
        REWRITE_USAGE.inputTokens +
        EMBED_USAGE.inputTokens +
        ANSWER_USAGE.inputTokens,
      outputTokens:
        SUMMARY_USAGE.outputTokens + REWRITE_USAGE.outputTokens + ANSWER_USAGE.outputTokens,
    })
  })

  it("passes the owner to touch, listMessages and appendTurn", async () => {
    const { sessions, sendAs } = setup()
    await sendAs("conta-a", "web")
    expect(sessions.ownerArgs.length).toBeGreaterThanOrEqual(3)
    expect(sessions.ownerArgs.map((entry) => entry.call)).toEqual(
      expect.arrayContaining(["touch", "listMessages", "appendTurn"]),
    )
    for (const entry of sessions.ownerArgs) expect(entry.accountId).toBe("conta-a")
    expect(sessions.sessions.get(SESSION_ID)?.accountId).toBe("conta-a")
  })

  it("passes the owner to saveSummary", async () => {
    const { sessions, sendAs } = setup()
    sessions.seed(17)
    await sendAs(null, "cli", "E sobre cancelamentos?")
    expect(sessions.savedSummaries).toHaveLength(1)
    const saved = sessions.ownerArgs.find((entry) => entry.call === "saveSummary")
    expect(saved?.accountId).toBeNull()
  })

  it("throws when the channel is web without an account", async () => {
    const { sessions, sendAs } = setup()
    await expect(sendAs(null, "web")).rejects.toThrow("channel and accountId disagree")
    expect(sessions.calls).toEqual([])
  })

  it("throws when the channel is cli or eval with an account", async () => {
    const { sessions, sendAs } = setup()
    await expect(sendAs("conta-a", "cli")).rejects.toThrow("channel and accountId disagree")
    await expect(sendAs("conta-a", "eval")).rejects.toThrow("channel and accountId disagree")
    expect(sessions.calls).toEqual([])
  })

  it("does not call touch for blocked input on the web", async () => {
    const { sessions, sendAs } = setup()
    const reply = await sendAs("conta-a", "web", "Meu CPF é 123.456.789-09, pode verificar?")
    expect(reply.status).toBe("blocked_input")
    expect(sessions.calls).toEqual([])
  })

  it("propagates SessionNotFoundError when the conversation belongs to another account", async () => {
    const { sessions, sendAs } = setup()
    await sendAs("conta-a", "web")
    const before = sessions.messages.length
    await expect(sendAs("conta-b", "web")).rejects.toBeInstanceOf(SessionNotFoundError)
    expect(sessions.messages).toHaveLength(before)
  })

  it("propagates generation errors without persisting anything", async () => {
    const { llm, sessions, send } = setup()
    llm.answer = () => new LlmUnavailableError("indisponível")
    await expect(send("Quando cai o repasse?")).rejects.toBeInstanceOf(LlmUnavailableError)
    expect(sessions.messages).toEqual([])
  })
})
