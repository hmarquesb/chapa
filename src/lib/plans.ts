import { PLAN_IDS, PLAN_LABELS, type PlanId, type RestaurantProfile } from "@/lib/types"

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value)
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim()
}

// Aceita o id ou o nome do plano, sem diferenciar maiúsculas e acentos, com ou sem "Plano ".
export function parsePlanId(input: string): PlanId | null {
  const text = normalize(input).replace(/^plano\s+/, "")
  return PLAN_IDS.find((id) => id === text) ?? null
}

// "Marmitaria Boa Panela · Plano Misto"; sem nome, só o plano; sem plano, só o nome; vazio → "".
export function profileSummary(profile: RestaurantProfile): string {
  const parts: string[] = []
  const name = profile.name?.trim()
  if (name) parts.push(name)
  if (profile.plan !== undefined) parts.push(PLAN_LABELS[profile.plan])
  return parts.join(" · ")
}
