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
import {
  checkProfileText,
  type ProfileTextField,
  profileTextMessage,
} from "@/lib/moderation/profile-text"
import { isPlanId } from "@/lib/plans"
import {
  PLAN_IDS,
  PLAN_LABELS,
  type PlanId,
  PROFILE_FIELD_MAX_CHARS,
  type RestaurantProfile,
} from "@/lib/types"

type TextField = "name" | "cuisine" | "city" | "hours"

const TEXT_FIELDS: { key: TextField; label: string; placeholder: string }[] = [
  { key: "name", label: "Nome do restaurante", placeholder: "Ex.: Pizzaria Bella…" },
  { key: "cuisine", label: "Tipo de cozinha", placeholder: "Ex.: italiana…" },
  { key: "city", label: "Cidade", placeholder: "Ex.: Campinas…" },
  { key: "hours", label: "Horário de funcionamento", placeholder: "Ex.: 18h às 23h…" },
]

const FILTERED_FIELDS: readonly ProfileTextField[] = ["name", "cuisine"]

type FieldErrors = Partial<Record<ProfileTextField, string>>

function isFilteredField(key: TextField): key is ProfileTextField {
  return key === "name" || key === "cuisine"
}

// Uma função só decide: a mesma checagem roda no servidor (PUT /api/profile).
function textError(field: ProfileTextField, value: string): string | undefined {
  const check = checkProfileText(field, value.trim())
  return check.ok ? undefined : profileTextMessage(field, check.reason)
}

const PLAN_REQUIRED_MESSAGE = "Escolha o plano do restaurante na Rango."

type ProfileFormProps = {
  profile: RestaurantProfile
  firstAccess: boolean
  notice: string
}

export function ProfileForm({ profile, firstAccess, notice }: ProfileFormProps) {
  const router = useRouter()
  const idPrefix = useId()
  const [values, setValues] = useState<Record<TextField, string>>({
    name: profile.name ?? "",
    cuisine: profile.cuisine ?? "",
    city: profile.city ?? "",
    hours: profile.hours ?? "",
  })
  const [plan, setPlan] = useState<PlanId | "">(profile.plan ?? "")
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [planError, setPlanError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const planGroupRef = useRef<HTMLDivElement>(null)
  const legendId = `${idPrefix}-plan-legend`
  const planErrorId = `${idPrefix}-plan-error`
  const errorId = `${idPrefix}-error`

  function focusField(key: TextField): void {
    document.getElementById(`${idPrefix}-${key}`)?.focus()
  }

  function validateField(key: ProfileTextField, value: string): void {
    const message = textError(key, value)
    setFieldErrors((current) => {
      const { [key]: _removed, ...rest } = current
      return message === undefined ? rest : { ...rest, [key]: message }
    })
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (saving) return
    const nextErrors: FieldErrors = {}
    for (const key of FILTERED_FIELDS) {
      const message = textError(key, values[key])
      if (message !== undefined) nextErrors[key] = message
    }
    setFieldErrors(nextErrors)
    const firstInvalid = FILTERED_FIELDS.find((key) => nextErrors[key] !== undefined)
    if (plan === "") setPlanError(PLAN_REQUIRED_MESSAGE)
    if (firstInvalid !== undefined) {
      focusField(firstInvalid)
      return
    }
    if (plan === "") {
      planGroupRef.current?.querySelector<HTMLElement>("[role=radio]")?.focus()
      return
    }
    setPlanError(null)
    setError(null)
    setSaving(true)
    const result = await saveProfile({
      plan,
      ...(values.name.trim() !== "" ? { name: values.name.trim() } : {}),
      ...(values.cuisine.trim() !== "" ? { cuisine: values.cuisine.trim() } : {}),
      ...(values.city.trim() !== "" ? { city: values.city.trim() } : {}),
      ...(values.hours.trim() !== "" ? { hours: values.hours.trim() } : {}),
    })
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
    if (result.field !== undefined) {
      const field = result.field
      setFieldErrors({ [field]: result.error })
      focusField(field)
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
      <p className="text-sm text-muted-foreground">{notice}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {TEXT_FIELDS.map((field) => {
          const inputId = `${idPrefix}-${field.key}`
          const fieldKey = isFilteredField(field.key) ? field.key : null
          const fieldError = fieldKey !== null ? fieldErrors[fieldKey] : undefined
          const fieldErrorId = `${inputId}-error`
          return (
            <div key={field.key} className="flex flex-col gap-1.5">
              <Label htmlFor={inputId}>{field.label}</Label>
              <Input
                id={inputId}
                name={field.key}
                value={values[field.key]}
                maxLength={PROFILE_FIELD_MAX_CHARS}
                placeholder={field.placeholder}
                autoComplete="off"
                aria-invalid={fieldError !== undefined ? true : undefined}
                aria-describedby={fieldError !== undefined ? fieldErrorId : undefined}
                onChange={(event) => {
                  setValues({ ...values, [field.key]: event.target.value })
                  if (fieldKey !== null && fieldError !== undefined) {
                    setFieldErrors(({ [fieldKey]: _removed, ...rest }) => rest)
                  }
                }}
                onBlur={(event) => {
                  if (fieldKey !== null) validateField(fieldKey, event.target.value)
                }}
              />
              {fieldError !== undefined && (
                <p id={fieldErrorId} role="alert" className="text-sm text-destructive">
                  {fieldError}
                </p>
              )}
            </div>
          )
        })}
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
