import { CircleAlertIcon, InfoIcon } from "lucide-react"
import { Alert, AlertAction, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

type StatusBannerProps = {
  error: string | null
  notice: string | null
  onDismiss: () => void
}

export function StatusBanner({ error, notice, onDismiss }: StatusBannerProps) {
  if (error === null && notice === null) return null

  return (
    <div className="flex flex-col gap-2">
      {notice !== null && (
        <Alert role="status">
          <InfoIcon aria-hidden="true" />
          <AlertDescription className="text-foreground">{notice}</AlertDescription>
          <AlertAction>
            <Button variant="ghost" size="xs" onClick={onDismiss}>
              Fechar aviso
            </Button>
          </AlertAction>
        </Alert>
      )}
      {error !== null && (
        <Alert>
          <CircleAlertIcon aria-hidden="true" />
          <AlertDescription className="text-foreground">{error}</AlertDescription>
          <AlertAction>
            <Button variant="ghost" size="xs" onClick={onDismiss}>
              Fechar aviso
            </Button>
          </AlertAction>
        </Alert>
      )}
    </div>
  )
}
