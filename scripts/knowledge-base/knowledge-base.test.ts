// Confere os arquivos reais de knowledge-base/ contra a spec e o regras.yaml (ADR 0019).
// Só leitura local: sem rede, sem banco e sem chave.
import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vitest"
import { parse } from "yaml"
import { KNOWLEDGE_FILE_PATTERN } from "@/core/rag/ingest"
import {
  countWords,
  type DocumentFile,
  findMissingValues,
  findUncitedKeys,
  flattenRules,
} from "./consistency"

const KNOWLEDGE_DIR = resolve(__dirname, "../../knowledge-base")

const EXPECTED_DOCUMENTS = [
  "01-planos-e-taxas.md",
  "02-repasse-financeiro.md",
  "03-cancelamentos-e-contestacoes.md",
  "04-cardapio-e-fotos.md",
  "05-horarios-pausas-e-disponibilidade.md",
  "06-avaliacoes-e-reputacao.md",
  "07-embalagem-e-entrega.md",
  "08-promocoes-e-cupons.md",
  "09-suporte-e-chamados.md",
  "10-conta-acessos-e-seguranca.md",
  "11-pagamentos-e-fiscal.md",
]

const POLICY_HEADER =
  "> Política de parceiros da Rango, vigente desde 01/11/2026. Empresa fictícia, criada para fins de estudo."

const MIN_WORDS = 600
const MAX_WORDS = 1300

const UNCOVERED_TOPICS = [
  "cadastro de novas lojas",
  "integração por API ou PDV",
  "regras para entregadores",
  "preços de publicidade (Rango Ads)",
  "legislação municipal específica",
  "operação fora do Brasil",
]

function readDocuments(): DocumentFile[] {
  return readdirSync(KNOWLEDGE_DIR)
    .filter((name) => KNOWLEDGE_FILE_PATTERN.test(name))
    .sort()
    .map((name) => ({ name, content: readFileSync(join(KNOWLEDGE_DIR, name), "utf8") }))
}

function readRules() {
  const path = join(KNOWLEDGE_DIR, "regras.yaml")
  if (!existsSync(path)) throw new Error("ausente: regras.yaml")
  return flattenRules(parse(readFileSync(path, "utf8")))
}

// Primeira linha não vazia depois do título "# ".
function lineAfterTitle(content: string): string | undefined {
  const lines = content.split(/\r?\n/)
  const title = lines.findIndex((line) => /^#\s/.test(line))
  if (title === -1) return undefined
  return lines.slice(title + 1).find((line) => line.trim() !== "")
}

describe("knowledge-base/", () => {
  const documents = readDocuments()

  it("has exactly the 11 documents of the spec", () => {
    const names = documents.map((doc) => doc.name)
    const problems = [
      ...EXPECTED_DOCUMENTS.filter((name) => !names.includes(name)).map((n) => `ausente: ${n}`),
      ...names.filter((name) => !EXPECTED_DOCUMENTS.includes(name)).map((n) => `inesperado: ${n}`),
    ]
    expect(problems).toEqual([])
  })

  it("starts every document with the policy header right after the title", () => {
    const problems = documents
      .filter((doc) => lineAfterTitle(doc.content) !== POLICY_HEADER)
      .map((doc) => `${doc.name}: sem o cabeçalho de política logo depois do título`)
    expect(problems).toEqual([])
  })

  it(`keeps every document between ${MIN_WORDS} and ${MAX_WORDS} words`, () => {
    const problems = documents
      .map((doc) => ({ name: doc.name, words: countWords(doc.content) }))
      .filter(({ words }) => words < MIN_WORDS || words > MAX_WORDS)
      .map(({ name, words }) => `${name}: ${words} palavras`)
    expect(problems).toEqual([])
  })

  it("finds every number with a unit in regras.yaml", () => {
    expect(findMissingValues(documents, readRules())).toEqual([])
  })

  it("warns about regras.yaml values that no document cites", () => {
    const uncited = findUncitedKeys(documents, readRules())
    if (uncited.length > 0) {
      console.warn(`Chaves do regras.yaml sem citação nos documentos:\n${uncited.join("\n")}`)
    }
    expect(Array.isArray(uncited)).toBe(true)
  })

  it("lists the topics the base does not cover in its README.md", () => {
    const path = join(KNOWLEDGE_DIR, "README.md")
    expect(existsSync(path), "ausente: README.md").toBe(true)
    const readme = existsSync(path) ? readFileSync(path, "utf8").toLowerCase() : ""
    const missing = ["inspirada no mercado brasileiro de delivery", ...UNCOVERED_TOPICS].filter(
      (topic) => !readme.includes(topic.toLowerCase()),
    )
    expect(missing).toEqual([])
  })
})
