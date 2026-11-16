// Which files of knowledge-base/ are documents, and where their public pages live.
// Pure: used by the ingestion (src/core/rag/ingest.ts) and by the /base pages.

export const KNOWLEDGE_BASE_PATH = "/base"

// Só os documentos numerados (01-...md). README.md e regras.yaml ficam de fora.
export const KNOWLEDGE_FILE_PATTERN: RegExp = /^\d{2}-.*\.md$/

export function isKnowledgeDocument(fileName: string): boolean {
  return KNOWLEDGE_FILE_PATTERN.test(fileName)
}

// "01-planos-e-taxas.md" → "01-planos-e-taxas"; aceita um caminho ("knowledge-base/01-…md").
export function documentSlug(fileName: string): string {
  const base = fileName.split("/").pop() ?? fileName
  return base.replace(/\.md$/, "")
}

// "01-planos-e-taxas.md" → "/base/01-planos-e-taxas"
export function documentHref(fileName: string): string {
  return `${KNOWLEDGE_BASE_PATH}/${documentSlug(fileName)}`
}
