"use client"

import { CopyIcon } from "lucide-react"
import { useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { buildContinueLink } from "@/lib/session-id"

type CopyState = "idle" | "copied" | "manual"

const COPY_MESSAGES: Record<CopyState, string> = {
  idle: "",
  copied: "Link copiado",
  manual:
    "Não consegui copiar automaticamente. O link está selecionado: copie com Ctrl+C (ou Cmd+C).",
}

export function ContinueDialog({ sessionId }: { sessionId: string | null }) {
  const [open, setOpen] = useState(false)
  const [link, setLink] = useState("")
  const [copyState, setCopyState] = useState<CopyState>("idle")
  const inputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()

  function handleOpenChange(next: boolean): void {
    if (next && sessionId !== null) {
      setLink(buildContinueLink(window.location.origin, sessionId))
      setCopyState("idle")
    }
    setOpen(next)
  }

  async function copyLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(link)
      setCopyState("copied")
    } catch {
      // No Clipboard API (insecure context) or permission denied: select the text instead.
      inputRef.current?.focus()
      inputRef.current?.select()
      setCopyState("manual")
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline" disabled={sessionId === null}>
          Continuar depois
        </Button>
      </DialogTrigger>
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Continuar depois</DialogTitle>
          <DialogDescription>
            Guarde este link para continuar a conversa em outro dispositivo. Quem tiver o link
            consegue ler a conversa. Ela é apagada depois de 7 dias sem uso.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={inputId}>Link da conversa</Label>
          <Input
            id={inputId}
            ref={inputRef}
            value={link}
            readOnly
            onFocus={(event) => event.currentTarget.select()}
          />
        </div>
        <p aria-live="polite" className="min-h-5 text-sm">
          {COPY_MESSAGES[copyState]}
        </p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Fechar</Button>
          </DialogClose>
          <Button onClick={() => void copyLink()}>
            <CopyIcon aria-hidden="true" />
            Copiar link
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
