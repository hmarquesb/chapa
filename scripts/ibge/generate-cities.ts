// Baixa os municípios da API pública do IBGE e grava src/lib/profile/cities/ (sem chave).
// Uso: npx tsx scripts/ibge/generate-cities.ts
import { mkdir, writeFile } from "node:fs/promises"
import { dirname } from "node:path"
import { buildCityModules } from "./cities"

const URL_IBGE = "https://servicodados.ibge.gov.br/api/v1/localidades/municipios"

async function main() {
  const response = await fetch(URL_IBGE)
  if (!response.ok) throw new Error(`IBGE respondeu ${response.status}`)
  const raw: unknown = await response.json()
  const extractedAt = new Date().toISOString().slice(0, 10)
  const files = buildCityModules(raw, extractedAt)
  for (const [path, content] of files) {
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, content)
  }
  console.log(
    `${files.size} arquivos gravados. Municípios: ${Array.isArray(raw) ? raw.length : 0}.`,
  )
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
