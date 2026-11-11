import { ChapaAvatar } from "@/components/brand/chapa-avatar"

const DELAYS = ["0s", "0.2s", "0.4s"] as const

export function ThinkingIndicator() {
  return (
    <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
      <ChapaAvatar size="sm" decorative />
      <span className="flex items-center gap-1 motion-reduce:hidden" aria-hidden="true">
        {DELAYS.map((delay) => (
          <span
            key={delay}
            style={{ animationDelay: delay }}
            className="size-1.5 rounded-full bg-cinnamon-text motion-safe:animate-thinking-dot"
          />
        ))}
      </span>
      <span className="motion-safe:sr-only">Chapa está pensando…</span>
    </div>
  )
}
