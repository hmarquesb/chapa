// Consistência entre os documentos de knowledge-base/ e o regras.yaml (ADR 0019).
// Só funções puras: quem lê os arquivos é o teste knowledge-base.test.ts.

export type Unit = "pct" | "reais" | "min" | "horas" | "dias" | "dias_uteis" | "km" | "mb" | "px"

export type Quantity = {
  value: number // 2.000,00 → 2000; 2,49 → 2.49
  unit: Unit
  raw: string // trecho como aparece no texto, por exemplo "R$ 2.000,00" ou "7 dias úteis"
}

export type RuleValue = {
  key: string // caminho com pontos, por exemplo "planos.proprio.comissao_pct"
  value: number
  unit: Unit
}

export type DocumentFile = { name: string; content: string }

const TOLERANCE = 1e-9

// "Dia útil" vem antes de "dia" para não ser lido como dia corrido.
const KEY_SUFFIXES: Array<[string, Unit]> = [
  ["_dias_uteis", "dias_uteis"],
  ["_pct", "pct"],
  ["_reais", "reais"],
  ["_min", "min"],
  ["_horas", "horas"],
  ["_dias", "dias"],
  ["_km", "km"],
  ["_mb", "mb"],
  ["_px", "px"],
]

// Número em PT-BR: milhar com ponto e decimal com vírgula. Não pode estar colado a uma letra,
// a outro dígito ou a um separador (evita pedaços de datas, códigos e palavras).
const NUMBER = /(?<![\p{L}\d.,])(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?)(?!\d)/gu

// Unidade logo depois do número. Abreviações (h, min, d) não são reconhecidas de propósito.
const SUFFIX_UNIT =
  /^([  ]?)(?:(%)|(minutos?|horas?|dias?[  ]+(?:útil|úteis)|dias?|km|MB|px)(?![\p{L}\d]))/u

const REAIS_PREFIX = /R\$[  ]?$/

// Ligação entre dois números de um intervalo em que só o último traz a unidade.
const RANGE_LINK = /^(?:\s+(?:a|e|ou)\s+|\s*[×x]\s*)$/

const LIST_ITEM = /^\s*(?:[-*+]|\d+\.)\s+/
const HEADING = /^#{1,6}\s/
const TITLE = /^#\s/
const BLOCKQUOTE = /^>/
const EXAMPLE = /^[*_]*Exemplo[*_]*:/

type Token = {
  start: number
  end: number
  text: string
  value: number
  unit?: Unit
  suffix?: string // separador + unidade, como aparece no texto ("%", " dias úteis")
  fromSuffix: boolean
}

function parseNumber(text: string): number {
  return Number(text.replace(/\./g, "").replace(",", "."))
}

function unitFromWord(word: string): Unit {
  if (word.startsWith("minuto")) return "min"
  if (word.startsWith("hora")) return "horas"
  if (word.startsWith("dia")) return /útil|úteis/.test(word) ? "dias_uteis" : "dias"
  if (word === "km") return "km"
  if (word === "MB") return "mb"
  return "px"
}

// Parágrafos (blocos separados por linha em branco), itens de lista e títulos de seção,
// sem o título # e o cabeçalho de política que vêm antes do conteúdo.
function segments(markdown: string): string[] {
  const result: string[] = []
  let current: string[] | null = null
  let inHeader = true
  const flush = () => {
    if (current && current.length > 0) result.push(current.join("\n"))
    current = null
  }

  for (const line of markdown.split(/\r?\n/)) {
    const blank = line.trim() === ""
    if (inHeader && (blank || TITLE.test(line) || BLOCKQUOTE.test(line))) continue
    inHeader = false

    if (TITLE.test(line)) {
      flush()
    } else if (blank) {
      flush()
    } else if (HEADING.test(line)) {
      flush()
      result.push(line)
    } else if (LIST_ITEM.test(line)) {
      flush()
      current = [line.replace(LIST_ITEM, "")]
    } else if (current) {
      current.push(line)
    } else {
      current = [line]
    }
  }
  flush()
  return result
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = []
  for (const match of text.matchAll(NUMBER)) {
    const numberText = match[1] ?? match[0]
    const start = match.index ?? 0
    const end = start + match[0].length
    const token: Token = {
      start,
      end,
      text: numberText,
      value: parseNumber(numberText),
      fromSuffix: false,
    }

    const prefix = REAIS_PREFIX.exec(text.slice(0, start))
    const suffix = SUFFIX_UNIT.exec(text.slice(end))
    if (prefix) {
      token.unit = "reais"
      token.start = start - prefix[0].length
    } else if (suffix) {
      const separator = suffix[1] ?? ""
      const word = suffix[2] ?? suffix[3] ?? ""
      token.unit = suffix[2] ? "pct" : unitFromWord(word)
      token.suffix = separator + word
      token.fromSuffix = true
    }
    tokens.push(token)
  }

  // Da direita para a esquerda: "de 5 a 90 minutos" e "1200 × 900 px" levam a unidade do último.
  for (let i = tokens.length - 2; i >= 0; i--) {
    const token = tokens[i]
    const next = tokens[i + 1]
    if (!token || !next || token.unit || !next.fromSuffix || !next.unit) continue
    if (!RANGE_LINK.test(text.slice(token.end, next.start))) continue
    token.unit = next.unit
    token.suffix = next.suffix
    token.fromSuffix = true
  }
  return tokens
}

