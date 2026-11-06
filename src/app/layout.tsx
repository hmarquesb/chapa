import type { Metadata } from "next"
import type { ReactNode } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "Chapa",
  description:
    "Assistente para restaurantes parceiros de apps de delivery tirarem dúvidas sobre taxas, repasse, cancelamentos, cardápio e avaliações. Projeto de estudo, não oficial.",
  // The continuation link (/?sessao=<id>) is a credential: never leak it in a Referer header.
  referrer: "no-referrer",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
