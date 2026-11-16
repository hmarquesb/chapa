# Design

## Context

- Os documentos numerados de `knowledge-base/` usam só: título `#`, seções `##` (às vezes `###`), parágrafos, listas `-` e `1.`, citação `>` (o aviso de política na linha 2) e negrito `**…**`. Não usam links, tabelas, crases nem itálico. O `README.md` da pasta tem tabela, mas fica fora das páginas.
- A regra "só os documentos numerados" é o `KNOWLEDGE_FILE_PATTERN` de `src/core/rag/ingest.ts`, importado também por `scripts/eval.ts`, `scripts/eval/questions.test.ts`, `scripts/knowledge-base/knowledge-base.test.ts` e `src/core/rag/ingest.test.ts`. As páginas de `src/app/` não podem importar `src/core/` (tabela de camadas do `AGENTS.md`).
- `/privacidade` e `/marca` já são páginas públicas: Server Components sem `getAuthenticatedAccount`, com `RangoLogo` no cabeçalho e `SiteFooter` no fim. O `SiteFooter` é usado em `/`, `/entrar`, `/perfil`, `/privacidade` e `/marca`.
- O `Badge` do shadcn (`src/components/ui/badge.tsx`) aceita `asChild`. O texto do card de boas-vindas vive em `src/lib/welcome.ts`.
- Next 16, App Router: `params` de página é uma `Promise`.

## Goals / Non-Goals

**Goals:** as páginas da base são estáticas, geradas no build, sem `DATABASE_URL` nem `GEMINI_API_KEY`, e mostram a mesma lista de arquivos que a ingestão.

**Non-Goals:** um conversor de markdown completo. O que a base não usa cai como parágrafo de texto puro.

## Decisions

### 1. A regra dos documentos vai para `src/lib/knowledge-base.ts`

Arquivo novo, puro, sem `node:fs`:

```ts
export const KNOWLEDGE_BASE_PATH = "/base"
// Só os documentos numerados (01-...md). README.md e regras.yaml ficam de fora.
export const KNOWLEDGE_FILE_PATTERN: RegExp = /^\d{2}-.*\.md$/
export function isKnowledgeDocument(fileName: string): boolean
// "01-planos-e-taxas.md" → "01-planos-e-taxas"; aceita um caminho ("knowledge-base/01-…md").
export function documentSlug(fileName: string): string
// "01-planos-e-taxas.md" → "/base/01-planos-e-taxas"
export function documentHref(fileName: string): string
```

`src/core/rag/ingest.ts` passa a importar o `KNOWLEDGE_FILE_PATTERN` daqui e o reexporta, para os quatro importadores atuais não mudarem. O `src/core/` já pode importar funções puras de `src/lib/`. *Alternativa descartada:* copiar a regex na página. Duas regras podiam divergir, e a spec pede a mesma lista da ingestão.

### 2. Conversor próprio em `src/lib/markdown.ts`

```ts
export type MarkdownInline = { kind: "text" | "strong"; text: string }
export type MarkdownBlock =
  | { kind: "heading"; level: 1 | 2 | 3; content: MarkdownInline[] }
  | { kind: "paragraph"; content: MarkdownInline[] }
  | { kind: "quote"; content: MarkdownInline[] }
  | { kind: "list"; ordered: boolean; items: MarkdownInline[][] }

export function parseMarkdown(source: string): MarkdownBlock[]
// Texto puro do primeiro título de nível 1 e dos títulos de nível 2, na ordem.
export function documentOutline(blocks: MarkdownBlock[]): { title: string | null; sections: string[] }
```

Regras: linhas em branco separam blocos; linhas seguidas de um parágrafo ou de uma citação se juntam com espaço; `-`/`*` e `N.` abrem itens; `####` ou mais vira parágrafo com o texto da linha; `**` sem par fica como texto. O resultado é uma árvore de dados, e o componente a desenha com elementos React, nunca com `dangerouslySetInnerHTML`. Por isso o texto com `<` aparece como texto. *Alternativas descartadas:* uma biblioteca de markdown (proibida pelo `AGENTS.md`) e mostrar o `.md` cru num `<pre>` (ilegível para quem não conhece markdown).

### 3. Leitura dos arquivos e geração estática

`src/app/base/documents.ts` (só servidor; lê com `node:fs/promises` a pasta `join(process.cwd(), "knowledge-base")`):

```ts
export type KnowledgeDocument = { fileName: string; slug: string; source: string }
export function listKnowledgeDocuments(): Promise<KnowledgeDocument[]> // ordenados por nome
export function findKnowledgeDocument(slug: string): Promise<KnowledgeDocument | null>
```

