import { InfoIcon } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

// Server component: texto fixo da spec chat-ui, com o link para a tela de perfil.
export function ProfileReviewBanner() {
  return (
    <div
      role="note"
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl bg-accent px-4 py-2.5 text-sm text-accent-foreground"
    >
      <InfoIcon aria-hidden="true" className="size-4 shrink-0" />
      <p className="flex-1">Atualizamos o formulário do perfil. Revise seus dados.</p>
      <Button asChild size="sm" variant="outline">
        <Link href="/perfil">Revisar perfil</Link>
      </Button>
    </div>
  )
}
