"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CUISINES, type CuisineId, isCuisineId } from "@/lib/profile/cuisines"
import { CUISINE_TEXT_MAX_CHARS, type Cuisine } from "@/lib/types"
import { SearchCombobox } from "./search-combobox"

// O que a pessoa escolheu: `id` null é "ainda não escolheu"; `text` só vale com "outro".
export type CuisineDraft = { id: CuisineId | "outro" | null; text: string }

export const EMPTY_CUISINE_DRAFT: CuisineDraft = { id: null, text: "" }

export function draftFromCuisine(cuisine: Cuisine | undefined): CuisineDraft {
  if (cuisine === undefined) return EMPTY_CUISINE_DRAFT
  return cuisine.id === "outro" ? { id: "outro", text: cuisine.text } : { id: cuisine.id, text: "" }
}

export function cuisineFromDraft(draft: CuisineDraft): Cuisine | undefined {
  if (draft.id === null) return undefined
  return draft.id === "outro" ? { id: "outro", text: draft.text.trim() } : { id: draft.id }
}

const OTHER_VALUE = "outro"
const OPTIONS = [
  ...CUISINES.map((c) => ({ value: c.id, label: c.label })),
  { value: OTHER_VALUE, label: "Outro" },
]

/** Id do controle que recebe o foco e o erro: o texto, com "Outro", senão o combobox. */
export function cuisineErrorTargetId(id: string, draft: CuisineDraft): string {
  return draft.id === "outro" ? `${id}-other` : id
}

type CuisineFieldProps = {
  id: string
  draft: CuisineDraft
  onChange: (draft: CuisineDraft) => void
  onTextBlur: () => void
  error?: string
}

export function CuisineField({ id, draft, onChange, onTextBlur, error }: CuisineFieldProps) {
  const errorId = `${id}-error`
  const otherId = `${id}-other`
  const describedBy = error !== undefined ? errorId : undefined
  const isOther = draft.id === "outro"
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>Tipo de cozinha</Label>
      <SearchCombobox
        id={id}
        options={OPTIONS}
        value={draft.id}
        onValueChange={(value) => {
          if (value === OTHER_VALUE) onChange({ id: "outro", text: draft.text })
          else if (isCuisineId(value)) onChange({ id: value, text: "" })
        }}
        placeholder="Escolha o tipo de cozinha"
        searchPlaceholder="Buscar tipo de cozinha…"
        emptyText="Nenhum tipo encontrado."
        invalid={error !== undefined && !isOther}
        describedBy={isOther ? undefined : describedBy}
        otherOption={{
          label: (query) => `Usar "${query}" como Outro`,
          onSelect: (query) =>
            onChange({ id: "outro", text: query.slice(0, CUISINE_TEXT_MAX_CHARS) }),
        }}
      />
      {isOther && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={otherId}>Descreva o tipo de cozinha</Label>
          <Input
            id={otherId}
            name="cuisineText"
            value={draft.text}
            maxLength={CUISINE_TEXT_MAX_CHARS}
            placeholder="Ex.: tailandesa…"
            autoComplete="off"
            aria-required="true"
            aria-invalid={error !== undefined ? true : undefined}
            aria-describedby={describedBy}
            onChange={(event) => onChange({ id: "outro", text: event.target.value })}
            onBlur={onTextBlur}
          />
        </div>
      )}
      {error !== undefined && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
