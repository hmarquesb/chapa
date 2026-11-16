import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { documentOutline, type MarkdownBlock, type MarkdownInline, parseMarkdown } from "./markdown"

const text = (value: string): MarkdownInline => ({ kind: "text", text: value })
const strong = (value: string): MarkdownInline => ({ kind: "strong", text: value })

describe("parseMarkdown", () => {
  it("reads headings of level 1 to 3", () => {
    expect(parseMarkdown("# Um\n\n## Dois\n\n### Três")).toEqual([
      { kind: "heading", level: 1, content: [text("Um")] },
      { kind: "heading", level: 2, content: [text("Dois")] },
      { kind: "heading", level: 3, content: [text("Três")] },
    ])
  })

  it("turns a level 4 heading into a paragraph with the line text", () => {
    expect(parseMarkdown("#### Quatro")).toEqual([
      { kind: "paragraph", content: [text("#### Quatro")] },
    ])
  })

  it("joins the lines of a paragraph with a space", () => {
    expect(parseMarkdown("Primeira linha\nsegunda linha.\n\nOutro parágrafo.")).toEqual([
      { kind: "paragraph", content: [text("Primeira linha segunda linha.")] },
      { kind: "paragraph", content: [text("Outro parágrafo.")] },
    ])
  })

  it("reads a quote without the > sign", () => {
    expect(
      parseMarkdown("> Política de parceiros da Rango, vigente desde 01/11/2026.\n> Fictícia."),
    ).toEqual([
      {
        kind: "quote",
        content: [text("Política de parceiros da Rango, vigente desde 01/11/2026. Fictícia.")],
      },
    ])
  })

  it("reads a bullet list with - and *", () => {
    expect(parseMarkdown("- um\n* dois")).toEqual([
      { kind: "list", ordered: false, items: [[text("um")], [text("dois")]] },
    ])
  })

  it("reads a numbered list", () => {
    expect(
      parseMarkdown("1. No Painel Rango, abra Promoções > Nova campanha.\n2. Confirme."),
    ).toEqual([
      {
        kind: "list",
        ordered: true,
        items: [[text("No Painel Rango, abra Promoções > Nova campanha.")], [text("Confirme.")]],
      },
    ])
  })

  it("splits a bullet list and a numbered list that follow each other", () => {
    const blocks = parseMarkdown("- a\n1. b")
    expect(blocks).toEqual([
      { kind: "list", ordered: false, items: [[text("a")]] },
      { kind: "list", ordered: true, items: [[text("b")]] },
    ])
  })

  it("reads bold at the start of an item and in the middle of a paragraph", () => {
    expect(
      parseMarkdown(
        "- **Plano Próprio:** a própria loja entrega\n\nO repasse é **semanal** sempre.",
      ),
    ).toEqual([
      {
        kind: "list",
        ordered: false,
        items: [[strong("Plano Próprio:"), text(" a própria loja entrega")]],
      },
      {
        kind: "paragraph",
        content: [text("O repasse é "), strong("semanal"), text(" sempre.")],
      },
    ])
  })

  it("keeps an unpaired ** as text", () => {
    expect(parseMarkdown("Preço **sem par")).toEqual([
      { kind: "paragraph", content: [text("Preço **sem par")] },
    ])
  })

  it("keeps HTML as plain text", () => {
    expect(parseMarkdown("<script>alert(1)</script>")).toEqual([
      { kind: "paragraph", content: [text("<script>alert(1)</script>")] },
    ])
  })

  it("accepts Windows line endings and an empty source", () => {
    expect(parseMarkdown("# Título\r\n\r\nTexto")).toEqual([
      { kind: "heading", level: 1, content: [text("Título")] },
      { kind: "paragraph", content: [text("Texto")] },
    ])
    expect(parseMarkdown("")).toEqual([])
  })
})

describe("documentOutline", () => {
  it("returns the first level 1 title and the level 2 titles in order", () => {
    const blocks = parseMarkdown(
      "# Planos e taxas\n\n## Os **três** planos\n\n### Detalhe\n\n## Comissão",
    )
    expect(documentOutline(blocks)).toEqual({
      title: "Planos e taxas",
      sections: ["Os três planos", "Comissão"],
    })
  })

  it("returns a null title when there is no level 1 heading", () => {
    expect(documentOutline(parseMarkdown("Texto"))).toEqual({ title: null, sections: [] })
  })
})

describe("parseMarkdown on the real knowledge base", () => {
  const KNOWLEDGE_DIR = resolve(__dirname, "../../knowledge-base")

  function plainTexts(blocks: MarkdownBlock[]): string[] {
    return blocks.flatMap((block) => {
      if (block.kind === "list") return block.items.map((item) => item.map((i) => i.text).join(""))
      return [block.content.map((i) => i.text).join("")]
    })
  }

  for (const file of ["01-planos-e-taxas.md", "08-promocoes-e-cupons.md"]) {
    it(`leaves no markdown syntax in ${file}`, () => {
      const blocks = parseMarkdown(readFileSync(resolve(KNOWLEDGE_DIR, file), "utf8"))
      expect(blocks.length).toBeGreaterThan(3)
      for (const value of plainTexts(blocks)) {
        expect(value).not.toContain("**")
        expect(value).not.toMatch(/^(#|>|- |1\. )/)
      }
      expect(blocks[0]?.kind).toBe("heading")
      expect(blocks[1]?.kind).toBe("quote")
      expect(blocks.some((b) => b.kind === "list" && !b.ordered)).toBe(true)
    })
  }

  it("reads the numbered list of 08-promocoes-e-cupons.md", () => {
    const blocks = parseMarkdown(
      readFileSync(resolve(KNOWLEDGE_DIR, "08-promocoes-e-cupons.md"), "utf8"),
    )
    expect(blocks.some((b) => b.kind === "list" && b.ordered)).toBe(true)
  })
})
