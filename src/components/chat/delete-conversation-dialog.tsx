"use client"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type DeleteConversationDialogProps = {
  open: boolean
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function DeleteConversationDialog({
  open,
  busy,
  onConfirm,
  onCancel,
}: DeleteConversationDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && !busy && onCancel()}>
      <DialogContent showCloseButton={false} className="rounded-3xl shadow-raised">
        <DialogHeader>
          <DialogTitle className="font-heading font-semibold">Apagar conversa</DialogTitle>
          <DialogDescription>
            Apagar esta conversa? Ela some da lista e não pode ser recuperada.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={busy}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={onConfirm} disabled={busy}>
            Apagar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
