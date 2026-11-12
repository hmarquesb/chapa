"use client"

import { CircleAlertIcon } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { type FormEvent, useId, useRef, useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { saveProfile } from "@/lib/api-client"
import { checkProfileText, profileTextMessage } from "@/lib/moderation/profile-text"
import { isPlanId } from "@/lib/plans"
import { parseWeekHours } from "@/lib/profile/hours"
import { DAY_IDS, type DayId, type WeekHours } from "@/lib/profile/types"
import {
  CUISINE_TEXT_MAX_CHARS,
  PLAN_IDS,
  PLAN_LABELS,
  type PlanId,
  PROFILE_FIELD_MAX_CHARS,
  type ProfileErrorField,
  type ProfileUpdateRequest,
  type RestaurantProfile,
} from "@/lib/types"
import { VALIDATION_MESSAGES } from "@/lib/validation-messages"
import {
  type CuisineDraft,
  CuisineField,
  cuisineErrorTargetId,
  cuisineFromDraft,
  draftFromCuisine,
} from "./cuisine-field"
import { HoursEditor, type HoursFocusRequest } from "./hours-editor"
import {
  EMPTY_LOCATION_DRAFT,
  type LocationDraft,
  LocationFields,
  locationErrorTargetId,
} from "./location-fields"

type FieldErrors = Partial<Record<"name" | "cuisine" | "location", string>>
type DayErrors = Partial<Record<DayId, string>>

const EMPTY_HOURS: WeekHours = { seg: [], ter: [], qua: [], qui: [], sex: [], sab: [], dom: [] }

function dayOfHoursField(field: ProfileErrorField): DayId | null {
  const day = DAY_IDS.find((id) => field === `hours.${id}`)
  return day ?? null
}

const PLAN_REQUIRED_MESSAGE = "Escolha o plano do restaurante na Rango."

// Uma função só decide o texto do nome: a mesma checagem roda no servidor (PUT /api/profile).
function nameError(value: string): string | undefined {
  const check = checkProfileText("name", value.trim())
  return check.ok ? undefined : profileTextMessage("name", check.reason)
}

function cuisineError(draft: CuisineDraft): string | undefined {
  if (draft.id !== "outro") return undefined
  const text = draft.text.trim()
  if (text === "" || text.length > CUISINE_TEXT_MAX_CHARS) return VALIDATION_MESSAGES.cuisineText
  const check = checkProfileText("cuisine", text)
  return check.ok ? undefined : profileTextMessage("cuisine", check.reason)
}

function locationDraftFrom(profile: RestaurantProfile): LocationDraft {
  if (profile.location === undefined) return EMPTY_LOCATION_DRAFT
  return { uf: profile.location.uf, cityCode: profile.location.cityCode ?? null }
}

type ProfileFormProps = {
  profile: RestaurantProfile
  firstAccess: boolean
  notice: string
  needsReview?: boolean
}

export function ProfileForm({
  profile,
  firstAccess,
  notice,
  needsReview = false,
}: ProfileFormProps) {
  const router = useRouter()
  const idPrefix = useId()
  const [name, setName] = useState(profile.name ?? "")
  const [hours, setHours] = useState<WeekHours>(profile.hours ?? EMPTY_HOURS)
  const [dayErrors, setDayErrors] = useState<DayErrors>({})
  const [hoursFocus, setHoursFocus] = useState<HoursFocusRequest | null>(null)
  const [plan, setPlan] = useState<PlanId | "">(profile.plan ?? "")
  const [cuisine, setCuisine] = useState<CuisineDraft>(() => draftFromCuisine(profile.cuisine))
  const [location, setLocation] = useState<LocationDraft>(() => locationDraftFrom(profile))
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [planError, setPlanError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const defaultHoursOpen = profile.hours !== undefined || needsReview

  const planGroupRef = useRef<HTMLDivElement>(null)
  const nameId = `${idPrefix}-name`
  const cuisineId = `${idPrefix}-cuisine`
  const locationId = `${idPrefix}-location`
  const legendId = `${idPrefix}-plan-legend`
  const planErrorId = `${idPrefix}-plan-error`
  const nameErrorId = `${nameId}-error`
  const errorId = `${idPrefix}-error`

  function focusById(id: string): void {
    document.getElementById(id)?.focus()
  }

  function requestHoursFocus(day: DayId): void {
    setHoursFocus((current) => ({ day, nonce: (current?.nonce ?? 0) + 1 }))
  }

  function setFieldError(key: keyof FieldErrors, message: string | undefined): void {
    setFieldErrors((current) => {
      const { [key]: _removed, ...rest } = current
      return message === undefined ? rest : { ...rest, [key]: message }
    })
  }

  function focusPlan(): void {
    planGroupRef.current?.querySelector<HTMLElement>("[role=radio]")?.focus()
  }

  function buildBody(
    selectedPlan: PlanId,
    hoursValue: WeekHours | undefined,
  ): ProfileUpdateRequest {
    const cuisineValue = cuisineFromDraft(cuisine)
    return {
      version: 2,
      plan: selectedPlan,
      ...(name.trim() !== "" ? { name: name.trim() } : {}),
      ...(cuisineValue !== undefined ? { cuisine: cuisineValue } : {}),
      ...(location.uf !== ""
        ? {
            location: {
              uf: location.uf,
              ...(location.cityCode !== null ? { cityCode: location.cityCode } : {}),
            },
          }
        : {}),
      ...(hoursValue !== undefined ? { hours: hoursValue } : {}),
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (saving) return
    const nextErrors: FieldErrors = {}
    const nameMessage = nameError(name)
    if (nameMessage !== undefined) nextErrors.name = nameMessage
    const cuisineMessage = cuisineError(cuisine)
    if (cuisineMessage !== undefined) nextErrors.cuisine = cuisineMessage
    setFieldErrors(nextErrors)
    setPlanError(plan === "" ? PLAN_REQUIRED_MESSAGE : null)

    // Ordem da tela: nome, plano, cozinha. O foco vai ao primeiro com erro.
    if (nextErrors.name !== undefined) return focusById(nameId)
    if (plan === "") return focusPlan()
    if (nextErrors.cuisine !== undefined) return focusById(cuisineErrorTargetId(cuisineId, cuisine))

    const parsedHours = parseWeekHours(hours)
    if (!parsedHours.ok) {
      const day = dayOfHoursField(parsedHours.field)
      if (day !== null) {
        setDayErrors({ [day]: parsedHours.error })
        setError(null)
        return requestHoursFocus(day)
      }
      return setError(parsedHours.error)
    }
    setDayErrors({})

    setError(null)
    setSaving(true)
    const result = await saveProfile(buildBody(plan, parsedHours.value))
    if (result.ok) {
      router.push("/")
      router.refresh()
      return
    }
    setSaving(false)
    if (result.status === 401) {
      router.push("/entrar")
      return
    }
    const hoursDay = result.field === undefined ? null : dayOfHoursField(result.field)
    if (result.field !== undefined && hoursDay !== null) {
      setFieldErrors({})
      setDayErrors({ [hoursDay]: result.error })
      requestHoursFocus(hoursDay)
      return
    }
    if (result.field !== undefined && result.field !== "hours") {
      setFieldErrors({ [result.field]: result.error })
      focusById(
        result.field === "name"
          ? nameId
          : result.field === "cuisine"
            ? cuisineErrorTargetId(cuisineId, cuisine)
            : locationErrorTargetId(locationId),
      )
      return
    }
    setError(result.error)
  }

  return (
    <form
      onSubmit={(event) => void onSubmit(event)}
      className="flex flex-col gap-5 rounded-3xl bg-card p-5 shadow-soft"
      noValidate
    >
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={nameId}>Nome do restaurante</Label>
        <Input
          id={nameId}
          name="name"
          value={name}
          maxLength={PROFILE_FIELD_MAX_CHARS}
          placeholder="Ex.: Pizzaria Bella…"
          autoComplete="off"
          aria-invalid={fieldErrors.name !== undefined ? true : undefined}
          aria-describedby={fieldErrors.name !== undefined ? nameErrorId : undefined}
          onChange={(event) => {
            setName(event.target.value)
            if (fieldErrors.name !== undefined) setFieldError("name", undefined)
          }}
          onBlur={(event) => setFieldError("name", nameError(event.target.value))}
        />
        {fieldErrors.name !== undefined && (
          <p id={nameErrorId} role="alert" className="text-sm text-destructive">
            {fieldErrors.name}
          </p>
        )}
      </div>
      <fieldset
        className="flex flex-col gap-2"
        aria-describedby={planError !== null ? planErrorId : undefined}
      >
        <legend id={legendId} className="mb-1 text-sm font-medium">
          Plano na Rango (obrigatório)
        </legend>
        <RadioGroup
          ref={planGroupRef}
          value={plan}
          onValueChange={(next) => {
            if (isPlanId(next)) {
              setPlan(next)
              setPlanError(null)
            }
          }}
          required
          aria-invalid={planError !== null}
          aria-labelledby={legendId}
        >
          {PLAN_IDS.map((id) => {
            const radioId = `${idPrefix}-plan-${id}`
            return (
              <div key={id} className="flex items-center gap-2">
                <RadioGroupItem value={id} id={radioId} />
                <Label htmlFor={radioId} className="font-normal">
                  {PLAN_LABELS[id]}
                </Label>
              </div>
            )
          })}
        </RadioGroup>
        {planError !== null && (
          <p id={planErrorId} role="alert" className="text-sm text-destructive">
            {planError}
          </p>
        )}
      </fieldset>
      <CuisineField
        id={cuisineId}
        draft={cuisine}
        onChange={(next) => {
          setCuisine(next)
          if (fieldErrors.cuisine !== undefined) setFieldError("cuisine", undefined)
        }}
        onTextBlur={() => setFieldError("cuisine", cuisineError(cuisine))}
        {...(fieldErrors.cuisine !== undefined ? { error: fieldErrors.cuisine } : {})}
      />
      <LocationFields
        id={locationId}
        draft={location}
        onChange={(next) => {
          setLocation(next)
          if (fieldErrors.location !== undefined) setFieldError("location", undefined)
        }}
        {...(fieldErrors.location !== undefined ? { error: fieldErrors.location } : {})}
      />
      <HoursEditor
        value={hours}
        onChange={(next) => {
          setHours(next)
          setDayErrors({})
        }}
        errors={dayErrors}
        defaultOpen={defaultHoursOpen}
        focusRequest={hoursFocus}
      />
      <p className="text-sm text-muted-foreground">{notice}</p>
      {error !== null && (
        <Alert variant="destructive" id={errorId} role="alert">
          <CircleAlertIcon aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={saving}>
          {saving ? "Salvando…" : firstAccess ? "Salvar e começar" : "Salvar"}
        </Button>
        {!firstAccess && (
          <Button variant="ghost" asChild>
            <Link href="/">Voltar ao chat</Link>
          </Button>
        )}
      </div>
    </form>
  )
}
