import type { ChatResponse, HistoryMessage, ReplyStatus } from "@/lib/types"

export type UiMessage = {
  key: string
  role: "user" | "assistant"
  content: string
  status: ReplyStatus | null
  sources: string[]
  createdAt: string
  pending?: boolean
}

export type ChatState = {
  messages: UiMessage[]
  sending: boolean
  error: string | null
  notice: string | null
}

export type ChatAction =
  | { type: "history_loaded"; messages: HistoryMessage[] }
  | { type: "send_started"; text: string; now: string }
  | { type: "send_succeeded"; reply: ChatResponse; now: string }
  | { type: "send_failed"; error: string }
  | { type: "reset"; notice?: string }
  | { type: "dismiss" }

export const initialChatState: ChatState = {
  messages: [],
  sending: false,
  error: null,
  notice: null,
}

// Local keys only need to be unique within the list. A removed pending message frees its
// position, so "position at insertion time" never collides with a message still on screen.
function localKey(role: UiMessage["role"], position: number): string {
  return `local-${role}-${position}`
}

function fromHistory(message: HistoryMessage): UiMessage {
  return {
    key: `history-${message.id}`,
    role: message.role,
    content: message.content,
    status: message.status,
    sources: message.sources,
    createdAt: message.createdAt,
  }
}

export function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "history_loaded":
      return { ...state, messages: action.messages.map(fromHistory), sending: false }

    case "send_started": {
      if (state.sending) return state
      const message: UiMessage = {
        key: localKey("user", state.messages.length),
        role: "user",
        content: action.text,
        status: null,
        sources: [],
        createdAt: action.now,
        pending: true,
      }
      return { ...state, messages: [...state.messages, message], sending: true, error: null }
    }

    case "send_succeeded": {
      const confirmed = state.messages.map((message) =>
        message.pending ? { ...message, pending: false } : message,
      )
      const reply: UiMessage = {
        key: localKey("assistant", confirmed.length),
        role: "assistant",
        content: action.reply.answer,
        status: action.reply.status,
        sources: action.reply.sources,
        createdAt: action.now,
      }
      return { ...state, messages: [...confirmed, reply], sending: false }
    }

    case "send_failed":
      return {
        ...state,
        messages: state.messages.filter((message) => !message.pending),
        sending: false,
        error: action.error,
      }

    case "reset":
      return { ...initialChatState, notice: action.notice ?? null }

    case "dismiss":
      return { ...state, error: null, notice: null }
  }
}
