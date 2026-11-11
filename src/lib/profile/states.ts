export const STATES = [
  { uf: "AC", name: "Acre", ibgeCode: 12 },
  { uf: "AL", name: "Alagoas", ibgeCode: 27 },
  { uf: "AP", name: "Amapá", ibgeCode: 16 },
  { uf: "AM", name: "Amazonas", ibgeCode: 13 },
  { uf: "BA", name: "Bahia", ibgeCode: 29 },
  { uf: "CE", name: "Ceará", ibgeCode: 23 },
  { uf: "DF", name: "Distrito Federal", ibgeCode: 53 },
  { uf: "ES", name: "Espírito Santo", ibgeCode: 32 },
  { uf: "GO", name: "Goiás", ibgeCode: 52 },
  { uf: "MA", name: "Maranhão", ibgeCode: 21 },
  { uf: "MT", name: "Mato Grosso", ibgeCode: 51 },
  { uf: "MS", name: "Mato Grosso do Sul", ibgeCode: 50 },
  { uf: "MG", name: "Minas Gerais", ibgeCode: 31 },
  { uf: "PA", name: "Pará", ibgeCode: 15 },
  { uf: "PB", name: "Paraíba", ibgeCode: 25 },
  { uf: "PR", name: "Paraná", ibgeCode: 41 },
  { uf: "PE", name: "Pernambuco", ibgeCode: 26 },
  { uf: "PI", name: "Piauí", ibgeCode: 22 },
  { uf: "RJ", name: "Rio de Janeiro", ibgeCode: 33 },
  { uf: "RN", name: "Rio Grande do Norte", ibgeCode: 24 },
  { uf: "RS", name: "Rio Grande do Sul", ibgeCode: 43 },
  { uf: "RO", name: "Rondônia", ibgeCode: 11 },
  { uf: "RR", name: "Roraima", ibgeCode: 14 },
  { uf: "SC", name: "Santa Catarina", ibgeCode: 42 },
  { uf: "SP", name: "São Paulo", ibgeCode: 35 },
  { uf: "SE", name: "Sergipe", ibgeCode: 28 },
  { uf: "TO", name: "Tocantins", ibgeCode: 17 },
] as const

export const UFS = STATES.map((s) => s.uf)
export type Uf = (typeof STATES)[number]["uf"]

export function isUf(value: unknown): value is Uf {
  return typeof value === "string" && (UFS as readonly string[]).includes(value)
}
