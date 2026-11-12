// Avaliação do assistente (S08, RF4).
// ⚠️ Chama a API do Gemini e grava sessões no banco do DATABASE_URL: rode só com autorização (H4).
// npm run eval -- --label v1 --preset baseline
// npm run eval -- --label v2 --preset padrao [--judge] [--delay-ms 4000] [--only 1,5,16]
// npm run eval -- --label v3 --preset padrao --delay-ms 4000 --append --only 101,102 (rodada em blocos)
// npm run eval -- --label v4-regras --preset padrao --router off (só a regra local de cumprimento)
// npm run eval -- --label teste-minscore --preset padrao --min-score 0.45 --only 3,9
// npm run eval -- --label v5-baseline --preset padrao --context chunks (trechos em vez de documentos)
// npm run eval -- --label teste-docs --preset padrao --max-docs 2 --only 3,9
// npm run eval -- --compare eval/resultados/v1.json eval/resultados/v2.json
import { execFileSync } from "node:child_process"
import { randomUUID } from "node:crypto"
import { mkdir, readdir, readFile, writeFile } from "node:fs/promises"
import { join, resolve } from "node:path"
import {
  type AppConfig,
  chunkConfigKey,
  config,
  RAG_PRESETS,
  type RagConfig,
  withRag,
} from "@/config"
import { createAssistant } from "@/core/assistant"
import { LlmQuotaError, LlmRequestError, LlmUnavailableError } from "@/core/errors"
import { KNOWLEDGE_FILE_PATTERN } from "@/core/rag/ingest"
import type { ContextBlock, RetrievedChunk } from "@/core/types"
import { closeSql, createChunkRepository, createSessionRepository, getSql } from "@/infra/db"
import { getLlmClient } from "@/infra/llm"
import { mergeRuns, parseStoredRun, sameRunConfig } from "./eval/append"
import { renderComparison } from "./eval/compare"
import { judgeAnswer } from "./eval/judge"
import { aggregate, type QuestionResult, scoreQuestion } from "./eval/metrics"
import { type EvalQuestion, runQuestions, validateQuestions } from "./eval/questions"
import { type EvalRun, formatPercent, renderReport, routerMaxWords } from "./eval/report"
import { parseArgs } from "./lib/args"

const ROOT = process.cwd()
const QUESTIONS_FILE = resolve(ROOT, "eval", "perguntas.json")
const RESULTS_DIR = resolve(ROOT, "eval", "resultados")
const KNOWLEDGE_DIR = resolve(ROOT, "knowledge-base")
const DEFAULT_DELAY_MS = 4000
const CHUNK_PREVIEW_CHARS = 150
const LABEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]*$/

type PresetName = keyof typeof RAG_PRESETS
type Flags = Record<string, string | true>

// Erro de uso: a mensagem já é a explicação para quem rodou o comando.
class UsageError extends Error {
  override name = "UsageError"
}

function isPreset(value: string | true | undefined): value is PresetName {
  return typeof value === "string" && Object.hasOwn(RAG_PRESETS, value)
}

// Só o host do banco, nunca a URL (que tem usuário e senha).
function databaseHost(): string {
  try {
    return new URL(process.env.DATABASE_URL ?? "").hostname || "desconhecido"
  } catch {
    return "desconhecido"
  }
}

