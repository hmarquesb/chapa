"use client"

import { useEffect, useRef } from "react"
import { ThinkingIndicator } from "@/components/brand/thinking-indicator"
import { MessageItem } from "@/components/chat/message-item"
import type { UiMessage } from "@/lib/chat-state"
import { cn } from "@/lib/utils"

type MessageListProps = {
  messages: UiMessage[]
  sending: boolean
  loading: boolean
}

export function MessageList({ messages, sending, loading }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null)

  // Keeps the latest message (or the thinking indicator) in view.
  useEffect(() => {
    const element = scrollRef.current
    if (!element || (messages.length === 0 && !sending)) return
    element.scrollTop = element.scrollHeight
  }, [messages, sending])

  const empty = messages.length === 0
  // With nothing to show, a bordered box reads as a text field. Keep only the hint until the
  // conversation starts (the log region itself stays, so screen readers announce new messages).
  const idle = empty && !loading && !sending

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
      className={cn(
        "max-h-[60dvh] overflow-y-auto",
        idle ? "px-1" : "min-h-40 rounded-3xl bg-card/60 p-3 sm:p-4",
      )}
    >
      {loading && <p className="text-sm text-muted-foreground">Carregando conversa…</p>}
      {idle && (
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
      {sending && <ThinkingIndicator />}
    </div>
  )
}
