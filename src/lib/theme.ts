// Theme preference: pure helpers plus the inline script that sets the theme before first paint.
// No React and no "use client": the layout imports THEME_INIT_SCRIPT on the server.

export const THEME_PREFERENCES = ["light", "dark", "system"] as const
export type ThemePreference = (typeof THEME_PREFERENCES)[number]
export type ResolvedTheme = "light" | "dark"

export const THEME_STORAGE_KEY = "chapa-tema"
export const THEME_CHANGE_EVENT = "chapa-tema"
export const THEME_CHANGING_CLASS = "theme-changing"
const THEME_CHANGING_MS = 250

export const THEME_LABELS: Readonly<Record<ThemePreference, string>> = {
  light: "Claro",
  dark: "Escuro",
  system: "Sistema",
}

export function parseThemePreference(value: unknown): ThemePreference {
  return (THEME_PREFERENCES as readonly unknown[]).includes(value)
    ? (value as ThemePreference)
    : "system"
}

export function resolveTheme(
  preference: ThemePreference,
  systemPrefersDark: boolean,
): ResolvedTheme {
  if (preference === "system") return systemPrefersDark ? "dark" : "light"
  return preference
}

// Keep the logic in sync with parseThemePreference/resolveTheme: theme.test.ts runs this text
// against both. Every browser API access is guarded: storage can throw (private mode, blocked).
// The script also listens for OS theme changes and for other tabs for the whole life of the page,
// on every route: a React listener would only exist while a theme control is mounted.
export const THEME_INIT_SCRIPT = `(function(){try{var k=${JSON.stringify(
  THEME_STORAGE_KEY,
)},r=document.documentElement,m=matchMedia("(prefers-color-scheme: dark)");function a(){var p=null;try{p=localStorage.getItem(k)}catch(e){}if(p!=="light"&&p!=="dark")p="system";var d=p==="dark"||(p==="system"&&m.matches);r.classList.toggle("dark",d);r.style.colorScheme=d?"dark":"light"}a();if(m.addEventListener)m.addEventListener("change",a);addEventListener("storage",function(e){if(e.key===k||e.key===null)a()})}catch(e){}})()`

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
}

/** Puts or removes the `dark` class on <html> for the preference, without storing anything. */
export function applyResolvedTheme(preference: ThemePreference): void {
  const resolved = resolveTheme(preference, systemPrefersDark())
  const root = document.documentElement
  root.classList.toggle("dark", resolved === "dark")
  root.style.colorScheme = resolved
}

/** Stores the preference, applies it with a short color transition and notifies listeners. */
export function applyTheme(preference: ThemePreference): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, preference)
  } catch {
    // Storage blocked: the theme still applies for this page.
  }
  const root = document.documentElement
  root.classList.add(THEME_CHANGING_CLASS)
  applyResolvedTheme(preference)
  window.setTimeout(() => root.classList.remove(THEME_CHANGING_CLASS), THEME_CHANGING_MS)
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}
