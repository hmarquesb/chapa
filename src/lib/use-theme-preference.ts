"use client"

import { useCallback, useSyncExternalStore } from "react"
import {
  applyResolvedTheme,
  applyTheme,
  parseThemePreference,
  THEME_CHANGE_EVENT,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme"

const DARK_QUERY = "(prefers-color-scheme: dark)"

function readPreference(): ThemePreference {
  try {
    return parseThemePreference(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return "system"
  }
}

function subscribe(onChange: () => void): () => void {
  const media = window.matchMedia(DARK_QUERY)
  // Another tab changed the preference, or the OS theme changed: reapply the stored preference
  // (with "system", the page follows the operating system while it is open).
  const onExternalChange = () => {
    applyResolvedTheme(readPreference())
    onChange()
  }
  window.addEventListener(THEME_CHANGE_EVENT, onChange)
  window.addEventListener("storage", onExternalChange)
  media.addEventListener("change", onExternalChange)
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange)
    window.removeEventListener("storage", onExternalChange)
    media.removeEventListener("change", onExternalChange)
  }
}

export function useThemePreference(): {
  preference: ThemePreference
  setPreference: (preference: ThemePreference) => void
} {
  const preference = useSyncExternalStore<ThemePreference>(
    subscribe,
    readPreference,
    () => "system",
  )
  const setPreference = useCallback((next: ThemePreference) => applyTheme(next), [])
  return { preference, setPreference }
}
