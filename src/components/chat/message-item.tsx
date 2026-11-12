import { InfoIcon, ShieldAlertIcon } from "lucide-react"
import { ChapaAvatar } from "@/components/brand/chapa-avatar"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import type { UiMessage } from "@/lib/chat-state"
import { formatSourceLabel, formatTime } from "@/lib/format"
import { cn } from "@/lib/utils"

const TEXT = "whitespace-pre-wrap [overflow-wrap:anywhere]"

function MessageTime({ iso, pending }: { iso: string; pending?: boolean }) {
  const time = formatTime(iso)
  return (
    <span className="px-1 text-xs text-muted-foreground">
      {time !== "" && <time dateTime={iso}>{time}</time>}
      {pending && <span>{time !== "" ? " · " : ""}enviando…</span>}
    </span>
  )
}

function SourceBadges({ sources }: { sources: string[] }) {
  const unique = [...new Set(sources)]
  return (
    <div className="flex flex-wrap items-center gap-1.5 pt-1">
      <span className="text-xs text-muted-foreground">Fontes:</span>
      {unique.map((source) => (
        <Badge
          key={source}
          variant="secondary"
          title={source}
          className="max-w-full bg-accent text-accent-foreground"
        >
          <span className="truncate">{formatSourceLabel(source)}</span>
        </Badge>
      ))}
    </div>
  )
}

export function MessageItem({ message }: { message: UiMessage }) {
  if (message.role === "user") {
    return (
      <li className="flex animate-message-in flex-col items-end gap-1">
        <div
          className={cn(
            "max-w-[85%] rounded-3xl rounded-br-md bg-secondary px-4 py-2.5 text-sm text-secondary-foreground",
            TEXT,
            message.pending && "opacity-70",
          )}
        >
          <span className="sr-only">Você: </span>
          {message.content}
        </div>
        <MessageTime iso={message.createdAt} pending={message.pending} />
      </li>
    )
  }

  const answered =
    message.status === "answered" || message.status === "small_talk" || message.status === null

  return (
    <li className="flex animate-message-in items-start gap-2">
      <ChapaAvatar size="sm" decorative className="mt-1" />
      <div className="flex min-w-0 max-w-[85%] flex-col items-start gap-1">
        {answered ? (
          <Card size="sm" className="gap-1 rounded-3xl rounded-tl-md px-4 shadow-soft">
            <p className={TEXT}>
              <span className="sr-only">Chapa: </span>
              {message.content}
            </p>
            {message.sources.length > 0 && <SourceBadges sources={message.sources} />}
          </Card>
        ) : (
          <Alert
            role="note"
            className={cn(
              "rounded-3xl rounded-tl-md border-0 px-4 py-2.5",
              message.status === "fallback" ? "bg-muted" : "bg-accent",
            )}
          >
            {message.status === "fallback" ? (
              <InfoIcon aria-hidden="true" className="text-muted-foreground" />
            ) : (
              <ShieldAlertIcon aria-hidden="true" className="text-cinnamon-text" />
            )}
            <AlertDescription className={cn("text-foreground", TEXT)}>
              <span className="sr-only">Chapa: </span>
              {message.content}
            </AlertDescription>
          </Alert>
        )}
        <MessageTime iso={message.createdAt} />
      </div>
    </li>
  )
}
