import type { Metadata } from "next"
import { Bricolage_Grotesque, Figtree } from "next/font/google"
import type { ReactNode } from "react"
import { THEME_INIT_SCRIPT } from "@/lib/theme"
import "./globals.css"

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "800"],
  display: "swap",
  variable: "--font-bricolage",
})

const figtree = Figtree({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
  variable: "--font-figtree",
})

export const metadata: Metadata = {
  title: "Chapa",
  description:
    "Assistente para restaurantes parceiros de apps de delivery tirarem dúvidas sobre taxas, repasse, cancelamentos, cardápio e avaliações. Projeto de estudo, não oficial.",
  // No page leaks its address (and any query string) in a Referer header.
  referrer: "no-referrer",
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="pt-BR"
      className={`${bricolage.variable} ${figtree.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: constant from the code, nothing from the user; it must run before first paint to avoid a theme flash. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        {children}
      </body>
    </html>
  )
}
