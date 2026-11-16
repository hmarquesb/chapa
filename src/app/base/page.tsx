import type { Metadata } from "next"
import Link from "next/link"
import { RangoLogo } from "@/components/brand/rango-logo"
import { SiteFooter } from "@/components/brand/site-footer"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { documentHref } from "@/lib/knowledge-base"
import { documentOutline, parseMarkdown } from "@/lib/markdown"
import { listKnowledgeDocuments } from "./documents"

export const metadata: Metadata = { title: "Base de conhecimento" }

export default async function KnowledgeBasePage() {
  const documents = (await listKnowledgeDocuments()).map((document) => {
    const outline = documentOutline(parseMarkdown(document.source))
    return {
      fileName: document.fileName,
      title: outline.title ?? document.slug,
      sections: outline.sections,
    }
  })

  return (
    <main className="mx-auto flex w-full max-w-[45rem] flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="self-start rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <RangoLogo size="sm" />
        </Link>
        <h1 className="font-heading text-2xl font-semibold tracking-tight">Base de conhecimento</h1>
        <p className="text-sm">
          Estes são os documentos que o Chapa consulta. Antes de responder, ele busca nesta base os
          trechos que mais combinam com a pergunta e escreve a resposta só com eles. Essa técnica se
          chama RAG, e é por isso que cada resposta mostra de qual documento veio.
        </p>
      </header>
      <ul className="flex flex-col gap-4">
        {documents.map((document) => (
          <li key={document.fileName}>
            <Card>
              <CardHeader>
                <CardTitle>
                  <h2>
                    <Link
                      href={documentHref(document.fileName)}
                      className="rounded-sm underline underline-offset-4 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
                    >
                      {document.title}
                    </Link>
                  </h2>
                </CardTitle>
                {document.sections.length > 0 && (
                  <CardDescription className="text-xs">
                    {document.sections.join(" · ")}
                  </CardDescription>
                )}
              </CardHeader>
            </Card>
          </li>
        ))}
      </ul>
      <p className="text-sm">
        <Link href="/" className="underline underline-offset-4">
          Voltar ao chat
        </Link>
      </p>
      <SiteFooter />
    </main>
  )
}
