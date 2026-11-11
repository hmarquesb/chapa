// "14:05", 24-hour clock in pt-BR. Without a time zone, the runtime default is used.
export function formatTime(iso: string, timeZone?: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  return new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(date)
}

// "02-repasse-financeiro.md" → "repasse financeiro"
export function formatSourceLabel(fileName: string): string {
  const base = fileName.split("/").pop() ?? fileName
  const label = base
    .replace(/\.[^.]+$/, "")
    .replace(/^\d+[-_\s]*/, "")
    .replace(/[-_]+/g, " ")
    .trim()
  return label === "" ? fileName : label
}

const DAY_KEY_OPTIONS: Intl.DateTimeFormatOptions = {
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}

// "14:05" on the same calendar day as `now` (in the given time zone), otherwise "10/11".
export function formatActivity(iso: string, now: Date, timeZone?: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ""
  const dayKey = (value: Date) =>
    new Intl.DateTimeFormat("pt-BR", { ...DAY_KEY_OPTIONS, timeZone }).format(value)
  if (dayKey(date) === dayKey(now)) return formatTime(iso, timeZone)
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone }).format(
    date,
  )
}
