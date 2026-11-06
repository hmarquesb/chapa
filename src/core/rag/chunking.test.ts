import { describe, expect, it } from "vitest"
import { RAG_PRESETS } from "@/config"
import { chunkDocument, chunkFixed, chunkMarkdown, splitText } from "@/core/rag/chunking"

// Texto sem pontuação nem quebra de linha, com letras que mudam a cada posição para que
// cada pedaço possa ser localizado no original.
function plainText(length: number): string {
  const letters = "abcdefghijklmnopqrstuvwxyz"
  let text = ""
  for (let i = 0; i < length; i++) text += letters[i % letters.length]
  return text
}

function sentences(totalLength: number): string {
  const sentence = "O repasse cai na conta da loja toda quarta-feira depois da apuração. "
  return sentence.repeat(Math.ceil(totalLength / sentence.length)).slice(0, totalLength)
}

describe("splitText", () => {
  it("cuts 1000 plain characters into 3 pieces starting at 0, 400 and 800", () => {
    const text = plainText(1000)
    const pieces = splitText(text, { size: 500, overlap: 100, preferBoundaries: false })
    expect(pieces).toHaveLength(3)
    expect(pieces[0]).toBe(text.slice(0, 500))
    expect(pieces[1]).toBe(text.slice(400, 900))
    expect(pieces[2]).toBe(text.slice(800))
  })

  it("throws when overlap is equal to or larger than size", () => {
    expect(() => splitText("abc", { size: 500, overlap: 500, preferBoundaries: false })).toThrow()
    expect(() => splitText("abc", { size: 500, overlap: 600, preferBoundaries: true })).toThrow()
  })

  it("throws when overlap is negative", () => {
    expect(() => splitText("abc", { size: 500, overlap: -1, preferBoundaries: false })).toThrow()
  })

  it("returns [] for empty text", () => {
    expect(splitText("", { size: 500, overlap: 100, preferBoundaries: true })).toEqual([])
  })

  it("returns the whole text when it fits in one window", () => {
    expect(splitText("curto", { size: 500, overlap: 100, preferBoundaries: true })).toEqual([
      "curto",
    ])
  })

  it("does not emit a redundant tail when a window ends exactly at the end", () => {
    const text = plainText(900)
    const pieces = splitText(text, { size: 500, overlap: 100, preferBoundaries: false })
    expect(pieces).toEqual([text.slice(0, 500), text.slice(400, 900)])
  })

  it("with boundaries, backs off to the last blank line inside the final 20% of the window", () => {
    // Parágrafo de 450 caracteres, linha em branco e mais texto.
    const text = `${plainText(450)}\n\n${plainText(300)}`
    const pieces = splitText(text, { size: 500, overlap: 50, preferBoundaries: true })
    expect(pieces[0]).toBe(`${plainText(450)}\n\n`)
    // O próximo pedaço começa "overlap" caracteres antes do corte.
    expect(pieces[1]).toBe(text.slice(452 - 50))
  })

  it("with boundaries, falls back to the last sentence end when there is no blank line", () => {
    const text = sentences(1200)
    const pieces = splitText(text, { size: 500, overlap: 100, preferBoundaries: true })
    expect(pieces.length).toBeGreaterThan(1)
    for (const piece of pieces.slice(0, -1)) {
      expect(piece.endsWith(". ")).toBe(true)
      expect(piece.length).toBeLessThanOrEqual(500)
      expect(piece.length).toBeGreaterThanOrEqual(400)
    }
  })

  it("prefers a blank line over a later sentence end", () => {
    const text = `${"x".repeat(420)}\n\n${"y".repeat(40)}. ${"z".repeat(300)}`
    const pieces = splitText(text, { size: 500, overlap: 0, preferBoundaries: true })
    expect(pieces[0]).toBe(`${"x".repeat(420)}\n\n`)
  })

  it("ignores boundaries outside the final 20% of the window", () => {
    const text = `${"x".repeat(100)}\n\n${"y".repeat(800)}`
    const pieces = splitText(text, { size: 500, overlap: 100, preferBoundaries: true })
    expect(pieces[0]).toBe(text.slice(0, 500))
  })

  it("always makes progress even when the overlap is close to the size", () => {
    const text = `${"a. ".repeat(400)}`
    const pieces = splitText(text, { size: 100, overlap: 95, preferBoundaries: true })
    expect(pieces.length).toBeGreaterThan(1)
    expect(pieces.at(-1)?.endsWith("a. ")).toBe(true)
  })

  it("covers the whole text", () => {
    const text = sentences(3000)
    const pieces = splitText(text, { size: 700, overlap: 120, preferBoundaries: true })
    expect(pieces[0]?.startsWith(text.slice(0, 50))).toBe(true)
    expect(text.endsWith(pieces.at(-1) ?? "")).toBe(true)
  })
})

