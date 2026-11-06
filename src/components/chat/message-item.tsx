import { InfoIcon, ShieldAlertIcon } from "lucide-react"
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
        <Badge key={source} variant="secondary" title={source} className="max-w-full">
          <span className="truncate">{formatSourceLabel(source)}</span>
        </Badge>
      ))}
    </div>
  )
}

export function MessageItem({ message }: { message: UiMessage }) {
  if (message.role === "user") {
    return (
      <li className="flex flex-col items-end gap-1">
        <div
          className={cn(
            "max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3 py-2 text-sm text-primary-foreground",
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

  const answered = message.status === "answered" || message.status === null

  return (
    <li className="flex flex-col items-start gap-1">
      {answered ? (
        <Card size="sm" className="max-w-[85%] gap-1 rounded-2xl rounded-bl-sm px-3">
          <p className={TEXT}>
            <span className="sr-only">Chapa: </span>
            {message.content}
          </p>
          {message.sources.length > 0 && <SourceBadges sources={message.sources} />}
        </Card>
      ) : (
        <Alert role="note" className="max-w-[85%] rounded-2xl rounded-bl-sm px-3 py-2">
          {message.status === "fallback" ? (
            <InfoIcon aria-hidden="true" />
          ) : (
            <ShieldAlertIcon aria-hidden="true" />
          )}
          <AlertDescription className={cn("text-foreground", TEXT)}>
            <span className="sr-only">Chapa: </span>
            {message.content}
          </AlertDescription>
        </Alert>
      )}
      <MessageTime iso={message.createdAt} />
    </li>
  )
}
