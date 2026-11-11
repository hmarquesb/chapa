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

const SOCIAL_TITLE = "Chapa, o assistente de parceiros da Rango"
const DESCRIPTION =
  "Assistente com RAG para restaurantes parceiros da Rango, uma empresa de delivery fictícia: taxas, repasse, cancelamentos, cardápio e avaliações, com as fontes de cada resposta. Projeto de estudo."

// metadataBase is left unset: Next builds the absolute og:image address from
// VERCEL_PROJECT_PRODUCTION_URL (production), the branch URL (previews) or localhost.
export const metadata: Metadata = {
  title: { default: "Chapa", template: "%s · Chapa" },
  description: DESCRIPTION,
  // No page leaks its address (and any query string) in a Referer header.
  referrer: "no-referrer",
  openGraph: {
    type: "website",
    locale: "pt_BR",
    siteName: "Chapa",
    title: SOCIAL_TITLE,
    description: DESCRIPTION,
  },
  twitter: { card: "summary_large_image", title: SOCIAL_TITLE, description: DESCRIPTION },
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