describe("chunkMarkdown", () => {
  const opts = { size: 1200, overlap: 150 }
  const longBody = sentences(3000)
  const doc = [
    "# Repasse financeiro",
    "",
    "> Fonte: https://exemplo.test/repasse. Consultada em 05/11/2026.",
    "",
    "## Prazos",
    "",
    "O repasse é pago às quartas-feiras.",
    "",
    "## Antecipação",
    "",
    longBody,
    "",
  ].join("\n")

  it("drops the source line, keeps a short section whole and splits a long one", () => {
    const chunks = chunkMarkdown("knowledge-base/02-repasse-financeiro.md", doc, opts)
    for (const chunk of chunks) expect(chunk.content).not.toContain("> Fonte:")

    const short = chunks.filter((chunk) => chunk.section === "Prazos")
    expect(short).toHaveLength(1)
    expect(short[0]?.content).toBe(
      "Repasse financeiro — Prazos\n\nO repasse é pago às quartas-feiras.",
    )

    const long = chunks.filter((chunk) => chunk.section === "Antecipação")
    expect(long.length).toBeGreaterThanOrEqual(3)
    for (const chunk of long) {
      expect(chunk.content.startsWith("Repasse financeiro — Antecipação\n\n")).toBe(true)
    }
  })

  it("uses the file name without directory as source", () => {
    const chunks = chunkMarkdown("knowledge-base/02-repasse-financeiro.md", doc, opts)
    for (const chunk of chunks) expect(chunk.source).toBe("02-repasse-financeiro.md")
  })

  it("does not create a section for the title and the source line alone", () => {
    const chunks = chunkMarkdown("02-repasse-financeiro.md", doc, opts)
    expect(chunks.some((chunk) => chunk.section === "")).toBe(false)
    expect(chunks).toHaveLength(1 + chunks.filter((c) => c.section === "Antecipação").length)
  })

  it("turns text before the first section into the section '' with a title-only header", () => {
    const md = "# Planos\n\n> Fonte: x\n\nTexto de introdução.\n\n## Comissão\n\nDetalhes."
    const chunks = chunkMarkdown("01-planos.md", md, opts)
    expect(chunks[0]).toEqual({
      source: "01-planos.md",
      section: "",
      content: "Planos\n\nTexto de introdução.",
    })
    expect(chunks[1]).toEqual({
      source: "01-planos.md",
      section: "Comissão",
      content: "Planos — Comissão\n\nDetalhes.",
    })
  })

  it("puts everything in the section '' when there is no ## heading", () => {
    const chunks = chunkMarkdown("05-horarios.md", "# Horários\n\nUm parágrafo só.", opts)
    expect(chunks).toEqual([
      { source: "05-horarios.md", section: "", content: "Horários\n\nUm parágrafo só." },
    ])
  })

  it("uses the file name without extension as title when there is no # heading", () => {
    const chunks = chunkMarkdown("dir/07-embalagem.md", "## Lacre\n\nUse lacre.", opts)
    expect(chunks).toEqual([
      {
        source: "07-embalagem.md",
        section: "Lacre",
        content: "07-embalagem — Lacre\n\nUse lacre.",
      },
    ])
  })

  it("discards empty sections", () => {
    const md = "# T\n\n## Vazia\n\n   \n\n## Cheia\n\nConteúdo."
    const chunks = chunkMarkdown("01-t.md", md, opts)
    expect(chunks.map((chunk) => chunk.section)).toEqual(["Cheia"])
  })

  it("keeps ### subheadings inside the section", () => {
    const md = "# T\n\n## Seção\n\n### Sub\n\nTexto."
    const chunks = chunkMarkdown("01-t.md", md, opts)
    expect(chunks).toHaveLength(1)
    expect(chunks[0]?.content).toBe("T — Seção\n\n### Sub\n\nTexto.")
  })

  it("handles Windows line endings", () => {
    const md = "# T\r\n\r\n> Fonte: x\r\n\r\n## Seção\r\n\r\nTexto."
    const chunks = chunkMarkdown("01-t.md", md, opts)
    expect(chunks).toEqual([
      { source: "01-t.md", section: "Seção", content: "T — Seção\n\nTexto." },
    ])
  })
})

describe("chunkFixed", () => {
  it("cuts a 1200-character file into 3 chunks with section '' and no header", () => {
    const text = `# Título\n\n${plainText(1190)}`
    expect(text).toHaveLength(1200)
    const chunks = chunkFixed("knowledge-base/01-a.md", text, { size: 500, overlap: 100 })
    expect(chunks).toHaveLength(3)
    for (const chunk of chunks) {
      expect(chunk.section).toBe("")
      expect(chunk.source).toBe("01-a.md")
    }
    expect(chunks[0]?.content).toBe(text.slice(0, 500))
    expect(text.startsWith(chunks[0]?.content ?? "x")).toBe(true)
  })
})

describe("chunkDocument", () => {
  const md = `# T\n\n> Fonte: x\n\n## Seção\n\n${sentences(700)}`

  it("uses chunkMarkdown for the markdown strategy", () => {
    const chunks = chunkDocument("01-t.md", md, RAG_PRESETS.padrao)
    expect(chunks).toEqual(chunkMarkdown("01-t.md", md, { size: 1200, overlap: 150 }))
    expect(chunks[0]?.section).toBe("Seção")
  })

  it("uses chunkFixed for the fixed strategy", () => {
    const chunks = chunkDocument("01-t.md", md, RAG_PRESETS.baseline)
    expect(chunks).toEqual(chunkFixed("01-t.md", md, { size: 500, overlap: 100 }))
    expect(chunks[0]?.content.startsWith("# T")).toBe(true)
  })
})
