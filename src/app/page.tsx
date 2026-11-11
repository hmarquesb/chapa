import { redirect } from "next/navigation"
import { signInWithGoogle, signOutOfAccount } from "@/app/auth-actions"
import { AccountMenu } from "@/components/chat/account-menu"
import { ChatApp } from "@/components/chat/chat-app"
import { DemoBanner } from "@/components/chat/demo-banner"
import { getAuthenticatedAccount, isGoogleEnabled } from "@/infra/auth"
import { DEMO_ACCOUNT_LABEL } from "@/lib/sign-in"

export default async function Home() {
  const account = await getAuthenticatedAccount()
  if (account === null) redirect("/entrar")

  const isDemo = account.kind === "demo"
  const label = isDemo ? DEMO_ACCOUNT_LABEL : (account.email ?? DEMO_ACCOUNT_LABEL)

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-1 flex-col gap-6 px-4 py-6 sm:py-10">
      <header className="flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">Chapa</h1>
          <p className="text-sm text-muted-foreground">
            Tire dúvidas sobre taxas, repasse, cancelamentos, cardápio e avaliações.
          </p>
        </div>
        <AccountMenu label={label} signOutAction={signOutOfAccount} />
      </header>
      {isDemo && <DemoBanner googleEnabled={isGoogleEnabled()} googleAction={signInWithGoogle} />}
      <main className="flex flex-1 flex-col">
        <ChatApp />
      </main>
      <footer className="border-t pt-4 text-xs text-muted-foreground">
        Projeto de estudo, não oficial e sem afiliação com nenhuma empresa de delivery. As conversas
        são apagadas depois de 7 dias sem uso. Não envie dados pessoais.
      </footer>
    </div>
  )
}