- `src/app/base/page.tsx`: lista, com `metadata.title = "Base de conhecimento"`.
- `src/app/base/[documento]/page.tsx`: `generateStaticParams` com os slugs, `dynamicParams = false` (slug desconhecido dá 404 sem ler disco) e `generateMetadata` com o título do documento. `notFound()` cobre o caso de o arquivo sumir.

Como as rotas são estáticas, a leitura acontece só no build, e a Vercel não precisa empacotar a pasta na função. *Alternativa descartada:* importar os `.md` como módulo (pede um loader no `next.config.ts`).

### 4. Componentes

- `src/components/knowledge-base/markdown-document.tsx` (Server Component, sem `"use client"`): recebe `blocks: MarkdownBlock[]` e desenha `h1`–`h3`, `p`, `blockquote`, `ul`/`ol` e `strong`, com as classes de tipografia de `/privacidade` e só tokens de cor. O `h1` do documento é o `h1` da página.
- Na lista de `/base`, cada documento é um `Card` com o título como link (`documentHref`) e as seções numa linha de texto pequeno, separadas por " · ". A introdução explica o RAG em duas ou três frases, sem números de configuração (eles mudam e ficam em `src/config.ts`).
- `src/components/chat/message-item.tsx`: o `SourceBadges` usa `<Badge asChild>` em volta de um `<a href={documentHref(source)} target="_blank" rel="noopener noreferrer">`, mantém o `title` com o nome do arquivo e acrescenta `<span className="sr-only"> (abre em nova aba)</span>`. Um `<a>` simples, e não o `Link` do Next, porque a navegação é para outra aba.
- `src/lib/welcome.ts`: o segundo item de `WELCOME_PARAGRAPHS` muda para o texto do delta de `chat-ui`, e entra
  `export const WELCOME_KNOWLEDGE_BASE = { before: "Quer ver o que ele consulta? Abra a ", link: "Base de conhecimento", after: "." } as const`.
  O `WelcomeDialog` desenha esse parágrafo depois de `WELCOME_OUT_OF_SCOPE`, com o link para `KNOWLEDGE_BASE_PATH` numa aba nova, como no selo.
- `src/components/brand/site-footer.tsx`: `" · "` e o `Link` "Base de conhecimento" para `KNOWLEDGE_BASE_PATH`, depois de "Marca".

## Arquivos

Criados: `src/lib/knowledge-base.ts` e `.test.ts`, `src/lib/markdown.ts` e `.test.ts`, `src/app/base/documents.ts`, `src/app/base/page.tsx`, `src/app/base/[documento]/page.tsx`, `src/components/knowledge-base/markdown-document.tsx`.

Alterados: `src/core/rag/ingest.ts`, `src/lib/welcome.ts`, `src/lib/welcome.test.ts`, `src/components/chat/welcome-dialog.tsx`, `src/components/chat/message-item.tsx`, `src/components/brand/site-footer.tsx`.

Documentos:
- `docs/architecture.md`, seção "Front-end": um item novo sobre `/base` (pública, estática, conversor próprio em `src/lib/markdown.ts`) e, no primeiro item, "as fontes em `Badge`" passa a dizer que cada selo é link para `/base/<arquivo>`.
- `AGENTS.md`, tabela "Onde mexer": linha nova "Página da base de conhecimento", com `src/app/base/`, `src/lib/knowledge-base.ts`, `src/lib/markdown.ts`, `src/components/knowledge-base/` e o cuidado "Elemento de markdown novo num documento: suportar em `parseMarkdown` com teste".
- `docs/qa.md`, "Verificação manual local": item novo **Base de conhecimento**.
- `README.md`, linha da **Demo** (linha 7): cita `/base` ao lado de `/marca`.

## Risks / Trade-offs

- [Um documento novo usa um elemento que o conversor não conhece, como uma tabela] → ele aparece como parágrafo de texto, legível mas feio. O cuidado na tabela "Onde mexer" e o teste com um documento real de cada tipo de bloco reduzem a chance.
- [A página e o RAG ficam fora de sincronia entre o merge e a reingestão] → a página mostra o texto do repositório, e o RAG, o texto ingerido. É o mesmo atraso que já existe hoje entre o merge e a reingestão, e a reingestão continua no fluxo da base.
- [Link em nova aba confunde leitor de tela] → o aviso "(abre em nova aba)" em `sr-only`.
