import type { MarkdownBlock, MarkdownInline } from "@/lib/markdown"

// Draws a parsed knowledge base document with React elements only: the text is never read as HTML.
// The document's level 1 heading is the page's h1.

const HEADING_CLASS = {
  1: "font-heading text-2xl font-semibold tracking-tight",
  2: "pt-2 text-lg font-semibold",
  3: "text-base font-semibold",
} as const

function Inline({ content }: { content: MarkdownInline[] }) {
  return content.map((inline, index) =>
    inline.kind === "strong" ? (
      // biome-ignore lint/suspicious/noArrayIndexKey: static text from the repository; the position is its identity
      <strong key={index} className="font-semibold">
        {inline.text}
      </strong>
    ) : (
      // biome-ignore lint/suspicious/noArrayIndexKey: static text from the repository; the position is its identity
      <span key={index}>{inline.text}</span>
    ),
  )
}

function Block({ block }: { block: MarkdownBlock }) {
  switch (block.kind) {
    case "heading": {
      const Tag = `h${block.level}` as const
      return (
        <Tag className={HEADING_CLASS[block.level]}>
          <Inline content={block.content} />
        </Tag>
      )
    }
    case "paragraph":
      return (
        <p className="text-sm">
          <Inline content={block.content} />
        </p>
      )
    case "quote":
      return (
        <blockquote className="border-l-4 border-border pl-3 text-sm text-muted-foreground">
          <Inline content={block.content} />
        </blockquote>
      )
    case "list": {
      const Tag = block.ordered ? "ol" : "ul"
      return (
        <Tag className={`${block.ordered ? "list-decimal" : "list-disc"} space-y-1 pl-5 text-sm`}>
          {block.items.map((item, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: static text from the repository; the position is its identity
            <li key={index}>
              <Inline content={item} />
            </li>
          ))}
        </Tag>
      )
    }
  }
}

export function MarkdownDocument({ blocks }: { blocks: MarkdownBlock[] }) {
  return (
    <article className="flex flex-col gap-3">
      {blocks.map((block, index) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static text from the repository; the position is its identity
        <Block key={index} block={block} />
      ))}
    </article>
  )
}
