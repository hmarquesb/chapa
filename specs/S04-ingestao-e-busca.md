# S04 — Ingestão e busca híbrida

| Campo | Valor |
|---|---|
| **ID** | S04 |
| **Status** | ✅ Aprovada |
| **Depende de** | S01, S03 (para rodar a ingestão real, também S02 com H3 e o banco `dev` com H2) |
| **Chamadas reais de API** | Só com autorização: `npm run ingest` no `dev` (cerca de 1 a 3 chamadas de embedding em lote por preset) |

## Escopo

Transforma os documentos de `knowledge-base/` em trechos com fonte e seção, gera os embeddings e grava no banco. Do lado da consulta, implementa a recuperação: embedding da pergunta, busca no SQL e ranking híbrido em TS.

**Entrega:**
- Fatiamento por seção (`markdown`) e por tamanho fixo (`fixed`), em funções puras.
- Ranking híbrido puro (`rankChunks`).
- `ingestDocuments` e `retrieve` no núcleo, recebendo dependências por parâmetro.
- `scripts/ingest.ts`, com `--preset baseline|padrao`.

**Fora do escopo:**
- Guardrails, prompts, memória e geração da resposta (S05).
- Schema e SQL (S03).

**Arquivos que podem ser criados ou alterados:**
- `src/core/rag/chunking.ts` (+ `.test.ts`)
- `src/core/rag/rank.ts` (+ `.test.ts`)
- `src/core/rag/ingest.ts` (+ `.test.ts`)
- `src/core/rag/retrieve.ts` (+ `.test.ts`)
- `scripts/ingest.ts`
- `scripts/lib/args.ts` (+ `.test.ts`): parser de argumentos compartilhado pelos scripts
- Remover `scripts/.gitkeep`

**Não tocar:**
- `src/core/types.ts`, `src/core/errors.ts`, `src/lib/` (S00)
- `src/config.ts`, `src/infra/` (S01, S03)
- `knowledge-base/` (S02)

## Contexto

- Seções do `ARCHITECTURE.md`: "Arquitetura do projeto" (fluxo: embedding → busca híbrida) e "Banco de dados" (busca híbrida).
- Problema que resolve: a recuperação é a parte do RAG que mais pesa na qualidade. Trechos com o título do documento e da seção no início ajudam tanto o embedding quanto a busca por palavras.
- Decisões já tomadas:
  - O SQL devolve `semantic` e `keyword` por trecho. Uma função pura em TS combina com `alpha`, filtra por `minScore` e corta em `topK`. Isso deixa o ranking testável sem banco.
  - Embeddings de documento usam a tarefa `"document"` e o da pergunta usa `"query"`.
  - Cada conjunto de trechos é identificado por `{ embeddingModel, chunkConfig }`, com `chunkConfig = chunkConfigKey(rag)`. A ingestão substitui só o conjunto daquele preset, e a busca só lê esse conjunto.
  - O preset `baseline` (fatia fixa por caracteres) existe para a comparação da avaliação. O `padrao` (por seção) é o de produção.

### Contratos

**Dona:**

```ts
// src/core/rag/chunking.ts
export type ChunkingOptions = { size: number; overlap: number }
export function splitText(text: string, opts: ChunkingOptions & { preferBoundaries: boolean }): string[]
export function chunkMarkdown(source: string, markdown: string, opts: ChunkingOptions): Chunk[]
export function chunkFixed(source: string, text: string, opts: ChunkingOptions): Chunk[]
export function chunkDocument(source: string, text: string, rag: RagConfig): Chunk[] // escolhe pela estratégia

// src/core/rag/rank.ts
export function hybridScore(semantic: number, keyword: number, alpha: number): number
export function rankChunks(
  candidates: ChunkCandidate[],
  opts: { alpha: number; minScore: number; topK: number },
): RetrievedChunk[]

// src/core/rag/ingest.ts
export type SourceDocument = { name: string; content: string }
export const KNOWLEDGE_FILE_PATTERN: RegExp // /^\d{2}-.*\.md$/
export function ingestDocuments(input: {
  documents: SourceDocument[]
  config: AppConfig
  llm: LlmClient
  chunks: ChunkRepository
}): Promise<{ perFile: Array<{ name: string; chunks: number }>; total: number; key: ChunkSetKey; usage: Usage }>

// src/core/rag/retrieve.ts
export function retrieve(input: {
  query: string
  config: AppConfig
  llm: LlmClient
  chunks: ChunkRepository
}): Promise<{ results: RetrievedChunk[]; usage: Usage }>

// scripts/lib/args.ts
export function parseArgs(argv: string[]): { flags: Record<string, string | true>; positionals: string[] }
```

**Usa:**

