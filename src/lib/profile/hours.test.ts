import { describe, expect, it } from "vitest"
import {
  copyShifts,
  crossesMidnight,
  DAY_LABELS,
  firstOpenDay,
  formatWeekHours,
  hourOptions,
  parseWeekHours,
  WEEKDAYS,
} from "@/lib/profile/hours"
import { DAY_IDS, type DayId, type Shift, type WeekHours } from "@/lib/profile/types"
import { VALIDATION_MESSAGES } from "@/lib/validation-messages"

function week(days: Partial<Record<DayId, Shift[]>> = {}): WeekHours {
  return { seg: [], ter: [], qua: [], qui: [], sex: [], sab: [], dom: [], ...days }
}

function s(open: string, close: string): Shift {
  return { open, close }
}

const LUNCH = s("11:00", "15:00")
const DINNER = s("18:00", "23:00")

describe("parseWeekHours: format", () => {
  it("accepts a valid grid and returns a clean copy", () => {
    const input = week({ seg: [LUNCH, DINNER], sab: [s("18:00", "02:00")] })
    const result = parseWeekHours(input)
    expect(result).toEqual({ ok: true, value: input })
    if (result.ok) expect(result.value).not.toBe(input)
  })

  it("turns a grid without shifts into no hours", () => {
    expect(parseWeekHours(week())).toEqual({ ok: true, value: undefined })
  })

  it.each([
    ["text", "11h às 15h"],
    ["null", null],
    ["array", []],
    ["number", 5],
    ["missing key", { seg: [], ter: [], qua: [], qui: [], sex: [], sab: [] }],
    ["extra key", { ...week(), feriado: [] }],
    ["day not a list", { ...week(), seg: "11:00" }],
    [
      "three shifts",
      week({ seg: [s("06:00", "08:00"), s("09:00", "10:00"), s("11:00", "12:00")] }),
    ],
    ["minute out of step", week({ seg: [s("11:15", "15:00")] })],
    ["hour 24", week({ seg: [s("24:00", "15:00")] })],
    ["no leading zero", week({ seg: [s("9:00", "15:00")] })],
    ["extra shift key", week({ seg: [{ open: "11:00", close: "15:00", x: 1 } as Shift] })],
    ["shift not an object", { ...week(), seg: ["11:00"] }],
    ["time not text", { ...week(), seg: [{ open: 1100, close: "15:00" }] }],
  ])("refuses %s with field hours", (_name, value) => {
    expect(parseWeekHours(value)).toEqual({
      ok: false,
      field: "hours",
      error: VALIDATION_MESSAGES.hoursFormat,
    })
  })
})

describe("parseWeekHours: rules of a day", () => {
  it("refuses equal open and close", () => {
    expect(parseWeekHours(week({ seg: [s("18:00", "18:00")] }))).toEqual({
      ok: false,
      field: "hours.seg",
      error: "Na segunda, o horário de abrir e o de fechar precisam ser diferentes.",
    })
  })

  it("uses the right article for saturday", () => {
    const result = parseWeekHours(week({ sab: [s("18:00", "18:00")] }))
    expect(result).toMatchObject({ ok: false, field: "hours.sab" })
    if (!result.ok) expect(result.error).toMatch(/^No sábado,/)
  })

  it("refuses overlapping shifts", () => {
    expect(parseWeekHours(week({ ter: [s("11:00", "15:00"), s("14:30", "23:00")] }))).toEqual({
      ok: false,
      field: "hours.ter",
      error: "Na terça, o segundo turno precisa começar depois do fim do primeiro.",
    })
  })

  it("refuses a second shift that starts exactly when the first ends", () => {
    expect(parseWeekHours(week({ ter: [s("11:00", "15:00"), s("15:00", "23:00")] }))).toMatchObject(
      {
        ok: false,
        field: "hours.ter",
      },
    )
  })

  it("refuses a first shift that crosses midnight when there is a second one", () => {
    expect(parseWeekHours(week({ qua: [s("18:00", "02:00"), s("19:00", "23:00")] }))).toMatchObject(
      { ok: false, field: "hours.qua" },
    )
  })

  it("accepts a last shift that crosses midnight after another shift", () => {
    expect(parseWeekHours(week({ qua: [LUNCH, s("18:00", "02:00")] })).ok).toBe(true)
  })

  it("refuses a late shift that invades the next day", () => {
    expect(
      parseWeekHours(week({ sex: [s("18:00", "02:00")], sab: [s("01:00", "05:00")] })),
    ).toEqual({
      ok: false,
      field: "hours.sex",
      error: "O turno de sexta que passa da meia-noite invade o primeiro turno de sábado.",
    })
  })

  it("accepts a late shift that turns the day", () => {
    expect(parseWeekHours(week({ sex: [s("18:00", "02:00")], sab: [LUNCH] })).ok).toBe(true)
  })

  it("accepts a late shift that ends exactly when the next day opens", () => {
    expect(
      parseWeekHours(week({ sex: [s("18:00", "02:00")], sab: [s("02:00", "05:00")] })).ok,
    ).toBe(true)
  })

  it("accepts a late shift before a closed day", () => {
    expect(parseWeekHours(week({ sex: [s("18:00", "04:00")] })).ok).toBe(true)
  })

  it("makes sunday wrap to monday", () => {
    expect(
      parseWeekHours(week({ dom: [s("18:00", "03:00")], seg: [s("02:00", "08:00")] })),
    ).toEqual({
      ok: false,
      field: "hours.dom",
      error: "O turno de domingo que passa da meia-noite invade o primeiro turno de segunda.",
    })
  })

  it("reports the first error from monday to sunday", () => {
    const result = parseWeekHours(
      week({ qui: [s("10:00", "10:00")], ter: [s("11:00", "15:00"), s("14:00", "20:00")] }),
    )
    expect(result).toMatchObject({ ok: false, field: "hours.ter" })
  })
})

