import { describe, expect, it } from "vitest"
import { type ChatState, chatReducer, initialChatState } from "@/lib/chat-state"
import type { HistoryMessage } from "@/lib/types"

const T1 = "2026-11-06T14:05:00.000Z"
const T2 = "2026-11-06T14:05:07.000Z"
const SID = "3f1c2b8e-9a4d-4c1e-8f7a-1b2c3d4e5f60"

function sent(text = "Quando o repasse cai?"): ChatState {
  return chatReducer(initialChatState, { type: "send_started", text, now: T1 })
}

describe("initialChatState", () => {
  it("starts empty and idle", () => {
    expect(initialChatState).toEqual({ messages: [], sending: false, error: null, notice: null })
  })
})

describe("chatReducer", () => {
  it("send_started appends one pending user message and turns sending on", () => {
    const state = sent()
    expect(state.sending).toBe(true)
    expect(state.messages).toHaveLength(1)
    expect(state.messages[0]).toMatchObject({
      role: "user",
      content: "Quando o repasse cai?",
      status: null,
      sources: [],
      createdAt: T1,
      pending: true,
    })
    expect(state.messages[0]?.key).toBeTruthy()
  })

  it("send_started clears a previous error", () => {
    const failed = chatReducer(sent(), { type: "send_failed", error: "Falhou" })
    const again = chatReducer(failed, { type: "send_started", text: "De novo", now: T2 })
    expect(again.error).toBeNull()
  })

  it("send_started is ignored while another message is being sent", () => {
    const state = sent()
    expect(chatReducer(state, { type: "send_started", text: "Outra", now: T2 })).toBe(state)
  })

  it("send_succeeded confirms the user message and appends the assistant reply", () => {
    const state = chatReducer(sent(), {
      type: "send_succeeded",
      reply: {
        status: "answered",
        answer: "Cai em até 30 dias.",
        sources: ["02-repasse.md"],
        sessionId: SID,
      },
      now: T2,
    })
    expect(state.sending).toBe(false)
    expect(state.messages).toHaveLength(2)
    expect(state.messages[0]?.pending).toBeFalsy()
    expect(state.messages[1]).toMatchObject({
      role: "assistant",
      content: "Cai em até 30 dias.",
      status: "answered",
      sources: ["02-repasse.md"],
      createdAt: T2,
    })
    expect(state.messages[1]?.pending).toBeFalsy()
    expect(state.messages[0]?.key).not.toBe(state.messages[1]?.key)
  })

  it("send_succeeded keeps the status of non-answered replies", () => {
    const state = chatReducer(sent("Receita de lasanha?"), {
      type: "send_succeeded",
      reply: { status: "fallback", answer: "Não sei.", sources: [], sessionId: SID },
      now: T2,
    })
    expect(state.messages[1]).toMatchObject({ status: "fallback", sources: [] })
  })

  it("send_failed removes the pending message, turns sending off and sets the error", () => {
    const state = chatReducer(sent(), { type: "send_failed", error: "Muitas mensagens." })
    expect(state.messages).toEqual([])
    expect(state.sending).toBe(false)
    expect(state.error).toBe("Muitas mensagens.")
  })

  it("send_failed keeps the confirmed messages", () => {
    const first = chatReducer(sent("Primeira"), {
      type: "send_succeeded",
      reply: { status: "answered", answer: "Resposta", sources: [], sessionId: SID },
      now: T2,
    })
    const second = chatReducer(first, { type: "send_started", text: "Segunda", now: T2 })
    const failed = chatReducer(second, { type: "send_failed", error: "Erro" })
    expect(failed.messages.map((m) => m.content)).toEqual(["Primeira", "Resposta"])
  })

  it("keeps message keys unique across a failed and a retried send", () => {
    const first = chatReducer(sent("Primeira"), {
      type: "send_succeeded",
      reply: { status: "answered", answer: "Resposta", sources: [], sessionId: SID },
      now: T2,
    })
    const failed = chatReducer(
      chatReducer(first, { type: "send_started", text: "Segunda", now: T2 }),
      { type: "send_failed", error: "Erro" },
    )
    const retried = chatReducer(
      chatReducer(failed, { type: "send_started", text: "Segunda", now: T2 }),
      {
        type: "send_succeeded",
        reply: { status: "answered", answer: "Ok", sources: [], sessionId: SID },
        now: T2,
      },
    )
    const keys = retried.messages.map((m) => m.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it("history_loaded replaces the messages with the server history", () => {
    const history: HistoryMessage[] = [
      {
        id: 7,
        role: "user",
        content: "Oi",
        status: null,
        sources: [],
        createdAt: T1,
      },
      {
        id: 8,
        role: "assistant",
        content: "Olá!",
        status: "answered",
        sources: ["01-taxas.md"],
        createdAt: T2,
      },
    ]
    const state = chatReducer(sent("Local"), { type: "history_loaded", messages: history })
    expect(state.messages).toHaveLength(2)
    expect(state.messages[0]).toMatchObject({ role: "user", content: "Oi", createdAt: T1 })
    expect(state.messages[1]).toMatchObject({
      role: "assistant",
      content: "Olá!",
      status: "answered",
      sources: ["01-taxas.md"],
    })
    expect(state.messages.every((m) => !m.pending)).toBe(true)
    expect(state.messages[0]?.key).not.toBe(state.messages[1]?.key)
    expect(state.sending).toBe(false)
  })

  it("reset clears everything and can carry a notice", () => {
    const busy = chatReducer(sent(), { type: "send_failed", error: "Erro" })
    expect(chatReducer(busy, { type: "reset" })).toEqual(initialChatState)
    expect(chatReducer(busy, { type: "reset", notice: "Começamos uma nova." })).toEqual({
      ...initialChatState,
      notice: "Começamos uma nova.",
    })
  })

  it("dismiss clears the error and the notice but keeps the messages", () => {
    const withBoth: ChatState = { ...sent(), error: "Erro", notice: "Aviso" }
    const state = chatReducer(withBoth, { type: "dismiss" })
    expect(state.error).toBeNull()
    expect(state.notice).toBeNull()
    expect(state.messages).toEqual(withBoth.messages)
  })
})
