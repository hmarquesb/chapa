"use client"

import { type KeyboardEvent, useEffect, useId, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type ComposerProps = {
  value: string
  onChange: (value: string) => void
  onSubmit: () => void
  disabled: boolean
  sending: boolean
}

export function Composer({ value, onChange, onSubmit, disabled, sending }: ComposerProps) {
  const id = useId()
  const hintId = useId()
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const wasSending = useRef(false)

  // The field is disabled while sending, which drops the focus. Give it back afterwards.
  useEffect(() => {
    if (wasSending.current && !sending) textareaRef.current?.focus()
    wasSending.current = sending
  }, [sending])

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>): void {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    if (!disabled) onSubmit()
  }

  return (
    <form
      className="flex flex-col gap-1.5"
      onSubmit={(event) => {
        event.preventDefault()
        if (!disabled) onSubmit()
      }}
    >
      <Label htmlFor={id} className="sr-only">
        Sua pergunta
      </Label>
      <div className="flex items-end gap-2">
        <Textarea
          id={id}
          ref={textareaRef}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          rows={2}
          placeholder="Escreva sua dúvida…"
          aria-describedby={hintId}
          className="max-h-48 min-h-16 min-w-0 flex-1 resize-none rounded-3xl px-4 shadow-soft focus-visible:shadow-raised"
        />
        <Button
          type="submit"
          size="lg"
          className="rounded-full px-5"
          disabled={disabled || value.trim() === ""}
        >
          Enviar
        </Button>
      </div>
      <p id={hintId} className="text-xs text-muted-foreground">
        Enter envia. Shift+Enter quebra a linha.
      </p>
    </form>
  )
}
