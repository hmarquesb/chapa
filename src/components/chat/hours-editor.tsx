"use client"

import { ChevronDownIcon, PlusIcon, XIcon } from "lucide-react"
import { useEffect, useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { Switch } from "@/components/ui/switch"
import {
  copyShifts,
  crossesMidnight,
  DAY_LABELS,
  firstOpenDay,
  HOUR_STEP_MINUTES,
  hourOptions,
  MAX_SHIFTS_PER_DAY,
  WEEKDAYS,
} from "@/lib/profile/hours"
import { DAY_IDS, type DayId, type Shift, type WeekHours } from "@/lib/profile/types"

const DEFAULT_SHIFT: Shift = { open: "11:00", close: "15:00" }
const HOURS = hourOptions()

// Pedido de foco no primeiro seletor de um dia; `nonce` muda a cada envio com erro.
export type HoursFocusRequest = { day: DayId; nonce: number }

type HoursEditorProps = {
  value: WeekHours
  onChange: (next: WeekHours) => void
  errors: Partial<Record<DayId, string>>
  defaultOpen: boolean
  focusRequest?: HoursFocusRequest | null
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1)
}

function minutesOf(time: string): number {
  const [h = "0", m = "0"] = time.split(":")
  return Number(h) * 60 + Number(m)
}

function timeOf(minutes: number): string {
  const h = String(Math.floor(minutes / 60)).padStart(2, "0")
  const m = String(minutes % 60).padStart(2, "0")
  return `${h}:${m}`
}

// O 2º turno nasce uma hora depois do fim do 1º (no máximo 22:00) e vai até 23:30.
function nextShift(previous: Shift | undefined): Shift {
  if (!previous) return { ...DEFAULT_SHIFT }
  const open = Math.min(minutesOf(previous.close) + 60, 22 * 60)
  return { open: timeOf(open - (open % HOUR_STEP_MINUTES)), close: "23:30" }
}

const SHIFT_NAMES = ["primeiro", "segundo"] as const

export function HoursEditor({
  value,
  onChange,
  errors,
  defaultOpen,
  focusRequest = null,
}: HoursEditorProps) {
  const idPrefix = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(defaultOpen)
  const [pendingFocus, setPendingFocus] = useState<DayId | null>(null)
  const source = firstOpenDay(value)

  // Um envio com erro abre a seção (se estiver recolhida) e leva o foco ao seletor do dia.
  useEffect(() => {
    if (focusRequest === null) return
    setOpen(true)
    setPendingFocus(focusRequest.day)
  }, [focusRequest])

  useEffect(() => {
    if (pendingFocus === null || !open) return
    rootRef.current?.querySelector<HTMLElement>(`[data-day="${pendingFocus}"] select`)?.focus()
    setPendingFocus(null)
  }, [pendingFocus, open])

  function setDay(day: DayId, shifts: Shift[]): void {
    onChange({ ...value, [day]: shifts })
  }

  function toggleDay(day: DayId, checked: boolean): void {
    if (!checked) {
      setDay(day, [])
      return
    }
    const base = source === null ? [DEFAULT_SHIFT] : value[source]
    setDay(
      day,
      base.map((shift) => ({ ...shift })),
    )
  }

  function updateShift(day: DayId, index: number, field: keyof Shift, time: string): void {
    setDay(
      day,
      value[day].map((shift, i) => (i === index ? { ...shift, [field]: time } : shift)),
    )
  }

  function addShift(day: DayId): void {
    setDay(day, [...value[day], nextShift(value[day][value[day].length - 1])])
  }

  function removeShift(day: DayId, index: number): void {
    setDay(
      day,
      value[day].filter((_, i) => i !== index),
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="flex flex-col gap-3">
      <CollapsibleTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="w-full justify-between [&[data-state=open]>svg]:rotate-180"
        >
          Horário de funcionamento · opcional
          <ChevronDownIcon aria-hidden="true" className="transition-transform" />
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div ref={rootRef} className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={source === null}
              onClick={() => source !== null && onChange(copyShifts(value, source, WEEKDAYS))}
            >
              Copiar para os dias úteis
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={source === null}
              onClick={() => source !== null && onChange(copyShifts(value, source, DAY_IDS))}
            >
              Copiar para todos os dias
            </Button>
          </div>
          <ul className="flex flex-col divide-y divide-border">
            {DAY_IDS.map((day) => {
              const label = capitalize(DAY_LABELS[day])
              const shifts = value[day]
              const isOpen = shifts.length > 0
              const switchId = `${idPrefix}-${day}-switch`
              const errorId = `${idPrefix}-${day}-error`
              const error = errors[day]
              return (
                <li key={day} data-day={day} className="flex flex-col gap-2 py-3 first:pt-0">
                  <div className="flex items-center gap-3">
                    <Switch
                      id={switchId}
                      checked={isOpen}
                      onCheckedChange={(checked) => toggleDay(day, checked)}
                    />
                    <Label htmlFor={switchId} className="min-w-20 font-medium">
                      {label}
                    </Label>
                    <span className="text-sm text-muted-foreground">
                      {isOpen ? "Aberto" : "Fechado"}
                    </span>
                  </div>
                  {shifts.map((shift, index) => {
                    const shiftName = SHIFT_NAMES[index] ?? "primeiro"
                    return (
                      <div
                        // biome-ignore lint/suspicious/noArrayIndexKey: o turno não tem id; a posição é a identidade
                        key={index}
                        className="flex flex-wrap items-center gap-2 pl-0 sm:pl-14"
                      >
                        <NativeSelect
                          value={shift.open}
                          aria-label={`${label}, ${shiftName} turno, abre às`}
                          aria-invalid={error !== undefined ? true : undefined}
                          aria-describedby={error !== undefined ? errorId : undefined}
                          onChange={(event) => updateShift(day, index, "open", event.target.value)}
                        >
                          {HOURS.map((hour) => (
                            <NativeSelectOption key={hour} value={hour}>
                              {hour}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                        <span className="text-sm text-muted-foreground" aria-hidden="true">
                          às
                        </span>
                        <NativeSelect
                          value={shift.close}
                          aria-label={`${label}, ${shiftName} turno, fecha às`}
                          aria-invalid={error !== undefined ? true : undefined}
                          aria-describedby={error !== undefined ? errorId : undefined}
                          onChange={(event) => updateShift(day, index, "close", event.target.value)}
                        >
                          {HOURS.map((hour) => (
                            <NativeSelectOption key={hour} value={hour}>
                              {hour}
                            </NativeSelectOption>
                          ))}
                        </NativeSelect>
                        {crossesMidnight(shift) && (
                          <span className="text-sm text-muted-foreground">(dia seguinte)</span>
                        )}
                        {shifts.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeShift(day, index)}
                          >
                            <XIcon aria-hidden="true" />
                            Remover turno
                            <span className="sr-only">
                              {" "}
                              de {label.toLowerCase()}, {shiftName} turno
                            </span>
                          </Button>
                        )}
                      </div>
                    )
                  })}
                  {isOpen && shifts.length < MAX_SHIFTS_PER_DAY && (
                    <div className="sm:pl-14">
                      <Button type="button" variant="ghost" size="sm" onClick={() => addShift(day)}>
                        <PlusIcon aria-hidden="true" />
                        turno
                        <span className="sr-only"> de {label.toLowerCase()}</span>
                      </Button>
                    </div>
                  )}
                  {error !== undefined && (
                    <p id={errorId} role="alert" className="text-sm text-destructive sm:pl-14">
                      {error}
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