```ts
// src/core/types.ts (S00)
export type Chunk = { source: string; section: string; content: string }
export type ChunkSetKey = { embeddingModel: string; chunkConfig: string }
export type ChunkCandidate = Chunk & { id: number; semantic: number; keyword: number }
export type RetrievedChunk = ChunkCandidate & { score: number }
export interface ChunkRepository {
  replaceAll(key: ChunkSetKey, chunks: Array<Chunk & { embedding: number[] }>): Promise<number>
  search(input: { key: ChunkSetKey; embedding: number[]; query: string; limit: number }): Promise<ChunkCandidate[]>
  count(key: ChunkSetKey): Promise<number>
}
export interface LlmClient {
  generate(input: GenerateInput): Promise<{ text: string; usage: Usage }>
  embed(input: { model: string; texts: string[]; task: "query" | "document"; dimensions: number }):
    Promise<{ vectors: number[][]; usage: Usage }>
}

// src/config.ts (S01)
export type RagConfig = {
  topK: number; minScore: number; alpha: number; candidateLimit: number
  chunkStrategy: "markdown" | "fixed"; chunkSize: number; chunkOverlap: number; rewriteQuery: boolean
}
export type AppConfig = { models: { chat; fast; embedding; embeddingDimensions }; rag: RagConfig; ... }
export const RAG_PRESETS: { padrao: RagConfig; baseline: RagConfig }
export const config: AppConfig
export function withRag(base: AppConfig, overrides: Partial<RagConfig>): AppConfig
export function chunkConfigKey(rag: RagConfig): string

// src/infra (S01, S03), usados só no script
getLlmClient(); getSql(); createChunkRepository(sql); closeSql()
```

## Requisitos funcionais

### RF1. `splitText`

Corta `text` em janelas de até `size` caracteres, avançando `size - overlap` a cada passo. Com `preferBoundaries: true`, cada corte (exceto o último) recua para o último `\n\n` ou, se não houver, para o último `". "` dentro dos 20% finais da janela. Se não houver nenhum dos dois nessa faixa, corta em `size`. Lança `Error` se `overlap >= size` ou `overlap < 0`. Texto vazio devolve `[]`.

- **Critério de aceite:** Dado um texto de 1000 caracteres sem pontuação, `size: 500`, `overlap: 100` e `preferBoundaries: false`, então devolve 3 pedaços que começam nas posições 0, 400 e 800. Dado `overlap: 500, size: 500`, então lança erro.

### RF2. `chunkMarkdown`

1. O título é a primeira linha que começa com `# `. Sem título, usa o nome do arquivo sem extensão.
2. Linhas que começam com `> Fonte:` são descartadas.
3. O texto é dividido em seções `## `. O que vem antes da primeira seção (fora o título e a fonte) vira a seção `""`, se não estiver vazio.
4. Uma seção com até `size` caracteres vira 1 trecho. Uma seção maior é dividida com `splitText(..., preferBoundaries: true)`.
5. Todo trecho começa com o cabeçalho `"<Título> — <Seção>\n\n"` (ou `"<Título>\n\n"` quando a seção é `""`).
6. Trechos vazios ou só com espaços são descartados.
7. `source` é o nome do arquivo (sem diretório) e `section` é o texto do `## ` sem o marcador.

- **Critério de aceite:** Dado um documento com título, linha de fonte, uma seção curta e uma seção de 3000 caracteres, com `size: 1200`, então: nenhum trecho contém `> Fonte:`; a seção curta gera 1 trecho; a longa gera pelo menos 3; todos começam com `"<Título> — <Seção>\n\n"`. Um documento sem `##` gera trechos com `section: ""`.

### RF3. `chunkFixed`

Aplica `splitText(text, { size, overlap, preferBoundaries: false })` sobre o arquivo inteiro, sem tratamento (é a estratégia ingênua do preset `baseline`). Todo trecho tem `section: ""` e nenhum cabeçalho.

- **Critério de aceite:** Dado um arquivo de 1200 caracteres com `size: 500, overlap: 100`, então gera 3 trechos com `section: ""`, e o primeiro começa com o mesmo texto do arquivo.

### RF4. `rankChunks`

Para cada candidato, `score = hybridScore(semantic, keyword, alpha) = alpha * semantic + (1 - alpha) * keyword`. Mantém só os com `score >= minScore`, ordena por `score` decrescente (desempate: `semantic` decrescente, depois `id` crescente) e devolve os `topK` primeiros, com o campo `score`. Não altera o array de entrada.

- **Critério de aceite:** Dados 4 candidatos feitos à mão, `alpha: 0.7`, `minScore: 0.5` e `topK: 2`, então o resultado tem os 2 maiores scores acima de 0.5, na ordem certa. Com `minScore: 0.99`, devolve `[]`.

### RF5. `retrieve`

1. `llm.embed({ model: config.models.embedding, texts: [query], task: "query", dimensions: config.models.embeddingDimensions })`.
2. `chunks.search({ key, embedding, query, limit: config.rag.candidateLimit })`, com `key = { embeddingModel: config.models.embedding, chunkConfig: chunkConfigKey(config.rag) }`.
3. `rankChunks` com `alpha`, `minScore` e `topK` de `config.rag`.
4. Devolve `{ results, usage }`, com o `usage` do embedding.

