import type { ProfileTextRejection } from "@/lib/moderation/profile-text"
import { checkProfileText, profileTextMessage } from "@/lib/moderation/profile-text"
import { isPlanId } from "@/lib/plans"
import { findCity } from "@/lib/profile/cities"
import { isCuisineId } from "@/lib/profile/cuisines"
import { parseWeekHours } from "@/lib/profile/hours"
import { isUf } from "@/lib/profile/states"
import {
  CUISINE_TEXT_MAX_CHARS,
  type Cuisine,
  PROFILE_VERSION,
  type ProfileErrorField,
  type ProfileLocation,
  type RestaurantProfile,
} from "@/lib/profile/types"
import { PROFILE_FIELD_MAX_CHARS } from "@/lib/types"
import { VALIDATION_MESSAGES } from "@/lib/validation-messages"

export type ProfileParseResult =
  | { ok: true; value: RestaurantProfile }
  | { ok: false; error: string; field?: ProfileErrorField; rejection?: ProfileTextRejection }

const KNOWN_KEYS: ReadonlySet<string> = new Set([
  "version",
  "plan",
  "name",
  "cuisine",
  "location",
  "hours",
])

type Failure = Extract<ProfileParseResult, { ok: false }>

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function cuisineFailure(): Failure {
  return { ok: false, error: VALIDATION_MESSAGES.cuisine, field: "cuisine" }
}

function locationFailure(): Failure {
  return { ok: false, error: VALIDATION_MESSAGES.location, field: "location" }
}

function isFailure(value: unknown): value is Failure {
  return isRecord(value) && value.ok === false
}

function parseCuisine(raw: unknown): Cuisine | Failure {
  if (!isRecord(raw)) return cuisineFailure()
  const keys = Object.keys(raw)
  if (raw.id === "outro") {
    if (keys.some((k) => k !== "id" && k !== "text") || typeof raw.text !== "string") {
      return cuisineFailure()
    }
    const text = raw.text.trim()
    if (text === "" || text.length > CUISINE_TEXT_MAX_CHARS) return cuisineFailure()
    return { id: "outro", text }
  }
  if (keys.length !== 1 || !isCuisineId(raw.id)) return cuisineFailure()
  return { id: raw.id }
}

// A forma do local; a existência do município é conferida por último.
function parseLocationShape(raw: unknown): ProfileLocation | Failure {
  if (!isRecord(raw) || Object.keys(raw).some((k) => k !== "uf" && k !== "cityCode")) {
    return locationFailure()
  }
  if (!isUf(raw.uf)) return locationFailure()
  if (raw.cityCode === undefined) return { uf: raw.uf }
  if (typeof raw.cityCode !== "number" || !Number.isInteger(raw.cityCode) || raw.cityCode <= 0) {
    return locationFailure()
  }
  return { uf: raw.uf, cityCode: raw.cityCode }
}

// Parser único do perfil v2: o PUT /api/profile (requirePlan), o CLI e o eval. Ordem: objeto,
// version, campo desconhecido, plano, forma e tamanho de cada campo (o horário, com as regras dos
// turnos) e, por último, o filtro de
// texto (nome e texto de "Outro") e a cidade na lista. Os textos são aparados e os vazios caem.
// A version vem antes para que o formulário antigo ({ plan, city }) receba "recarregue a página".
export async function parseProfileInput(
  body: unknown,
  options: { requirePlan: boolean },
): Promise<ProfileParseResult> {
  if (!isRecord(body)) return { ok: false, error: VALIDATION_MESSAGES.notObject }
  if (body.version !== PROFILE_VERSION) {
    return { ok: false, error: VALIDATION_MESSAGES.profileVersion }
  }
  if (Object.keys(body).some((key) => !KNOWN_KEYS.has(key))) {
    return { ok: false, error: VALIDATION_MESSAGES.unknownField }
  }
  const value: RestaurantProfile = { version: PROFILE_VERSION }
  if (body.plan !== undefined || options.requirePlan) {
    if (!isPlanId(body.plan)) return { ok: false, error: VALIDATION_MESSAGES.plan }
    value.plan = body.plan
  }

  if ("name" in body) {
    const raw = body.name
    if (typeof raw !== "string" || raw.length > PROFILE_FIELD_MAX_CHARS) {
      return { ok: false, error: VALIDATION_MESSAGES.profile }
    }
    const trimmed = raw.trim()
    if (trimmed !== "") value.name = trimmed
  }
  if (body.hours !== undefined) {
    const hours = parseWeekHours(body.hours)
    if (!hours.ok) return { ok: false, error: hours.error, field: hours.field }
    if (hours.value !== undefined) value.hours = hours.value
  }
  if (body.cuisine !== undefined) {
    const cuisine = parseCuisine(body.cuisine)
    if (isFailure(cuisine)) return cuisine
    value.cuisine = cuisine
  }
  if (body.location !== undefined) {
    const location = parseLocationShape(body.location)
    if (isFailure(location)) return location
    value.location = location
  }

  if (value.name !== undefined) {
    const check = checkProfileText("name", value.name)
    if (!check.ok) {
      return {
        ok: false,
        error: profileTextMessage("name", check.reason),
        field: "name",
        rejection: check.reason,
      }
    }
  }
  if (value.cuisine?.id === "outro") {
    const check = checkProfileText("cuisine", value.cuisine.text)
    if (!check.ok) {
      return {
        ok: false,
        error: profileTextMessage("cuisine", check.reason),
        field: "cuisine",
        rejection: check.reason,
      }
    }
  }
  if (value.location?.cityCode !== undefined) {
    const city = await findCity(value.location.uf, value.location.cityCode)
    if (!city) return locationFailure()
  }
  return { ok: true, value }
}
