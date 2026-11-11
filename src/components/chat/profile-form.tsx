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
  const [planError, setPlanError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const planGroupRef = useRef<HTMLDivElement>(null)
  const legendId = `${idPrefix}-plan-legend`
  const planErrorId = `${idPrefix}-plan-error`
  const errorId = `${idPrefix}-error`

  async function onSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault()
    if (saving) return
    if (plan === "") {
      setPlanError(PLAN_REQUIRED_MESSAGE)
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
    setError(result.error)
  }

  return (
    <form onSubmit={(event) => void onSubmit(event)} className="flex flex-col gap-5" noValidate>
      <p className="text-sm text-muted-foreground">{notice}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        {TEXT_FIELDS.map((field) => {
          const inputId = `${idPrefix}-${field.key}`
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
                onChange={(event) => setValues({ ...values, [field.key]: event.target.value })}
              />
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