- **Critério de aceite:** Dados um `LlmClient` falso e um `ChunkRepository` falso, quando `retrieve` roda, então o `search` recebeu a `key` com o `chunkConfig` do preset e o `limit` igual a `candidateLimit`, e o resultado já vem ranqueado.

### RF6. `ingestDocuments`

1. Considera só documentos cujo `name` casa com `KNOWLEDGE_FILE_PATTERN`, em ordem alfabética. Lança `Error("Nenhum documento encontrado em knowledge-base/")` se sobrar nenhum.
2. Gera os trechos com `chunkDocument` e o `config.rag`.
3. Gera todos os embeddings com uma chamada a `llm.embed(..., task: "document")`. O cliente já divide em lotes.
4. Chama `chunks.replaceAll(key, ...)` uma vez, com todos os trechos.
5. Devolve a contagem por arquivo, o total, a `key` usada e o `usage`.

- **Critério de aceite:** Dados 3 documentos (`01-a.md`, `02-b.md`, `FONTES.md`) e fakes, quando `ingestDocuments` roda, então o `FONTES.md` é ignorado, `replaceAll` é chamado 1 vez com a `key` do preset, e `perFile` lista só `01-a.md` e `02-b.md`.

### RF7. `scripts/ingest.ts`

```bash
npm run ingest                      # preset padrao
npm run ingest -- --preset baseline
```

- Lê os arquivos de `knowledge-base/` (só o nome e o conteúdo), monta o `config` com `withRag(config, RAG_PRESETS[preset])` e chama `ingestDocuments` com `getLlmClient()` e `createChunkRepository(getSql())`.
- Imprime uma linha por arquivo (`02-repasse-financeiro.md: 6 trechos`), o total, o modelo de embedding, o `chunkConfig` e o host do banco (só o host, nunca a URL com senha).
- Preset desconhecido: mensagem de erro e código de saída 1.
- Chama `closeSql()` no final, com sucesso ou erro.

- **Critério de aceite:** *(Com autorização, depois de H2 e H3)* `npm run ingest` grava os trechos dos 7 documentos no `dev`. Rodar de novo mantém o mesmo total (`count`). `npm run ingest -- --preset baseline` grava outro conjunto sem apagar o primeiro.

### RF8. `scripts/lib/args.ts`

Parser mínimo: `--chave valor` vira `flags.chave = "valor"`, `--flag` sozinho vira `true`, `--no-flag` vira `flags.flag = "false"`, o resto vai para `positionals`. Usado também pelos scripts `chat` e `eval`.

- **Critério de aceite:** Dado `["--preset", "baseline", "--debug", "a"]`, então devolve `{ flags: { preset: "baseline", debug: true }, positionals: ["a"] }`.

## Requisitos não funcionais

- **RNF1. Testes:** `npm test`, `npm run typecheck` e `npm run lint` passam sem rede e sem banco, usando `LlmClient` e `ChunkRepository` falsos. *Verificação:* rodar com `env -i PATH="$PATH" HOME="$HOME"`.
- **RNF2. Núcleo sem infraestrutura:** `src/core/rag/` não importa nada de `src/infra/`, `next` ou SDKs. *Verificação:* `grep -rn "@/infra\|from \"next\|@google/genai\|from \"postgres" src/core` volta vazio.
- **RNF3. Custo:** a ingestão faz no máximo `ceil(total de trechos / embedBatchSize)` chamadas de embedding. *Verificação:* o script imprime `usage.calls` no final.
- **RNF4. Segurança:** o script nunca imprime `DATABASE_URL` nem a chave. *Verificação:* leitura do código e da saída.

## Você deve

- Seguir as regras do `AGENTS.md` e as camadas descritas no `ARCHITECTURE.md`.
- Começar os arquivos de `src/core/rag/` com `import "server-only"`.
- Escrever o teste antes da implementação em `chunking`, `rank`, `ingest`, `retrieve` e `args`.
- Rodar `npm test`, `npm run typecheck` e `npm run lint` antes de entregar.
- Entregar um relatório com: arquivos alterados, cada critério de aceite com a evidência (comando + saída resumida), desvios da spec e pendências humanas.

## Você não deve

- Editar arquivos fora da lista de "Arquivos que podem ser criados ou alterados".
- Adicionar dependências.
- Combinar scores no SQL ou buscar sem filtrar por `embeddingModel` e `chunkConfig`.
- Rodar `npm run ingest` sem autorização ou apontando para o `prod`.
- Fazer commit ou push.

## Tecnologias

| Tecnologia | Uso nesta spec |
|---|---|
| TypeScript | Fatiamento, ranking e orquestração |
| Vitest | Testes com fakes |
| tsx | Script de ingestão |
| `node:fs/promises` | Ler `knowledge-base/` no script |
