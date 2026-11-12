import { DAY_IDS, type DayId, type Shift, type WeekHours } from "@/lib/profile/types"
import { VALIDATION_MESSAGES } from "@/lib/validation-messages"

// Regras do formato da grade, não parâmetros de RAG nem de limite (por isso fora de src/config.ts).
export const HOUR_STEP_MINUTES = 30
export const MAX_SHIFTS_PER_DAY = 2

const DAY_MINUTES = 24 * 60
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/

export const DAY_LABELS: Readonly<Record<DayId, string>> = {
  seg: "segunda",
  ter: "terça",
  qua: "quarta",
  qui: "quinta",
  sex: "sexta",
  sab: "sábado",
  dom: "domingo",
}

const SHORT_LABELS: Readonly<Record<DayId, string>> = {
  seg: "seg",
  ter: "ter",
  qua: "qua",
  qui: "qui",
  sex: "sex",
  sab: "sáb",
  dom: "dom",
}

export const WEEKDAYS: readonly DayId[] = ["seg", "ter", "qua", "qui", "sex"]

type HoursFailure = { ok: false; field: "hours" | `hours.${DayId}`; error: string }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function toMinutes(time: string): number | null {
  const match = TIME_PATTERN.exec(time)
  if (!match) return null
  const minutes = Number(match[1]) * 60 + Number(match[2])
  return minutes % HOUR_STEP_MINUTES === 0 ? minutes : null
}

// Só o formato: as 7 chaves, até 2 turnos por dia, HH:MM no passo. Devolve uma cópia limpa.
function parseShape(value: unknown): WeekHours | null {
  if (!isRecord(value)) return null
  const keys = Object.keys(value)
  if (keys.length !== DAY_IDS.length || DAY_IDS.some((day) => !keys.includes(day))) return null
  const result = {} as WeekHours
  for (const day of DAY_IDS) {
    const list = value[day]
    if (!Array.isArray(list) || list.length > MAX_SHIFTS_PER_DAY) return null
    const shifts: Shift[] = []
    for (const raw of list) {
      if (!isRecord(raw)) return null
      const rawKeys = Object.keys(raw)
      if (rawKeys.length !== 2 || !("open" in raw) || !("close" in raw)) return null
      const { open, close } = raw
      if (typeof open !== "string" || typeof close !== "string") return null
      if (toMinutes(open) === null || toMinutes(close) === null) return null
      shifts.push({ open, close })
    }
    result[day] = shifts
  }
  return result
}

function minutesOf(time: string): number {
  return toMinutes(time) ?? 0
}

// Fim do turno em minutos desde a meia-noite do dia em que ele abre (passa de 1440 na madrugada).
function endOf(shift: Shift): number {
  const open = minutesOf(shift.open)
  const close = minutesOf(shift.close)
  return close < open ? close + DAY_MINUTES : close
}

export function crossesMidnight(shift: Shift): boolean {
  return minutesOf(shift.close) < minutesOf(shift.open)
}

function dayFailure(day: DayId, error: string): HoursFailure {
  return { ok: false, field: `hours.${day}`, error }
}

function checkDay(hours: WeekHours, day: DayId, index: number): HoursFailure | null {
  const label = DAY_LABELS[day]
  const shifts = hours[day]
  for (const shift of shifts) {
    if (shift.open === shift.close) {
      return dayFailure(day, VALIDATION_MESSAGES.hoursSameTime(label))
    }
  }
  const [first, second] = shifts
  if (first && second && minutesOf(second.open) <= endOf(first)) {
    return dayFailure(day, VALIDATION_MESSAGES.hoursOverlap(label))
  }
  const last = shifts[shifts.length - 1]
  if (last && crossesMidnight(last)) {
    const nextDay = DAY_IDS[(index + 1) % DAY_IDS.length] as DayId
    const nextFirst = hours[nextDay][0]
    if (nextFirst && minutesOf(last.close) > minutesOf(nextFirst.open)) {
      return dayFailure(day, VALIDATION_MESSAGES.hoursOvernight(label, DAY_LABELS[nextDay]))
    }
  }
  return null
}

export function parseWeekHours(
  value: unknown,
): { ok: true; value: WeekHours | undefined } | HoursFailure {
  const hours = parseShape(value)
  if (hours === null) return { ok: false, field: "hours", error: VALIDATION_MESSAGES.hoursFormat }
  for (const [index, day] of DAY_IDS.entries()) {
    const failure = checkDay(hours, day, index)
    if (failure) return failure
  }
  const anyShift = DAY_IDS.some((day) => hours[day].length > 0)
  return { ok: true, value: anyShift ? hours : undefined }
}

// "11h", "11h30", "0h".
function formatTime(time: string): string {
  const minutes = minutesOf(time)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m === 0 ? `${h}h` : `${h}h${String(m).padStart(2, "0")}`
}

function formatShifts(shifts: readonly Shift[]): string {
  if (shifts.length === 0) return "fechado"
  return shifts
    .map(
      (shift) =>
        `${formatTime(shift.open)} às ${formatTime(shift.close)}${
          crossesMidnight(shift) ? " (dia seguinte)" : ""
        }`,
    )
    .join(" e ")
}

function groupLabel(days: readonly DayId[]): string {
  const first = SHORT_LABELS[days[0] as DayId]
  const last = SHORT_LABELS[days[days.length - 1] as DayId]
  if (days.length === 1) return first
  return days.length === 2 ? `${first} e ${last}` : `${first} a ${last}`
}

// O texto depois de "Horário: ": dias seguidos com os mesmos turnos viram um grupo.
export function formatWeekHours(hours: WeekHours): string {
  const groups: { days: DayId[]; text: string }[] = []
  for (const day of DAY_IDS) {
    const text = formatShifts(hours[day])
    const last = groups[groups.length - 1]
    if (last && last.text === text) last.days.push(day)
    else groups.push({ days: [day], text })
  }
  const [only] = groups
  if (groups.length === 1 && only) return `todos os dias, ${only.text}`
  return groups.map((group) => `${groupLabel(group.days)}, ${group.text}`).join("; ")
}

export function hourOptions(): readonly string[] {
  const options: string[] = []
  for (let minutes = 0; minutes < DAY_MINUTES; minutes += HOUR_STEP_MINUTES) {
    const h = String(Math.floor(minutes / 60)).padStart(2, "0")
    const m = String(minutes % 60).padStart(2, "0")
    options.push(`${h}:${m}`)
  }
  return options
}

export function firstOpenDay(hours: WeekHours): DayId | null {
  return DAY_IDS.find((day) => hours[day].length > 0) ?? null
}

export function copyShifts(hours: WeekHours, from: DayId, to: readonly DayId[]): WeekHours {
  const result = {} as WeekHours
  for (const day of DAY_IDS) result[day] = hours[day].map((shift) => ({ ...shift }))
  for (const day of to) {
    if (day !== from) result[day] = hours[from].map((shift) => ({ ...shift }))
  }
  return result
}
