import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { RangoLogo } from "@/components/brand/rango-logo"
import { SiteFooter } from "@/components/brand/site-footer"
import { ProfileForm } from "@/components/chat/profile-form"
import { getAuthenticatedAccount } from "@/infra/auth"
import { PRIVACY_NOTICE } from "@/lib/sign-in"

export const metadata: Metadata = { title: "Perfil" }

export default async function ProfilePage() {
  const account = await getAuthenticatedAccount()
  if (account === null) redirect("/entrar")
  const firstAccess = account.profile.plan === undefined

  return (
    <main className="mx-auto flex w-full max-w-[40rem] flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <Link
          href="/"
          className="self-start rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <RangoLogo size="sm" />
        </Link>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {firstAccess ? "Conte sobre o seu restaurante" : "Perfil do restaurante"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Ajuda o assistente a adaptar as respostas ao seu restaurante. Só o plano é obrigatório.
        </p>
      </header>
      <ProfileForm profile={account.profile} firstAccess={firstAccess} notice={PRIVACY_NOTICE} />
      <SiteFooter />
    </main>
  )
}
