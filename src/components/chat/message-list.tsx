"use client"

import { useEffect, useRef } from "react"
import { MessageItem } from "@/components/chat/message-item"
import type { UiMessage } from "@/lib/chat-state"

type MessageListProps = {
  messages: UiMessage[]
  sending: boolean
  loading: boolean
}

export function MessageList({ messages, sending, loading }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Keeps the latest message (or the "Digitando…" line) in view.
  useEffect(() => {
    const element = scrollRef.current
    if (!element || (messages.length === 0 && !sending)) return
    element.scrollTop = element.scrollHeight
  }, [messages, sending])

  const empty = messages.length === 0

  return (
    <div
      ref={scrollRef}
      role="log"
      aria-live="polite"
      aria-label="Conversa"
      aria-busy={loading || sending}
      // Focusable so keyboard users can scroll the conversation.
      // biome-ignore lint/a11y/noNoninteractiveTabindex: scrollable region must be reachable by keyboard
      tabIndex={0}
      className="max-h-[60dvh] min-h-40 overflow-y-auto rounded-xl border bg-muted/30 p-3 sm:p-4"
    >
      {loading && <p className="text-sm text-muted-foreground">Carregando conversa…</p>}
      {!loading && empty && !sending && (
        <p className="text-sm text-muted-foreground">
          Faça uma pergunta sobre a operação do seu restaurante ou escolha um exemplo abaixo.
        </p>
      )}
      {!empty && (
        <ul className="flex flex-col gap-4">
          {messages.map((message) => (
            <MessageItem key={message.key} message={message} />
          ))}
        </ul>
      )}
      {sending && <p className="mt-4 animate-pulse text-sm text-muted-foreground">Digitando…</p>}
    </div>
  )
}
