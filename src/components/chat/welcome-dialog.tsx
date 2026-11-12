"use client"

import { ChapaAvatar } from "@/components/brand/chapa-avatar"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  WELCOME_CONFIRM,
  WELCOME_OUT_OF_SCOPE,
  WELCOME_PARAGRAPHS,
  WELCOME_TITLE,
  WELCOME_TOPICS,
  WELCOME_TOPICS_INTRO,
} from "@/lib/welcome"

type WelcomeDialogProps = { open: boolean; onOpenChange: (open: boolean) => void }

export function WelcomeDialog({ open, onOpenChange }: WelcomeDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        aria-describedby={undefined}
        className="max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] rounded-3xl shadow-raised"
      >
        <DialogHeader>
          <ChapaAvatar size="md" decorative />
          <DialogTitle className="font-heading font-semibold">{WELCOME_TITLE}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 overflow-y-auto text-sm">
          {WELCOME_PARAGRAPHS.map((paragraph) => (
            <p key={paragraph}>{paragraph}</p>
          ))}
          <p>{WELCOME_TOPICS_INTRO}</p>
          <ul className="flex list-disc flex-col gap-1 pl-5">
            {WELCOME_TOPICS.map((topic) => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
          <p>{WELCOME_OUT_OF_SCOPE}</p>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>{WELCOME_CONFIRM}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
