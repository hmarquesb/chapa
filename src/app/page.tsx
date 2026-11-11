import Link from "next/link"
import { redirect } from "next/navigation"
import { signInWithGoogle, signOutOfAccount } from "@/app/auth-actions"
import { AccountMenu } from "@/components/chat/account-menu"
import { ChatApp } from "@/components/chat/chat-app"
import { DemoBanner } from "@/components/chat/demo-banner"
import { ProfileSummary } from "@/components/chat/profile-summary"
import { getAuthenticatedAccount, isGoogleEnabled } from "@/infra/auth"
import { DEMO_ACCOUNT_LABEL } from "@/lib/sign-in"

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ sessao?: string | string[] }>
}) {
  const account = await getAuthenticatedAccount()
  if (account === null) redirect("/entrar")
  // Old continuation links (/?sessao=<id>) no longer open anything: drop the parameter.
  if ((await searchParams).sessao !== undefined) redirect("/")
  if (account.profile.plan === undefined) redirect("/perfil")

  const isDemo = account.kind === "demo"
  const label = isDemo ? DEMO_ACCOUNT_LABEL : (account.email ?? DEMO_ACCOUNT_LABEL)

  return (
    <div className="mx-auto flex w-full max-w-[62.5rem] flex-1 flex-col gap-6 px-4 py-6 sm:py-10">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Chapa</h1>
          <p className="text-sm text-muted-foreground">
            Tire dúvidas sobre taxas, repasse, cancelamentos, cardápio e avaliações.
          </p>
          <ProfileSummary profile={account.profile} />
        </div>
        <AccountMenu label={label} signOutAction={signOutOfAccount} />
      </header>
      {isDemo && <DemoBanner googleEnabled={isGoogleEnabled()} googleAction={signInWithGoogle} />}
      <main className="flex flex-1 flex-col">
        <ChatApp />
      </main>
      <footer className="border-t pt-4 text-xs text-muted-foreground">
        Projeto de estudo, não oficial e sem afiliação com nenhuma empresa de delivery. As conversas
        são apagadas depois de 30 dias sem uso. Não envie dados pessoais.{" "}
        <Link href="/privacidade" className="underline underline-offset-4">
          Privacidade
        </Link>
      </footer>
    </div>
  )
}
