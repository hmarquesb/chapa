import { CheckIcon } from "lucide-react"
import { ChapaAvatar } from "@/components/brand/chapa-avatar"
import { progressLabel } from "@/lib/progress-steps"
import type { ProgressEvent } from "@/lib/types"

const DELAYS = ["0s", "0.2s", "0.4s"] as const

function Dots() {
  return (
    <span className="flex items-center gap-1 motion-reduce:hidden" aria-hidden="true">
      {DELAYS.map((delay) => (
        <span
          key={delay}
          style={{ animationDelay: delay }}
          className="size-1.5 rounded-full bg-cinnamon-text motion-safe:animate-thinking-dot"
        />
      ))}
    </span>
  )
}

type ThinkingIndicatorProps = {
  // Etapas do turno recebidas da API. Sem etapas, o indicador de sempre.
  steps?: ProgressEvent[]
}

export function ThinkingIndicator({ steps = [] }: ThinkingIndicatorProps) {
  if (steps.length === 0) {
    return (
      <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
        <ChapaAvatar size="sm" decorative />
        <Dots />
        <span className="motion-safe:sr-only">Chapa está pensando…</span>
      </div>
    )
  }

  // Dentro da região de log do MessageList: cada item novo é anunciado uma vez.
  // Cada etapa sai no máximo uma vez por turno, então o nome dela serve de chave.
  const last = steps.length - 1
  return (
    <div className="mt-4 flex items-start gap-2 text-sm text-muted-foreground">
      <ChapaAvatar size="sm" decorative />
      <ol className="flex flex-col gap-1 pt-0.5">
        {steps.map((event, index) => (
          <li key={event.step} className="flex items-center gap-2">
            {index < last ? (
              <CheckIcon aria-hidden="true" className="size-3.5 shrink-0" />
            ) : (
              <Dots />
            )}
            <span className={index === last ? "text-foreground" : undefined}>
              {progressLabel(event)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
