import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { RangoLogo } from "@/components/brand/rango-logo"
import { SiteFooter } from "@/components/brand/site-footer"
import { MarkdownDocument } from "@/components/knowledge-base/markdown-document"
import { KNOWLEDGE_BASE_PATH } from "@/lib/knowledge-base"
import { documentOutline, parseMarkdown } from "@/lib/markdown"
import { findKnowledgeDocument, listKnowledgeDocuments } from "../documents"

type Props = { params: Promise<{ documento: string }> }

// Só os documentos que existem no build: um nome desconhecido dá 404 sem ler o disco.
export const dynamicParams = false

export async function generateStaticParams(): Promise<Array<{ documento: string }>> {
  const documents = await listKnowledgeDocuments()
  return documents.map((document) => ({ documento: document.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { documento } = await params
  const document = await findKnowledgeDocument(documento)
  if (document === null) return {}
  const { title } = documentOutline(parseMarkdown(document.source))
  return { title: title ?? document.slug }
}

export default async function KnowledgeDocumentPage({ params }: Props) {
  const { documento } = await params
  const document = await findKnowledgeDocument(documento)
  if (document === null) notFound()

  return (
    <main className="mx-auto flex w-full max-w-[45rem] flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex flex-col gap-2">
        <Link
          href="/"
          className="self-start rounded-md outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <RangoLogo size="sm" />
        </Link>
        <p className="text-sm">
          <Link href={KNOWLEDGE_BASE_PATH} className="underline underline-offset-4">
            Voltar para a base de conhecimento
          </Link>
        </p>
      </header>
      <MarkdownDocument blocks={parseMarkdown(document.source)} />
      <p className="text-sm">
        <Link href={KNOWLEDGE_BASE_PATH} className="underline underline-offset-4">
          Voltar para a base de conhecimento
        </Link>
      </p>
      <SiteFooter />
    </main>
  )
}
