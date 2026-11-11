"use client"

import { CircleAlertIcon } from "lucide-react"
import { useFormStatus } from "react-dom"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { PRIVACY_NOTICE } from "@/lib/sign-in"

type SignInPanelProps = {
  googleEnabled: boolean
  error: string | null
  demoAction: () => Promise<void>
  googleAction: () => Promise<void>
}

function SubmitButton({
  label,
  pendingLabel,
  variant,
}: {
  label: string
  pendingLabel: string
  variant: "default" | "outline"
}) {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="lg" variant={variant} className="w-full" disabled={pending}>
      {pending ? pendingLabel : label}
    </Button>
  )
}

export function SignInPanel({ googleEnabled, error, demoAction, googleAction }: SignInPanelProps) {
  return (
    <div className="flex flex-col gap-4">
      {error !== null && (
        <Alert>
          <CircleAlertIcon aria-hidden="true" />
          <AlertDescription className="text-foreground">{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-col gap-2">
        <form action={demoAction}>
          <SubmitButton label="Testar como demo" pendingLabel="Entrando…" variant="default" />
        </form>
        {googleEnabled && (
          <form action={googleAction}>
            <SubmitButton
              label="Entrar com Google"
              pendingLabel="Abrindo o Google…"
              variant="outline"
            />
          </form>
        )}
      </div>
      <p className="rounded-2xl bg-card p-4 text-xs text-muted-foreground shadow-soft">
        {PRIVACY_NOTICE}
      </p>
    </div>
  )
}
