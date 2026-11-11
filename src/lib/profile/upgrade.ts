import { findCitiesByName } from "@/lib/profile/cities"
import { matchCuisine } from "@/lib/profile/cuisines"
import { parseProfileInput } from "@/lib/profile/parse"
import { PROFILE_VERSION, type RestaurantProfile } from "@/lib/profile/types"

const FIELDS = ["plan", "name", "cuisine", "location", "hours"] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

// Perfil salvo sem version: 2 → candidato no formato v2. Nunca grava; o que não converte
// fica de fora (undefined) e o perfil vira "precisa revisar".
async function legacyCandidate(raw: Record<string, unknown>): Promise<{
  candidate: Record<string, unknown>
  discarded: boolean
}> {
  const candidate: Record<string, unknown> = {}
  let discarded = false
  for (const field of ["plan", "name", "hours"] as const) {
    if (raw[field] !== undefined) candidate[field] = raw[field]
  }
  if (raw.cuisine !== undefined) {
    if (typeof raw.cuisine !== "string") {
      discarded = true
    } else {
      const text = raw.cuisine.trim()
      const id = matchCuisine(text)
      if (id) candidate.cuisine = { id }
      else if (text !== "") candidate.cuisine = { id: "outro", text }
    }
  }
  if (raw.city !== undefined) {
    if (typeof raw.city !== "string") {
      discarded = true
    } else if (raw.city.trim() !== "") {
      const found = await findCitiesByName(raw.city)
      const [only] = found
      if (found.length === 1 && only) candidate.location = { uf: only.uf, cityCode: only.code }
      else discarded = true
    }
  }
  return { candidate, discarded }
}

// Todo perfil lido do banco passa por aqui. Cada campo é conferido pelo parser, sozinho: o
// inválido é descartado e marca needsReview. O dado original só muda quando a pessoa salva.
export async function upgradeProfile(
  raw: unknown,
): Promise<{ profile: RestaurantProfile; needsReview: boolean }> {
  const profile: RestaurantProfile = { version: PROFILE_VERSION }
  if (!isRecord(raw)) return { profile, needsReview: raw !== null && raw !== undefined }

  let candidate: Record<string, unknown>
  let needsReview = false
  if (raw.version === PROFILE_VERSION) {
    candidate = raw
  } else {
    const legacy = await legacyCandidate(raw)
    candidate = legacy.candidate
    needsReview = legacy.discarded
  }

  for (const field of FIELDS) {
    if (candidate[field] === undefined) continue
    const result = await parseProfileInput(
      { version: PROFILE_VERSION, [field]: candidate[field] },
      { requirePlan: false },
    )
    if (!result.ok) {
      needsReview = true
      continue
    }
    const value = result.value[field]
    if (value !== undefined) Object.assign(profile, { [field]: value })
  }
  return { profile, needsReview }
}
