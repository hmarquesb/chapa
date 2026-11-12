import type { CuisineId } from "@/lib/profile/cuisines"
import type { Uf } from "@/lib/profile/states"
import type { PlanId } from "@/lib/types"

export const PROFILE_VERSION = 2
export const CUISINE_TEXT_MAX_CHARS = 30
export type { CuisineId, Uf }
export type Cuisine = { id: CuisineId } | { id: "outro"; text: string }
export type ProfileLocation = { uf: Uf; cityCode?: number }
export type City = { code: number; name: string; uf: Uf }

export type RestaurantProfile = {
  version: 2
  plan?: PlanId
  name?: string
  cuisine?: Cuisine
  location?: ProfileLocation
  hours?: WeekHours
}

export const DAY_IDS = ["seg", "ter", "qua", "qui", "sex", "sab", "dom"] as const
export type DayId = (typeof DAY_IDS)[number]
export type Shift = { open: string; close: string } // "HH:MM", minutos 00 ou 30
export type WeekHours = Record<DayId, Shift[]> // [] = fechado; no máximo 2 turnos

export type ProfileErrorField = "name" | "cuisine" | "location" | "hours" | `hours.${DayId}`
export type ProfileResponse = { profile: RestaurantProfile; needsReview: boolean }
export type ProfileUpdateRequest = RestaurantProfile & { plan: PlanId }
