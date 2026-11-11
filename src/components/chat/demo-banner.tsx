import { InfoIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DEMO_BANNER_TEXT } from "@/lib/sign-in"

type DemoBannerProps = { googleEnabled: boolean; googleAction: () => Promise<void> }

// Server component: fixed text, and the Google button only when Google is configured.
export function DemoBanner({ googleEnabled, googleAction }: DemoBannerProps) {
  return (
    <div
      role="note"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-accent px-4 py-2.5 text-sm text-accent-foreground"
    >
      <InfoIcon aria-hidden="true" className="size-4 shrink-0" />
      <p className="flex-1">{DEMO_BANNER_TEXT}</p>
      {googleEnabled && (
        <form action={googleAction}>
          <Button type="submit" size="sm" variant="outline">
            Entrar com Google
          </Button>
        </form>
      )}
    </div>
  )
}
