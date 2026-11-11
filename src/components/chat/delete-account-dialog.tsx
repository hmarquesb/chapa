"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteAccount } from "@/lib/api-client"

type DeleteAccountDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  signOutAction: () => Promise<void>
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
  signOutAction,
}: DeleteAccountDialogProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function confirm(): Promise<void> {
    setBusy(true)
    setError(null)
    const result = await deleteAccount()
    if (result.ok || result.status === 401) {
      await signOutAction()
      return
    }
    setBusy(false)
    setError(result.error)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return
        if (!next) setError(null)
        onOpenChange(next)
      }}
    >
      <DialogContent showCloseButton={false} className="rounded-3xl shadow-raised">
        <DialogHeader>
          <DialogTitle className="font-heading font-semibold">Excluir minha conta</DialogTitle>
          <DialogDescription>
            Excluir sua conta? A conta, o perfil e todas as conversas são apagados na hora e não
            podem ser recuperados.
          </DialogDescription>
        </DialogHeader>
        {error !== null && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={() => void confirm()} disabled={busy}>
            {busy ? "Excluindo…" : "Excluir conta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