function commitHash(): string {
  try {
    const hash = execFileSync("git", ["rev-parse", "--short", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim()
    return hash === "" ? "sem-git" : hash
  } catch {
    return "sem-git"
  }
}

function stringFlag(flags: Flags, name: string): string | undefined {
  const value = flags[name]
  if (value === true) throw new UsageError(`A flag --${name} precisa de um valor.`)
  return value
}

function numberFlag(flags: Flags, name: string, integer: boolean): number | undefined {
  const raw = stringFlag(flags, name)
  if (raw === undefined) return undefined
  const value = Number(raw)
  if (raw.trim() === "" || !Number.isFinite(value) || (integer && !Number.isInteger(value))) {
    const kind = integer ? "um número inteiro" : "um número (use ponto: 0.45)"
    throw new UsageError(`--${name} precisa ser ${kind} (recebido: ${raw}).`)
  }
  return value
}

// Flags de ajuste aplicadas com withRag sobre o preset.
function ragOverrides(flags: Flags): Partial<RagConfig> {
  const overrides: Partial<RagConfig> = {}
  const topK = numberFlag(flags, "top-k", true)
  const minScore = numberFlag(flags, "min-score", false)
  const alpha = numberFlag(flags, "alpha", false)
  const maxDocs = numberFlag(flags, "max-docs", true)
  const contextMode = stringFlag(flags, "context")
  if (topK !== undefined) overrides.topK = topK
  if (minScore !== undefined) overrides.minScore = minScore
  if (alpha !== undefined) overrides.alpha = alpha
  if (maxDocs !== undefined) overrides.maxContextDocs = maxDocs
  if (contextMode !== undefined) {
    if (contextMode !== "chunks" && contextMode !== "documents") {
      throw new UsageError(`--context aceita chunks ou documents (recebido: ${contextMode}).`)
    }
    overrides.contextMode = contextMode
  }
  if (flags.rewrite === "false") overrides.rewriteQuery = false
  else if (flags.rewrite !== undefined) {
    throw new UsageError("Para desligar a reescrita, use --no-rewrite.")
  }
  return overrides
}

// --router on|off; sem a flag, ligado no padrao e desligado no baseline.
function routerFlag(flags: Flags, preset: PresetName): boolean {
  const raw = stringFlag(flags, "router")
  if (raw === undefined) return preset === "padrao"
  if (raw !== "on" && raw !== "off") {
    throw new UsageError(`--router aceita on ou off (recebido: ${raw}).`)
  }
  return raw === "on"
}

function buildConfig(
  preset: PresetName,
  overrides: Partial<RagConfig>,
  routerEnabled: boolean,
): AppConfig {
  try {
    const withPreset = withRag(withRag(config, RAG_PRESETS[preset]), overrides)
    return { ...withPreset, router: { ...config.router, enabled: routerEnabled } }
  } catch (error) {
    // withRag explica o campo inválido em PT-BR.
    throw new UsageError(error instanceof Error ? error.message : String(error))
  }
}

function parseOnly(flags: Flags, questions: EvalQuestion[]): EvalQuestion[] {
  const raw = stringFlag(flags, "only")
  if (raw === undefined) return questions
  const ids = raw.split(",").map((part) => part.trim())
  const byId = new Map(questions.map((question) => [String(question.id), question]))
  const unknown = ids.filter((id) => !byId.has(id))
  if (ids.length === 0 || unknown.length > 0) {
    throw new UsageError(
      `--only precisa de ids existentes separados por vírgula (desconhecidos: ${unknown.join(", ") || "nenhum"}).`,
    )
  }
  const wanted = new Set(ids)
  return questions.filter((question) => wanted.has(String(question.id)))
}

// --append não leva valor: "--append 101" deixaria o 101 sem sentido.
function appendFlag(flags: Flags): boolean {
  const value = flags.append
  if (value === undefined) return false
  if (value !== true) throw new UsageError("A flag --append não leva valor.")
  return true
}

function isMissingFile(error: unknown): boolean {
  return error instanceof Error && (error as NodeJS.ErrnoException).code === "ENOENT"
}

// Rodada gravada com o mesmo rótulo, para o --append. Sem arquivo: null (primeiro bloco).
// Roda antes de abrir a conexão com o banco, para que uma configuração diferente pare sem custo.
async function loadPreviousRun(
  label: string,
  current: Pick<EvalRun, "preset" | "config">,
): Promise<EvalRun | null> {
  const path = join(RESULTS_DIR, `${label}.json`)
  let text: string
  try {
    text = await readFile(path, "utf8")
  } catch (error) {
    if (isMissingFile(error)) return null
    const detail = error instanceof Error ? error.message : String(error)
    throw new UsageError(`Não consegui ler eval/resultados/${label}.json: ${detail}`)
  }
  let previous: EvalRun | null = null
  try {
    previous = parseStoredRun(JSON.parse(text))
  } catch {
    previous = null
  }
  if (previous === null) {
    throw new UsageError(
      `eval/resultados/${label}.json não tem o formato de uma rodada gravada.` +
        " Use outro --label ou rode sem --append.",
    )
  }
  if (!sameRunConfig(previous, current)) {
    throw new UsageError(
      `A rodada "${label}" foi gravada com outra configuração (preset, modelos, RAG ou roteador).` +
        " Use outro --label ou rode sem --append.",
    )
  }
  return previous
}

async function loadQuestions(): Promise<EvalQuestion[]> {
  const entries = await readdir(KNOWLEDGE_DIR)
  const knowledgeFiles = entries.filter((name) => KNOWLEDGE_FILE_PATTERN.test(name))
  let data: unknown
  try {
    data = JSON.parse(await readFile(QUESTIONS_FILE, "utf8"))
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new UsageError(`Não consegui ler eval/perguntas.json: ${detail}`)
  }
  const validation = await validateQuestions(data, knowledgeFiles)
  if (!validation.ok) {
    throw new UsageError(
      `eval/perguntas.json tem problemas:\n${validation.errors.map((e) => `- ${e}`).join("\n")}`,
    )
  }
  return validation.questions
}

// Trechos reduzidos no JSON: sem id e com só o começo do texto.
function reduceChunk(chunk: RetrievedChunk): Omit<RetrievedChunk, "id"> {
  return {
    source: chunk.source,
    section: chunk.section,
    score: chunk.score,
    semantic: chunk.semantic,
    keyword: chunk.keyword,
    content: chunk.content.slice(0, CHUNK_PREVIEW_CHARS),
  }
}

// O contexto gravado guarda só a origem e o tamanho; o texto não vai para o arquivo.
function reduceContextBlock(block: ContextBlock) {
  return { source: block.source, section: block.section, chars: block.content.length }
}

function serializeRun(run: EvalRun): string {
  const results = run.results.map((result) =>
    result.reply === null
      ? result
      : {
          ...result,
          reply: {
            ...result.reply,
            retrieved: result.reply.retrieved.map(reduceChunk),
            context: result.reply.context.map(reduceContextBlock),
          },
        },
  )
  return `${JSON.stringify({ ...run, results }, null, 2)}\n`
}

function progressLine(index: number, total: number, result: QuestionResult): string {
  const score = scoreQuestion(result)
  const ok = score.conversationCorrect ?? (score.inScope ? score.correct : score.refusedCorrectly)
  const status =
    result.reply === null ? `erro: ${result.error ?? "desconhecido"}` : result.reply.status
  const hit = score.hit === null ? "" : ` hit=${score.hit ? "sim" : "não"}`
  const route = result.reply?.route == null ? "" : ` rota=${result.reply.route}`
  return (
    `[${index}/${total}] #${result.question.id} ${result.question.tipo} ${ok ? "✓" : "✗"}` +
    ` (${status}${hit}${route}, ${result.latencyMs} ms, ${result.usage.calls} chamadas)`
  )
}

function friendlyError(error: unknown): string {
  if (error instanceof UsageError) return error.message
  if (error instanceof LlmQuotaError) {
    return "A cota do Gemini acabou por enquanto. Espere um pouco e tente de novo."
  }
  if (error instanceof LlmUnavailableError) {
    return "O Gemini está indisponível no momento. Tente de novo em instantes."
  }
  if (error instanceof LlmRequestError) {
    return "O Gemini recusou a requisição. Confira a chave e o nome do modelo."
  }
  // Só o nome e a mensagem do erro, nunca variáveis de ambiente.
  return error instanceof Error ? `${error.name}: ${error.message}` : "Erro desconhecido."
}

async function compare(paths: string[]): Promise<void> {
  if (paths.length < 2) {
    throw new UsageError(
      "Use --compare com dois ou mais arquivos, por exemplo: --compare eval/resultados/v1.json eval/resultados/v2.json",
    )
  }
  const runs: EvalRun[] = []
  for (const path of paths) {
    try {
      runs.push(JSON.parse(await readFile(resolve(ROOT, path), "utf8")) as EvalRun)
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error)
      throw new UsageError(`Não consegui ler ${path}: ${detail}`)
    }
  }
  process.stdout.write(renderComparison(runs))
}

async function evaluate(flags: Flags): Promise<void> {
  const label = stringFlag(flags, "label")
  if (label === undefined || !LABEL_PATTERN.test(label)) {
    throw new UsageError(
      "Informe --label com letras, números, ponto, hífen ou sublinhado, por exemplo: --label v1",
    )
  }
  const preset = flags.preset ?? "padrao"
  if (!isPreset(preset)) {
    const received = preset === true ? "(sem valor)" : preset
    throw new UsageError(
      `Preset desconhecido: ${received}. Use --preset ${Object.keys(RAG_PRESETS).join(" ou --preset ")}.`,
    )
  }
  const appConfig = buildConfig(preset, ragOverrides(flags), routerFlag(flags, preset))
  const runConfig = {
    models: appConfig.models,
    rag: appConfig.rag,
    router: appConfig.router,
  }
  const delayMs = numberFlag(flags, "delay-ms", true) ?? DEFAULT_DELAY_MS
  if (delayMs < 0) throw new UsageError("--delay-ms precisa ser maior ou igual a 0.")
  const useJudge = flags.judge === true
  const append = appendFlag(flags)
  const allQuestions = await loadQuestions()
  const questions = parseOnly(flags, allQuestions)
  const previous = append ? await loadPreviousRun(label, { preset, config: runConfig }) : null

  const key = {
    embeddingModel: appConfig.models.embedding,
    chunkConfig: chunkConfigKey(appConfig.rag),
  }
  console.log(`Banco: ${databaseHost()}`)
  console.log(`Preset: ${preset} | chunkConfig: ${key.chunkConfig} (${key.embeddingModel})`)
  console.log(
    `RAG: topK ${appConfig.rag.topK}, minScore ${appConfig.rag.minScore}, alpha ${appConfig.rag.alpha},` +
      ` rewriteQuery ${appConfig.rag.rewriteQuery}`,
  )
  console.log(
    `Contexto: ${appConfig.rag.contextMode}` +
      (appConfig.rag.contextMode === "documents"
        ? ` (até ${appConfig.rag.maxContextDocs} documentos)`
        : ""),
  )
  const { router } = appConfig
  console.log(
    `Roteador: ${router.enabled ? `ligado (até ${router.maxWords} palavras)` : "desligado (só a regra de cumprimento)"}`,
  )
  console.log(`Modelos: chat ${appConfig.models.chat}, rápido ${appConfig.models.fast}`)
  console.log(
    `Perguntas: ${questions.length} | intervalo: ${delayMs} ms | juiz: ${useJudge ? "sim" : "não"}`,
  )

  const sql = getSql()
  const chunks = createChunkRepository(sql)
  const total = await chunks.count(key)
  console.log(`Trechos no banco para este conjunto: ${total}`)
  if (total === 0) {
    throw new UsageError(
      `Não há trechos para este preset. Rode \`npm run ingest -- --preset ${preset}\` antes da avaliação.`,
    )
  }

  const llm = getLlmClient()
  const assistant = createAssistant({
    llm,
    chunks,
    sessions: createSessionRepository(sql),
    config: appConfig,
  })

  const { results, stoppedByQuota } = await runQuestions(questions, {
    assistant,
    delayMs,
    newSessionId: randomUUID,
    judge: useJudge
      ? ({ question, reply }) =>
          judgeAnswer({
            question,
            retrieved: reply.retrieved,
            answer: reply.answer,
            llm,
            model: appConfig.models.fast,
          })
      : undefined,
    onProgress: ({ index, total, result }) => console.log(progressLine(index, total, result)),
  })

  const thisRun: EvalRun = {
    label,
    preset,
    date: new Date().toISOString(),
    commit: commitHash(),
    config: runConfig,
    results,
    scores: results.map(scoreQuestion),
    metrics: aggregate(results, routerMaxWords({ config: runConfig })),
  }
  // Com --append, junta ao que já estava gravado (sem arquivo, junta a uma rodada vazia).
  const merged = append
    ? mergeRuns(previous ?? { ...thisRun, results: [] }, thisRun, allQuestions)
    : null
  const run = merged?.run ?? thisRun

  await mkdir(RESULTS_DIR, { recursive: true })
  const jsonPath = join(RESULTS_DIR, `${label}.json`)
  const mdPath = join(RESULTS_DIR, `${label}.md`)
  await writeFile(jsonPath, serializeRun(run), "utf8")
  await writeFile(mdPath, renderReport(run), "utf8")

  const { metrics } = run
  console.log("")
  console.log(
    `Hit@K ${formatPercent(metrics.hitAtK)} | Acerto ${formatPercent(metrics.accuracy)} |` +
      ` Recusa correta ${formatPercent(metrics.correctRefusal)} |` +
      ` Falsa recusa ${formatPercent(metrics.falseRefusal)}`,
  )
  if (metrics.routing !== undefined) {
    const routing = metrics.routing
    console.log(
      `Rotas: acerto ${formatPercent(routing.routeAccuracy)} | falso small talk ${routing.falseSmallTalk} |` +
        ` chamadas evitadas ${routing.avoidedSearches}`,
    )
  }
  console.log(
    `Latência p50 ${metrics.latencyP50Ms} ms, p95 ${metrics.latencyP95Ms} ms | Erros ${metrics.errors} |` +
      ` ${metrics.usage.calls} chamadas, ${metrics.usage.inputTokens} tokens de entrada,` +
      ` ${metrics.usage.outputTokens} de saída`,
  )
  console.log(`Gravado: eval/resultados/${label}.json e eval/resultados/${label}.md`)
  if (merged !== null) {
    console.log(
      `Junção: ${run.results.length} de ${allQuestions.length} perguntas gravadas | commits: ${run.commit}`,
    )
    if (merged.discarded.length > 0) {
      console.log(
        `Descartadas (a pergunta mudou ou saiu do arquivo): ${merged.discarded.join(", ")}`,
      )
    }
    console.log(`Pendentes: ${merged.pending.length === 0 ? "nenhuma" : merged.pending.join(",")}`)
  }
  if (stoppedByQuota) {
    console.warn(
      `A cota do Gemini acabou: a rodada parou depois de ${results.length} de ${questions.length}` +
        " perguntas e gravou o parcial. Espere a cota voltar e rode de novo (use --only para continuar).",
    )
    process.exitCode = 2
  }
}

async function main(): Promise<void> {
  const { flags, positionals } = parseArgs(process.argv.slice(2))
  if (flags.compare === true) {
    await compare(positionals)
    return
  }
  await evaluate(flags)
}

main()
  .catch((error: unknown) => {
    console.error(friendlyError(error))
    process.exitCode = 1
  })
  .finally(() => closeSql())
