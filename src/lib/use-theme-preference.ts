"use client"

import { useCallback, useSyncExternalStore } from "react"
import {
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
  // THEME_INIT_SCRIPT already reapplies the theme on OS changes and on other tabs, on every
  // route. Here the hook only re-renders the controls so the checked option stays right.
  window.addEventListener(THEME_CHANGE_EVENT, onChange)
  window.addEventListener("storage", onChange)
  media.addEventListener("change", onChange)
  return () => {
    window.removeEventListener(THEME_CHANGE_EVENT, onChange)
    window.removeEventListener("storage", onChange)
    media.removeEventListener("change", onChange)
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
