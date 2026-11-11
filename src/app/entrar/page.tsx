import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { signInAsDemo, signInWithGoogle } from "@/app/auth-actions"
import { SignInPanel } from "@/components/auth/sign-in-panel"
import { RangoLogo } from "@/components/brand/rango-logo"
import { SiteFooter } from "@/components/brand/site-footer"
import { ThemeToggle } from "@/components/brand/theme-toggle"
import { getAuthenticatedAccount, isGoogleEnabled } from "@/infra/auth"
import { signInErrorMessage } from "@/lib/sign-in"

export const metadata: Metadata = { title: "Entrar" }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function first(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value
}

export default async function SignInPage({ searchParams }: { searchParams: SearchParams }) {
  if ((await getAuthenticatedAccount()) !== null) redirect("/")

  const params = await searchParams
  const error = signInErrorMessage({
    erro: first(params.erro),
    error: first(params.error),
    code: first(params.code),
  })

  return (
    <main className="relative mx-auto flex w-full max-w-[26.25rem] flex-1 flex-col justify-center gap-6 px-4 py-10">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <header className="flex flex-col gap-1">
        <RangoLogo size="lg" />
        <h1 className="font-heading text-3xl font-extrabold tracking-tight">Chapa</h1>
        <p className="text-sm font-medium">Assistente de parceiros da Rango</p>
        <p className="text-sm text-muted-foreground">
          Tire dúvidas sobre taxas, repasse, cancelamentos, cardápio e avaliações.
        </p>
      </header>
      <SignInPanel
        googleEnabled={isGoogleEnabled()}
        error={error}
        demoAction={signInAsDemo}
        googleAction={signInWithGoogle}
      />
      <SiteFooter />
    </main>
  )
}
