import { normalizeSearch } from "@/lib/profile/search"

// Os 18 tipos de cozinha do perfil, na ordem em que a lista os mostra. Os ids são estáveis.
// Os sinônimos servem à conversão do perfil antigo (upgradeProfile): só os inequívocos.
export const CUISINES = [
  { id: "brasileira", label: "Brasileira", synonyms: ["comida brasileira"] },
  {
    id: "marmita",
    label: "Marmita e comida caseira",
    synonyms: ["marmita", "marmitaria", "marmitex", "comida caseira", "caseira", "prato feito"],
  },
  {
    id: "lanches",
    label: "Lanches e hambúrguer",
    synonyms: ["lanches", "lanchonete", "hamburguer", "hamburgueria", "hamburgueres", "hot dog"],
  },
  { id: "pizza", label: "Pizza", synonyms: ["pizzas", "pizzaria"] },
  {
    id: "japonesa",
    label: "Japonesa",
    synonyms: ["sushi", "comida japonesa", "temaki", "yakisoba"],
  },
  { id: "chinesa", label: "Chinesa", synonyms: ["comida chinesa"] },
  { id: "italiana", label: "Italiana", synonyms: ["massas", "macarronada", "cantina"] },
  { id: "arabe", label: "Árabe", synonyms: ["comida arabe", "esfiha", "esfirra", "kebab"] },
  { id: "nordestina", label: "Nordestina", synonyms: ["comida nordestina", "tapioca"] },
  {
    id: "churrasco",
    label: "Churrasco e grelhados",
    synonyms: ["churrascaria", "carnes", "grelhados"],
  },
  { id: "pastel", label: "Pastel e salgados", synonyms: ["pastelaria", "salgados", "salgadinhos"] },
  {
    id: "frutos-do-mar",
    label: "Frutos do mar",
    synonyms: ["peixes", "pescados", "frutos do mar", "camarao"],
  },
  { id: "saudavel", label: "Saudável", synonyms: ["saudavel", "fit", "comida saudavel"] },
  {
    id: "vegetariana",
    label: "Vegetariana e vegana",
    synonyms: ["vegetariana", "vegana", "vegano"],
  },
  {
    id: "doces",
    label: "Doces e sobremesas",
    synonyms: ["sobremesas", "confeitaria", "doceria", "bolos"],
  },
  { id: "acai", label: "Açaí e sorvetes", synonyms: ["acai", "sorvetes", "sorveteria", "sorvete"] },
  { id: "padaria", label: "Padaria e café", synonyms: ["padaria", "cafeteria", "cafe"] },
  { id: "mexicana", label: "Mexicana", synonyms: ["comida mexicana", "tacos"] },
] as const

export type CuisineId = (typeof CUISINES)[number]["id"]
export const CUISINE_IDS = CUISINES.map((c) => c.id) as readonly CuisineId[]

export function isCuisineId(value: unknown): value is CuisineId {
  return typeof value === "string" && (CUISINE_IDS as readonly string[]).includes(value)
}

export function cuisineLabel(cuisine: { id: CuisineId } | { id: "outro"; text: string }): string {
  if (cuisine.id === "outro") return cuisine.text
  return CUISINES.find((c) => c.id === cuisine.id)?.label ?? cuisine.id
}

// Compara o texto normalizado com o id, o rótulo e os sinônimos. Sem casamento: null.
export function matchCuisine(text: string): CuisineId | null {
  const query = normalizeSearch(text)
  if (query === "") return null
  const found = CUISINES.find(
    (c) =>
      normalizeSearch(c.label) === query ||
      c.id === query ||
      c.synonyms.some((s) => normalizeSearch(s) === query),
  )
  return found?.id ?? null
}
