import "server-only"
import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"
import { documentSlug, isKnowledgeDocument } from "@/lib/knowledge-base"

// Reads the numbered documents of knowledge-base/, with the same rule as the ingestion.
// The /base pages are static, so this runs only at build time.

export type KnowledgeDocument = { fileName: string; slug: string; source: string }

const KNOWLEDGE_DIR = join(process.cwd(), "knowledge-base")

// Ordenados por nome, que começa pelo número do documento.
export async function listKnowledgeDocuments(): Promise<KnowledgeDocument[]> {
  const names = (await readdir(KNOWLEDGE_DIR)).filter(isKnowledgeDocument).sort()
  return Promise.all(
    names.map(async (fileName) => ({
      fileName,
      slug: documentSlug(fileName),
      source: await readFile(join(KNOWLEDGE_DIR, fileName), "utf8"),
    })),
  )
}

export async function findKnowledgeDocument(slug: string): Promise<KnowledgeDocument | null> {
  const documents = await listKnowledgeDocuments()
  return documents.find((document) => document.slug === slug) ?? null
}
