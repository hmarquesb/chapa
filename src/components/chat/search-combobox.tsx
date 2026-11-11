"use client"

import { CheckIcon, ChevronsUpDownIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { matchesSearch } from "@/lib/profile/search"

export type ComboboxOption = { value: string; label: string }

// Mais que isso na lista aberta pesa no celular: a busca refina o resto.
const MAX_VISIBLE_OPTIONS = 100

type SearchComboboxProps = {
  /** Id do botão: o `<Label htmlFor>` do campo aponta para ele. */
  id: string
  options: readonly ComboboxOption[]
  value: string | null
  /** Rótulo mostrado no botão quando há valor (pode não estar em `options`). */
  valueLabel?: string
  onValueChange: (value: string) => void
  placeholder: string
  searchPlaceholder: string
  emptyText: string
  disabled?: boolean
  loading?: boolean
  invalid?: boolean
  describedBy?: string
  /** Opção extra quando a busca não casa com nenhuma opção. */
  otherOption?: { label: (query: string) => string; onSelect: (query: string) => void }
}

export function SearchCombobox({
  id,
  options,
  value,
  valueLabel,
  onValueChange,
  placeholder,
  searchPlaceholder,
  emptyText,
  disabled = false,
  loading = false,
  invalid = false,
  describedBy,
  otherOption,
}: SearchComboboxProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")

  const matches = options.filter((option) => matchesSearch(option.label, query))
  const visible = matches.slice(0, MAX_VISIBLE_OPTIONS)
  const trimmedQuery = query.trim()
  const offerOther = otherOption !== undefined && trimmedQuery !== "" && matches.length === 0
  const selectedLabel = valueLabel ?? options.find((option) => option.value === value)?.label

  function close(): void {
    setOpen(false)
    setQuery("")
  }

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) setQuery("")
      }}
    >
      <PopoverTrigger asChild>
        <Button
          id={id}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-invalid={invalid ? true : undefined}
          aria-describedby={describedBy}
          disabled={disabled}
          className="h-9 w-full justify-between font-normal aria-invalid:border-destructive"
        >
          <span className={selectedLabel ? "truncate" : "truncate text-muted-foreground"}>
            {loading ? "Carregando…" : (selectedLabel ?? placeholder)}
          </span>
          <ChevronsUpDownIcon aria-hidden="true" className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] p-0"
      >
        <Command shouldFilter={false}>
          <CommandInput
            value={query}
            onValueChange={setQuery}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
          />
          <CommandList>
            {!offerOther && visible.length === 0 && <CommandEmpty>{emptyText}</CommandEmpty>}
            {visible.length > 0 && (
              <CommandGroup>
                {visible.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      onValueChange(option.value)
                      close()
                    }}
                  >
                    {option.label}
                    {option.value === value && <CheckIcon aria-hidden="true" className="ml-auto" />}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {matches.length > visible.length && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                Digite para refinar a busca.
              </p>
            )}
            {offerOther && (
              <CommandGroup>
                <CommandItem
                  value={`__other__${trimmedQuery}`}
                  onSelect={() => {
                    otherOption.onSelect(trimmedQuery)
                    close()
                  }}
                >
                  {otherOption.label(trimmedQuery)}
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