// Números com unidade reconhecida, na ordem em que aparecem, sem os parágrafos e itens de
// lista que começam com "Exemplo:" e sem o título e o cabeçalho de política.
export function extractQuantities(markdown: string): Quantity[] {
  const quantities: Quantity[] = []
  for (const segment of segments(markdown)) {
    if (EXAMPLE.test(segment.trimStart())) continue
    for (const token of tokenize(segment)) {
      if (!token.unit) continue
      const raw = token.fromSuffix
        ? token.text + (token.suffix ?? "")
        : segment.slice(token.start, token.end)
      quantities.push({ value: token.value, unit: token.unit, raw })
    }
  }
  return quantities
}

function unitFromKey(key: string): Unit | undefined {
  for (const [suffix, unit] of KEY_SUFFIXES) {
    if (key.endsWith(suffix)) return unit
  }
  return undefined
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

// Folhas numéricas do YAML já lido (objeto qualquer) cuja chave termina num sufixo de Unit.
// Listas de números viram uma RuleValue por item. Chaves _qtd, sem sufixo ou não numéricas
// ficam de fora.
export function flattenRules(rules: unknown): RuleValue[] {
  const result: RuleValue[] = []
  const walk = (node: Record<string, unknown>, path: string) => {
    for (const [name, value] of Object.entries(node)) {
      const key = path ? `${path}.${name}` : name
      if (isRecord(value)) {
        walk(value, key)
        continue
      }
      const unit = unitFromKey(name)
      if (!unit) continue
      if (isNumber(value)) {
        result.push({ key, value, unit })
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (isNumber(item)) result.push({ key: `${key}[${index}]`, value: item, unit })
        })
      }
    }
  }
  if (isRecord(rules)) walk(rules, "")
  return result
}

function sameQuantity(a: { value: number; unit: Unit }, b: { value: number; unit: Unit }) {
  return a.unit === b.unit && Math.abs(a.value - b.value) < TOLERANCE
}

// Uma linha "<arquivo>: <raw> não encontrado no regras.yaml" por número sem par (mesmo valor,
// tolerância 1e-9, e mesma unidade), na ordem dos arquivos e do texto.
export function findMissingValues(documents: DocumentFile[], rules: RuleValue[]): string[] {
  const lines: string[] = []
  for (const document of documents) {
    for (const quantity of extractQuantities(document.content)) {
      if (!rules.some((rule) => sameQuantity(rule, quantity))) {
        lines.push(`${document.name}: ${quantity.raw} não encontrado no regras.yaml`)
      }
    }
  }
  return lines
}

// Chaves de RuleValue cujo valor não aparece com a mesma unidade em nenhum documento.
export function findUncitedKeys(documents: DocumentFile[], rules: RuleValue[]): string[] {
  const quantities = documents.flatMap((document) => extractQuantities(document.content))
  return rules
    .filter((rule) => !quantities.some((quantity) => sameQuantity(rule, quantity)))
    .map((rule) => rule.key)
}

// Palavras do arquivo inteiro: sequências separadas por espaço em branco (como o wc -w).
export function countWords(markdown: string): number {
  return markdown.split(/\s+/).filter((word) => word.length > 0).length
}
