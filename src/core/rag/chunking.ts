import "server-only"
import type { RagConfig } from "@/config"
import type { Chunk } from "@/core/types"

export type ChunkingOptions = { size: number; overlap: number }

// Fração final da janela em que um corte pode recuar até uma fronteira.
const BOUNDARY_ZONE = 0.2
const BOUNDARIES = ["\n\n", ". "] as const

// Posição (relativa ao texto inteiro) logo depois da última fronteira dentro dos 20% finais
// da janela [start, end). Devolve null se não houver nenhuma nessa faixa.
function boundaryCut(text: string, start: number, end: number, size: number): number | null {
  const window = text.slice(start, end)
  const minIndex = size - Math.floor(size * BOUNDARY_ZONE)
  for (const boundary of BOUNDARIES) {
    const index = window.lastIndexOf(boundary)
    if (index >= 0 && index + boundary.length >= minIndex) {
      return start + index + boundary.length
    }
  }
  return null
}

export function splitText(
  text: string,
  opts: ChunkingOptions & { preferBoundaries: boolean },
): string[] {
  const { size, overlap, preferBoundaries } = opts
  if (overlap < 0 || overlap >= size) {
    throw new Error(
      `Fatiamento inválido: overlap precisa ser maior ou igual a 0 e menor que size ` +
        `(recebido: overlap ${overlap}, size ${size}).`,
    )
  }

  const pieces: string[] = []
  let start = 0
  while (start < text.length) {
    const end = start + size
    if (end >= text.length) {
      pieces.push(text.slice(start))
      break
    }
    const cut = (preferBoundaries ? boundaryCut(text, start, end, size) : null) ?? end
    pieces.push(text.slice(start, cut))
    // Garante avanço mesmo quando o corte recuou e o overlap é quase do tamanho da janela.
    start = Math.max(cut - overlap, start + 1)
  }
  return pieces
}

function baseName(path: string): string {
  return path.split(/[\\/]/).pop() ?? path
}

function withoutExtension(name: string): string {
  const dot = name.lastIndexOf(".")
  return dot > 0 ? name.slice(0, dot) : name
}

type Section = { title: string; lines: string[] }

export function chunkMarkdown(source: string, markdown: string, opts: ChunkingOptions): Chunk[] {
  const file = baseName(source)
  let title: string | null = null
  const sections: Section[] = [{ title: "", lines: [] }]

  for (const line of markdown.replace(/\r\n?/g, "\n").split("\n")) {
    if (title === null && line.startsWith("# ")) {
      title = line.slice(2).trim()
      continue
    }
    if (line.startsWith("> Fonte:")) continue
    if (line.startsWith("## ")) {
      sections.push({ title: line.slice(3).trim(), lines: [] })
      continue
    }
    sections.at(-1)?.lines.push(line)
  }

  const docTitle = title ?? withoutExtension(file)
  const chunks: Chunk[] = []
  for (const section of sections) {
    const body = section.lines.join("\n").trim()
    if (body === "") continue
    const header = section.title === "" ? `${docTitle}\n\n` : `${docTitle} — ${section.title}\n\n`
    const pieces =
      body.length <= opts.size ? [body] : splitText(body, { ...opts, preferBoundaries: true })
    for (const piece of pieces) {
      const content = piece.trim()
      if (content === "") continue
      chunks.push({ source: file, section: section.title, content: header + content })
    }
  }
  return chunks
}

// Estratégia ingênua do preset baseline: janelas fixas sobre o arquivo inteiro, sem cabeçalho.
export function chunkFixed(source: string, text: string, opts: ChunkingOptions): Chunk[] {
  const file = baseName(source)
  return splitText(text, { ...opts, preferBoundaries: false })
    .filter((piece) => piece.trim() !== "")
    .map((piece) => ({ source: file, section: "", content: piece }))
}

export function chunkDocument(source: string, text: string, rag: RagConfig): Chunk[] {
  const opts = { size: rag.chunkSize, overlap: rag.chunkOverlap }
  return rag.chunkStrategy === "markdown"
    ? chunkMarkdown(source, text, opts)
    : chunkFixed(source, text, opts)
}
