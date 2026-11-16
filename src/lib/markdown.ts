// Small markdown reader for the knowledge base pages. It covers only what the documents use:
// headings 1 to 3, paragraphs, quotes, bullet and numbered lists and **bold**. Anything else
// stays as plain text. The result is data: the page draws it with React elements, never as HTML.

export type MarkdownInline = { kind: "text" | "strong"; text: string }
export type MarkdownBlock =
  | { kind: "heading"; level: 1 | 2 | 3; content: MarkdownInline[] }
  | { kind: "paragraph"; content: MarkdownInline[] }
  | { kind: "quote"; content: MarkdownInline[] }
  | { kind: "list"; ordered: boolean; items: MarkdownInline[][] }

const HEADING = /^(#{1,3})\s+(.*)$/
const QUOTE = /^>\s?(.*)$/
const BULLET = /^[-*]\s+(.*)$/
const NUMBERED = /^\d+\.\s+(.*)$/

type Open =
  | { kind: "paragraph" | "quote"; lines: string[] }
  | { kind: "list"; ordered: boolean; items: string[] }

export function parseInline(source: string): MarkdownInline[] {
  const result: MarkdownInline[] = []
  const pushText = (value: string) => {
    if (value === "") return
    const last = result[result.length - 1]
    if (last?.kind === "text") last.text += value
    else result.push({ kind: "text", text: value })
  }

  let rest = source
  while (rest !== "") {
    const start = rest.indexOf("**")
    const end = start === -1 ? -1 : rest.indexOf("**", start + 2)
    if (start === -1 || end === -1 || end === start + 2) {
      pushText(rest)
      break
    }
    pushText(rest.slice(0, start))
    result.push({ kind: "strong", text: rest.slice(start + 2, end) })
    rest = rest.slice(end + 2)
  }
  return result
}

export function parseMarkdown(source: string): MarkdownBlock[] {
  const blocks: MarkdownBlock[] = []
  let open: Open | null = null

  const close = () => {
    if (open === null) return
    if (open.kind === "list") {
      blocks.push({ kind: "list", ordered: open.ordered, items: open.items.map(parseInline) })
    } else {
      blocks.push({ kind: open.kind, content: parseInline(open.lines.join(" ")) })
    }
    open = null
  }

  for (const rawLine of source.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (line === "") {
      close()
      continue
    }

    const heading = HEADING.exec(line)
    if (heading) {
      close()
      const level = (heading[1] ?? "#").length as 1 | 2 | 3
      blocks.push({ kind: "heading", level, content: parseInline(heading[2] ?? "") })
      continue
    }

    const quote = QUOTE.exec(line)
    if (quote) {
      if (open?.kind !== "quote") {
        close()
        open = { kind: "quote", lines: [] }
      }
      open.lines.push(quote[1] ?? "")
      continue
    }

    const bullet = BULLET.exec(line)
    const numbered = bullet ? null : NUMBERED.exec(line)
    const item = bullet ?? numbered
    if (item) {
      const ordered = numbered !== null
      if (open?.kind !== "list" || open.ordered !== ordered) {
        close()
        open = { kind: "list", ordered, items: [] }
      }
      open.items.push(item[1] ?? "")
      continue
    }

    if (open?.kind === "list") {
      // A plain line right after an item continues that item.
      const last = open.items.length - 1
      open.items[last] = `${open.items[last] ?? ""} ${line}`
      continue
    }
    if (open?.kind !== "paragraph") {
      close()
      open = { kind: "paragraph", lines: [] }
    }
    open.lines.push(line)
  }
  close()
  return blocks
}

function plainText(content: MarkdownInline[]): string {
  return content.map((inline) => inline.text).join("")
}

// Texto puro do primeiro título de nível 1 e dos títulos de nível 2, na ordem.
export function documentOutline(blocks: MarkdownBlock[]): {
  title: string | null
  sections: string[]
} {
  let title: string | null = null
  const sections: string[] = []
  for (const block of blocks) {
    if (block.kind !== "heading") continue
    if (block.level === 1 && title === null) title = plainText(block.content)
    else if (block.level === 2) sections.push(plainText(block.content))
  }
  return { title, sections }
}
