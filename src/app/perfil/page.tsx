import type { Metadata } from "next"
import Link from "next/link"
import { redirect } from "next/navigation"
import { ProfileForm } from "@/components/chat/profile-form"
import { getAuthenticatedAccount } from "@/infra/auth"
import { PRIVACY_NOTICE } from "@/lib/sign-in"

export const metadata: Metadata = { title: "Perfil · Chapa" }

export default async function ProfilePage() {
  const account = await getAuthenticatedAccount()
  if (account === null) redirect("/entrar")
  const firstAccess = account.profile.plan === undefined

  return (
    <main className="mx-auto flex w-full max-w-[40rem] flex-1 flex-col gap-6 px-4 py-10">
      <header className="flex flex-col gap-1">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          {firstAccess ? "Conte sobre o seu restaurante" : "Perfil do restaurante"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Ajuda o assistente a adaptar as respostas ao seu restaurante. Só o plano é obrigatório.
        </p>
      </header>
      <ProfileForm profile={account.profile} firstAccess={firstAccess} notice={PRIVACY_NOTICE} />
      <p className="text-xs text-muted-foreground">
        <Link href="/privacidade" className="underline underline-offset-4">
          Privacidade
        </Link>
      </p>
    </main>
  )
}
