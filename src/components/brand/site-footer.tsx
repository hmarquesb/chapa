import Link from "next/link"
import { FICTIONAL_COMPANY_NOTICE } from "@/lib/sign-in"

export function SiteFooter({ note }: { note?: string }) {
  return (
    <footer className="border-t pt-4 text-xs text-muted-foreground">
      {FICTIONAL_COMPANY_NOTICE}
      {note !== undefined && ` ${note}`}{" "}
      <Link href="/privacidade" className="underline underline-offset-4">
        Privacidade
      </Link>
      {" · "}
      <Link href="/marca" className="underline underline-offset-4">
        Marca
      </Link>
    </footer>
  )
}
