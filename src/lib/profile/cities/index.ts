// Gerado por scripts/ibge/generate-cities.ts. Não edite à mão.
import type { Uf } from "@/lib/profile/states"

export const CITIES_EXTRACTED_AT = "2026-11-11"
export const CITY_COUNT = 5571

export type CitiesModule = { CITIES: readonly (readonly [code: number, name: string])[] }

export const CITY_LOADERS: Record<Uf, () => Promise<CitiesModule>> = {
  AC: () => import("./ac"),
  AL: () => import("./al"),
  AP: () => import("./ap"),
  AM: () => import("./am"),
  BA: () => import("./ba"),
  CE: () => import("./ce"),
  DF: () => import("./df"),
  ES: () => import("./es"),
  GO: () => import("./go"),
  MA: () => import("./ma"),
  MT: () => import("./mt"),
  MS: () => import("./ms"),
  MG: () => import("./mg"),
  PA: () => import("./pa"),
  PB: () => import("./pb"),
  PR: () => import("./pr"),
  PE: () => import("./pe"),
  PI: () => import("./pi"),
  RJ: () => import("./rj"),
  RN: () => import("./rn"),
  RS: () => import("./rs"),
  RO: () => import("./ro"),
  RR: () => import("./rr"),
  SC: () => import("./sc"),
  SP: () => import("./sp"),
  SE: () => import("./se"),
  TO: () => import("./to"),
}
