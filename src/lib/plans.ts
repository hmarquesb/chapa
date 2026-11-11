import { normalizeSearch } from "@/lib/profile/search"
import { PLAN_IDS, PLAN_LABELS, type PlanId, type RestaurantProfile } from "@/lib/types"

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && (PLAN_IDS as readonly string[]).includes(value)
}

// Aceita o id ou o nome do plano, sem diferenciar maiúsculas e acentos, com ou sem "Plano ".
export function parsePlanId(input: string): PlanId | null {
  const text = normalizeSearch(input).replace(/^plano\s+/, "")
  return PLAN_IDS.find((id) => id === text) ?? null
}

// "Marmitaria Boa Panela · Plano Misto"; sem nome, só o plano; sem plano, só o nome; vazio → "".
export function profileSummary(profile: Pick<RestaurantProfile, "name" | "plan">): string {
  const parts: string[] = []
  const name = profile.name?.trim()
  if (name) parts.push(name)
  if (profile.plan !== undefined) parts.push(PLAN_LABELS[profile.plan])
  return parts.join(" · ")
}
