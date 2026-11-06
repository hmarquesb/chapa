import { PROFILE_FIELD_MAX_CHARS, PROFILE_FIELDS, type RestaurantProfile } from "@/lib/types"

export const PROFILE_STORAGE_KEY = "chapa:perfil"

// Keeps only PROFILE_FIELDS with string values, trimmed, non-empty and at most 60 chars.
export function sanitizeProfile(input: unknown): RestaurantProfile {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return {}
  const source = input as Record<string, unknown>
  const profile: RestaurantProfile = {}
  for (const field of PROFILE_FIELDS) {
    const value = source[field]
    if (typeof value !== "string") continue
    const clean = value.trim().slice(0, PROFILE_FIELD_MAX_CHARS).trim()
    if (clean !== "") profile[field] = clean
  }
  return profile
}

export function hasProfileData(profile: RestaurantProfile): boolean {
  return Object.keys(sanitizeProfile(profile)).length > 0
}

export function parseStoredProfile(raw: string | null): RestaurantProfile {
  if (raw === null || raw === "") return {}
  try {
    return sanitizeProfile(JSON.parse(raw))
  } catch {
    return {}
  }
}
