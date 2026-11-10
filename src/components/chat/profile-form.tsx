"use client"

import { ChevronDownIcon } from "lucide-react"
import { useId, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { hasProfileData } from "@/lib/profile-storage"
import { PROFILE_FIELD_MAX_CHARS, type PROFILE_FIELDS, type RestaurantProfile } from "@/lib/types"
import { cn } from "@/lib/utils"

type ProfileField = (typeof PROFILE_FIELDS)[number]

// "Plano" stays free text (no fixed list). The example names come from knowledge-base/regras.yaml (nomes).
const FIELDS: { key: ProfileField; label: string; placeholder: string }[] = [
  { key: "name", label: "Nome do restaurante", placeholder: "Ex.: Pizzaria Bella" },
  {
    key: "plan",
    label: "Plano na Rango",
    placeholder: "Ex.: Plano Próprio ou Plano Entrega",
  },
  { key: "cuisine", label: "Tipo de cozinha", placeholder: "Ex.: italiana" },
  { key: "city", label: "Cidade", placeholder: "Ex.: Campinas" },
  { key: "hours", label: "Horário de funcionamento", placeholder: "Ex.: 18h às 23h" },
]

type ProfileFormProps = {
  profile: RestaurantProfile
  onChange: (profile: RestaurantProfile) => void
}

export function ProfileForm({ profile, onChange }: ProfileFormProps) {
  const [open, setOpen] = useState(false)
  const idPrefix = useId()
  const filled = hasProfileData(profile)

  return (
    <Card size="sm" className="gap-0 py-0">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="h-auto w-full justify-between rounded-xl px-3 py-3 text-left whitespace-normal"
          >
            <span>
              Perfil do restaurante (opcional)
              {filled && <span className="ml-2 text-xs text-muted-foreground">preenchido</span>}
            </span>
            <ChevronDownIcon
              aria-hidden="true"
              className={cn("transition-transform", open && "rotate-180")}
            />
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="grid gap-3 px-3 pt-1 pb-4 sm:grid-cols-2">
            <p className="text-xs text-muted-foreground sm:col-span-2">
              Ajuda o assistente a adaptar as respostas ao seu restaurante. Não coloque dados
              pessoais.
            </p>
            {FIELDS.map((field) => {
              const inputId = `${idPrefix}-${field.key}`
              return (
                <div key={field.key} className="flex flex-col gap-1.5">
                  <Label htmlFor={inputId}>{field.label}</Label>
                  <Input
                    id={inputId}
                    value={profile[field.key] ?? ""}
                    maxLength={PROFILE_FIELD_MAX_CHARS}
                    placeholder={field.placeholder}
                    autoComplete="off"
                    onChange={(event) => onChange({ ...profile, [field.key]: event.target.value })}
                  />
                </div>
              )
            })}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  )
}
