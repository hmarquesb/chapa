"use client"

import { useEffect, useState } from "react"
import { Label } from "@/components/ui/label"
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select"
import { loadCities } from "@/lib/profile/cities"
import { isUf, STATES } from "@/lib/profile/states"
import type { City, Uf } from "@/lib/types"
import { SearchCombobox } from "./search-combobox"

// O estado "" é "ainda não escolheu"; a cidade só existe com estado.
export type LocationDraft = { uf: Uf | ""; cityCode: number | null }

export const EMPTY_LOCATION_DRAFT: LocationDraft = { uf: "", cityCode: null }

const CITIES_ERROR_MESSAGE = "Não consegui carregar as cidades. Escolha o estado de novo."

type LocationFieldsProps = {
  id: string
  draft: LocationDraft
  onChange: (draft: LocationDraft) => void
  error?: string
}

/** Id do controle que recebe o foco quando o erro é do local. */
export function locationErrorTargetId(id: string): string {
  return `${id}-uf`
}

export function LocationFields({ id, draft, onChange, error }: LocationFieldsProps) {
  const ufId = `${id}-uf`
  const cityId = `${id}-city`
  const errorId = `${id}-error`
  const describedBy = error !== undefined ? errorId : undefined
  const [loaded, setLoaded] = useState<{ uf: Uf; cities: readonly City[] | null } | null>(null)
  const { uf } = draft

  useEffect(() => {
    if (uf === "") return
    let cancelled = false
    loadCities(uf)
      .then((cities) => {
        if (!cancelled) setLoaded({ uf, cities })
      })
      .catch(() => {
        if (!cancelled) setLoaded({ uf, cities: null })
      })
    return () => {
      cancelled = true
    }
  }, [uf])

  const ready = uf !== "" && loaded?.uf === uf
  const cities = ready ? loaded.cities : null
  const loading = uf !== "" && !ready
  const loadFailed = ready && cities === null
  const options = (cities ?? []).map((city) => ({ value: String(city.code), label: city.name }))
  const selectedName =
    draft.cityCode === null || cities === null
      ? undefined
      : cities.find((city) => city.code === draft.cityCode)?.name

  return (
    <div className="flex flex-col gap-1.5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={ufId}>Estado</Label>
          <NativeSelect
            id={ufId}
            name="uf"
            className="w-full"
            value={draft.uf}
            aria-invalid={error !== undefined ? true : undefined}
            aria-describedby={describedBy}
            onChange={(event) => {
              const next = event.target.value
              onChange({ uf: isUf(next) ? next : "", cityCode: null })
            }}
          >
            <NativeSelectOption value="">Selecione o estado</NativeSelectOption>
            {STATES.map((state) => (
              <NativeSelectOption key={state.uf} value={state.uf}>
                {`${state.name} (${state.uf})`}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor={cityId}>Cidade</Label>
          <SearchCombobox
            id={cityId}
            options={options}
            value={draft.cityCode === null ? null : String(draft.cityCode)}
            {...(selectedName !== undefined ? { valueLabel: selectedName } : {})}
            onValueChange={(value) => onChange({ uf: draft.uf, cityCode: Number(value) })}
            placeholder={uf === "" ? "Escolha o estado antes" : "Escolha a cidade"}
            searchPlaceholder="Buscar cidade…"
            emptyText="Nenhuma cidade encontrada."
            disabled={uf === ""}
            loading={loading}
            invalid={error !== undefined}
            describedBy={describedBy}
          />
        </div>
      </div>
      {loadFailed && (
        <p role="alert" className="text-sm text-destructive">
          {CITIES_ERROR_MESSAGE}
        </p>
      )}
      {error !== undefined && (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