describe("formatWeekHours", () => {
  it("groups weekdays and keeps the late saturday and the closed sunday", () => {
    const hours = week({
      seg: [LUNCH, DINNER],
      ter: [LUNCH, DINNER],
      qua: [LUNCH, DINNER],
      qui: [LUNCH, DINNER],
      sex: [LUNCH, DINNER],
      sab: [s("18:00", "02:00")],
    })
    expect(formatWeekHours(hours)).toBe(
      "seg a sex, 11h às 15h e 18h às 23h; sáb, 18h às 2h (dia seguinte); dom, fechado",
    )
  })

  it("says todos os dias when the week is the same", () => {
    const all = Object.fromEntries(DAY_IDS.map((d) => [d, [s("11:00", "23:00")]]))
    expect(formatWeekHours(week(all))).toBe("todos os dias, 11h às 23h")
  })

  it("keeps alternate days apart", () => {
    const night = [s("18:00", "22:30")]
    expect(formatWeekHours(week({ seg: night, qua: night, sex: night }))).toBe(
      "seg, 18h às 22h30; ter, fechado; qua, 18h às 22h30; qui, fechado; sex, 18h às 22h30; sáb e dom, fechado",
    )
  })

  it("joins a group of two days with e", () => {
    const hours = week({ sab: [LUNCH], dom: [LUNCH] })
    expect(formatWeekHours(hours)).toBe("seg a sex, fechado; sáb e dom, 11h às 15h")
  })

  it("writes half hours and midnight without leading zero", () => {
    expect(formatWeekHours(week({ seg: [s("11:30", "00:00")] }))).toContain(
      "seg, 11h30 às 0h (dia seguinte)",
    )
  })

  it("does not wrap the groups around the week", () => {
    const hours = week({ seg: [LUNCH], dom: [LUNCH] })
    expect(formatWeekHours(hours)).toBe("seg, 11h às 15h; ter a sáb, fechado; dom, 11h às 15h")
  })
})

describe("hour helpers", () => {
  it("lists 48 options from 00:00 to 23:30", () => {
    const options = hourOptions()
    expect(options).toHaveLength(48)
    expect(options[0]).toBe("00:00")
    expect(options[1]).toBe("00:30")
    expect(options[47]).toBe("23:30")
  })

  it("detects a shift that crosses midnight", () => {
    expect(crossesMidnight(s("18:00", "02:00"))).toBe(true)
    expect(crossesMidnight(s("11:00", "15:00"))).toBe(false)
    expect(crossesMidnight(s("11:00", "11:00"))).toBe(false)
  })

  it("finds the first open day from monday to sunday", () => {
    expect(firstOpenDay(week())).toBeNull()
    expect(firstOpenDay(week({ qui: [LUNCH], sab: [DINNER] }))).toBe("qui")
  })

  it("has the weekdays and the labels", () => {
    expect(WEEKDAYS).toEqual(["seg", "ter", "qua", "qui", "sex"])
    expect(DAY_LABELS.ter).toBe("terça")
    expect(DAY_LABELS.sab).toBe("sábado")
  })
})

describe("copyShifts", () => {
  const origin = week({ ter: [LUNCH, DINNER], sab: [s("10:00", "12:00")] })

  it("copies to the weekdays without touching the origin or the weekend", () => {
    const result = copyShifts(origin, "ter", WEEKDAYS)
    for (const day of WEEKDAYS) expect(result[day]).toEqual([LUNCH, DINNER])
    expect(result.sab).toEqual([s("10:00", "12:00")])
    expect(result.dom).toEqual([])
    expect(origin.seg).toEqual([])
  })

  it("copies to every day", () => {
    const result = copyShifts(origin, "ter", DAY_IDS)
    for (const day of DAY_IDS) expect(result[day]).toEqual([LUNCH, DINNER])
  })

  it("does not share shift objects between days", () => {
    const result = copyShifts(origin, "ter", DAY_IDS)
    expect(result.seg[0]).not.toBe(result.ter[0])
    expect(result.seg[0]).not.toBe(origin.ter[0])
  })
})
