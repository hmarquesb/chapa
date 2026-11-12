"use client"

// The real components with fixed data, for the /marca page. The Composer and the buttons need
// functions, which a server page cannot pass.
import { useState } from "react"
import { ThinkingIndicator } from "@/components/brand/thinking-indicator"
import { Composer } from "@/components/chat/composer"
import { DemoBanner } from "@/components/chat/demo-banner"
import { MessageItem } from "@/components/chat/message-item"
import { Button } from "@/components/ui/button"
import type { UiMessage } from "@/lib/chat-state"

const VARIANTS = ["default", "secondary", "outline", "ghost", "destructive", "link"] as const

const NOW = "2026-01-15T14:30:00.000Z"

const MESSAGES: readonly UiMessage[] = [
  {
    key: "showcase-question",
    role: "user",
    content: "Quando o repasse cai na minha conta?",
    status: null,
    sources: [],
    createdAt: NOW,
  },
  {
    key: "showcase-answer",
    role: "assistant",
    content: "O repasse acontece uma vez por semana, conforme o plano do restaurante.",
    status: "answered",
    sources: ["03-repasse.md", "02-planos-e-taxas.md"],
    createdAt: NOW,
  },
  {
    key: "showcase-greeting",
    role: "assistant",
    // Illustrative text: the real greeting lives in src/core/messages.ts, which components cannot import.
    content: "Bom dia, Marmitaria Boa Panela! Em que posso ajudar?",
    status: "small_talk",
    sources: [],
    createdAt: NOW,
  },
  {
    key: "showcase-fallback",
    role: "assistant",
    // Illustrative text: the real fallback lives in src/core/messages.ts, which components cannot import.
    content: "Não encontrei isso na base de parceiros. Pode reformular a pergunta?",
    status: "fallback",
    sources: [],
    createdAt: NOW,
  },
  {
    key: "showcase-blocked",
    role: "assistant",
    content: "Não posso receber dados sensíveis por aqui. Tente de novo sem o número do cartão.",
    status: "blocked_input",
    sources: [],
    createdAt: NOW,
  },
]

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-heading text-base font-semibold">{title}</h3>
      {children}
    </div>
  )
}

export function BrandShowcase() {
  const [draft, setDraft] = useState("")
  return (
    <div className="flex flex-col gap-8">
      <Group title="Botões">
        <div className="flex flex-wrap gap-2">
          {VARIANTS.map((variant) => (
            <Button key={variant} variant={variant}>
              {variant}
            </Button>
          ))}
        </div>
      </Group>
      <Group title="Mensagens">
        <ul className="flex flex-col gap-4 rounded-2xl border bg-background p-4">
          {MESSAGES.map((message) => (
            <MessageItem key={message.key} message={message} />
          ))}
        </ul>
        <ThinkingIndicator />
      </Group>
      <Group title="Aviso da conta demo">
        <DemoBanner googleEnabled={false} googleAction={async () => {}} />
      </Group>
      <Group title="Campo de mensagem">
        <Composer
          value={draft}
          onChange={setDraft}
          onSubmit={() => {}}
          disabled={false}
          sending={false}
        />
      </Group>
    </div>
  )
}
