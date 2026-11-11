// Parte pura do gerador de municípios (decisão 3 da change structure-profile-cuisine-and-location).
import { STATES, type Uf } from "../../src/lib/profile/states"

const DIR = "src/lib/profile/cities"

type RawCity = { id: number; nome: string }

function isRawCity(value: unknown): value is RawCity {
  if (typeof value !== "object" || value === null) return false
  const v = value as Record<string, unknown>
  return Number.isInteger(v.id) && typeof v.nome === "string" && v.nome.trim() !== ""
}

// Devolve o caminho e o conteúdo de cada arquivo, já no formato do Biome.
export function buildCityModules(raw: unknown, extractedAt: string): Map<string, string> {
  if (!Array.isArray(raw) || !raw.every(isRawCity)) {
    throw new Error("Resposta do IBGE inesperada: esperava uma lista de { id, nome }.")
  }
  const byUf = new Map<Uf, [number, string][]>()
  for (const city of raw) {
    const prefix = Math.floor(city.id / 100000)
    const state = STATES.find((s) => s.ibgeCode === prefix)
    if (!state) throw new Error(`Código de município com UF desconhecida: ${city.id}`)
    const list = byUf.get(state.uf) ?? []
    list.push([city.id, city.nome.trim()])
    byUf.set(state.uf, list)
  }

  const files = new Map<string, string>()
  const ufs = STATES.map((s) => s.uf).filter((uf) => byUf.has(uf))
  for (const uf of ufs) {
    const cities = (byUf.get(uf) ?? []).sort((a, b) => a[1].localeCompare(b[1], "pt-BR"))
    const rows = cities.map(([code, name]) => `[${code}, ${JSON.stringify(name)}]`)
    const type = "readonly (readonly [code: number, name: string])[]"
    const head = `// Gerado por scripts/ibge/generate-cities.ts. Não edite à mão.\nexport const CITIES: ${type} = `
    const body =
      rows.length === 1 ? `[${rows[0]}]\n` : `[\n${rows.map((r) => `  ${r},`).join("\n")}\n]\n`
    files.set(`${DIR}/${uf.toLowerCase()}.ts`, head + body)
  }

  const total = raw.length
  const loaders = ufs.map((uf) => `  ${uf}: () => import("./${uf.toLowerCase()}"),`).join("\n")
  files.set(
    `${DIR}/index.ts`,
    `// Gerado por scripts/ibge/generate-cities.ts. Não edite à mão.
import type { Uf } from "@/lib/profile/states"

export const CITIES_EXTRACTED_AT = ${JSON.stringify(extractedAt)}
export const CITY_COUNT = ${total}

export type CitiesModule = { CITIES: readonly (readonly [code: number, name: string])[] }

export const CITY_LOADERS: Record<Uf, () => Promise<CitiesModule>> = {
${loaders}
}
`,
  )
  return files
}
