import { CITY_LOADERS } from "@/lib/profile/cities/index"
import { normalizeSearch } from "@/lib/profile/search"
import { UFS, type Uf } from "@/lib/profile/states"
import type { City } from "@/lib/profile/types"

// Cada UF é um módulo gerado, carregado por import() estático: o bundler separa um pedaço por
// UF. O cache guarda a promessa para não carregar duas vezes no mesmo processo.
const cache = new Map<Uf, Promise<readonly City[]>>()

export function loadCities(uf: Uf): Promise<readonly City[]> {
  let cached = cache.get(uf)
  if (!cached) {
    cached = CITY_LOADERS[uf]().then(({ CITIES }) =>
      CITIES.map(([code, name]): City => ({ code, name, uf })),
    )
    cache.set(uf, cached)
  }
  return cached
}

export async function findCity(uf: Uf, code: number): Promise<City | null> {
  const cities = await loadCities(uf)
  return cities.find((c) => c.code === code) ?? null
}

// Carrega as 27 UFs: só a conversão do perfil antigo usa.
export async function findCitiesByName(name: string): Promise<City[]> {
  const query = normalizeSearch(name)
  if (query === "") return []
  const all = await Promise.all(UFS.map((uf) => loadCities(uf)))
  return all.flat().filter((c) => normalizeSearch(c.name) === query)
}
