"use client"

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { parseThemePreference, THEME_LABELS, THEME_PREFERENCES } from "@/lib/theme"
import { useThemePreference } from "@/lib/use-theme-preference"

const ICONS = { light: SunIcon, dark: MoonIcon, system: MonitorIcon } as const

/** Label and the three theme options, to place inside an existing dropdown menu. */
export function ThemeMenuGroup() {
  const { preference, setPreference } = useThemePreference()
  return (
    <>
      <DropdownMenuLabel className="font-normal text-muted-foreground">Tema</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        value={preference}
        onValueChange={(value) => setPreference(parseThemePreference(value))}
      >
        {THEME_PREFERENCES.map((option) => {
          const Icon = ICONS[option]
          return (
            <DropdownMenuRadioItem key={option} value={option}>
              <Icon aria-hidden="true" />
              {THEME_LABELS[option]}
            </DropdownMenuRadioItem>
          )
        })}
      </DropdownMenuRadioGroup>
    </>
  )
}

/** Icon button with its own menu, for places outside a menu (for example, /entrar). */
export function ThemeToggle() {
  const { preference } = useThemePreference()
  const Icon = ICONS[preference]
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" aria-label={`Tema: ${THEME_LABELS[preference]}`}>
          <Icon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-40">
        <ThemeMenuGroup />
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
