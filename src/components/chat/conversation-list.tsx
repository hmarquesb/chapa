"use client"

import { PlusIcon, Trash2Icon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatActivity } from "@/lib/format"
import type { ConversationListItem } from "@/lib/types"

type ConversationListProps = {
  items: ConversationListItem[]
  currentId: string | null
  disabled: boolean
  now: Date
  onSelect: (id: string) => void
  onNew: () => void
  onDelete: (id: string) => void
}

export function ConversationList({
  items,
  currentId,
  disabled,
  now,
  onSelect,
  onNew,
  onDelete,
}: ConversationListProps) {
  return (
    <nav aria-label="Conversas" className="flex flex-col gap-3">
      <Button variant="outline" onClick={onNew} disabled={disabled}>
        <PlusIcon aria-hidden="true" />
        Nova conversa
      </Button>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma conversa ainda.</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item) => {
            const isCurrent = item.id === currentId
            return (
              <li
                key={item.id}
                className={`flex items-center gap-1 rounded-md ${isCurrent ? "bg-muted" : ""}`}
              >
                <button
                  type="button"
                  onClick={() => onSelect(item.id)}
                  disabled={disabled}
                  aria-current={isCurrent ? "true" : undefined}
                  className="flex min-w-0 flex-1 touch-manipulation flex-col gap-0.5 rounded-md px-2 py-1.5 text-left outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                >
                  <span className="truncate text-sm font-medium">{item.title}</span>
                  <span className="text-xs text-muted-foreground">
                    {formatActivity(item.lastActivityAt, now)}
                  </span>
                </button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => onDelete(item.id)}
                  disabled={disabled}
                  aria-label={`Apagar conversa: ${item.title}`}
                >
                  <Trash2Icon aria-hidden="true" />
                </Button>
              </li>
            )
          })}
        </ul>
      )}
    </nav>
  )
}
