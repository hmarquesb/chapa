import { afterEach, describe, expect, it, vi } from "vitest"
import {
  applyTheme,
  parseThemePreference,
  resolveTheme,
  THEME_INIT_SCRIPT,
  THEME_PREFERENCES,
  THEME_STORAGE_KEY,
  type ThemePreference,
} from "@/lib/theme"

function fakeRoot() {
  const classes = new Set<string>()
  return {
    classes,
    style: { colorScheme: "" },
    classList: {
      toggle(name: string, force?: boolean) {
        const on = force ?? !classes.has(name)
        if (on) classes.add(name)
        else classes.delete(name)
        return on
      },
      add: (name: string) => void classes.add(name),
      remove: (name: string) => void classes.delete(name),
      contains: (name: string) => classes.has(name),
    },
  }
}

function runScript(stored: string | null | "throw", systemDark: boolean) {
  const root = fakeRoot()
  const localStorage = {
    getItem: () => {
      if (stored === "throw") throw new Error("blocked")
      return stored
    },
  }
  const matchMedia = () => ({ matches: systemDark })
  new Function("document", "localStorage", "matchMedia", THEME_INIT_SCRIPT)(
    { documentElement: root },
    localStorage,
    matchMedia,
  )
  return root
}

describe("parseThemePreference", () => {
  it("accepts the three preferences", () => {
    for (const value of THEME_PREFERENCES) expect(parseThemePreference(value)).toBe(value)
  })

  it("falls back to system", () => {
    for (const value of [null, undefined, "azul", 3]) {
      expect(parseThemePreference(value)).toBe("system")
    }
  })
})

describe("resolveTheme", () => {
  it.each([
    ["light", false, "light"],
    ["light", true, "light"],
    ["dark", false, "dark"],
    ["dark", true, "dark"],
    ["system", false, "light"],
    ["system", true, "dark"],
  ] as const)("%s with system dark=%s → %s", (preference, systemDark, expected) => {
    expect(resolveTheme(preference, systemDark)).toBe(expected)
  })
})

describe("THEME_INIT_SCRIPT", () => {
  for (const preference of THEME_PREFERENCES) {
    for (const systemDark of [false, true]) {
      it(`${preference} with system dark=${systemDark} matches resolveTheme`, () => {
        const root = runScript(preference, systemDark)
        const expected = resolveTheme(preference, systemDark)
        expect(root.classes.has("dark")).toBe(expected === "dark")
        expect(root.style.colorScheme).toBe(expected)
      })
    }
  }

  it("treats an invalid stored value as system", () => {
    expect(runScript("azul", true).classes.has("dark")).toBe(true)
    expect(runScript("azul", false).classes.has("dark")).toBe(false)
  })

  it("survives a localStorage that throws", () => {
    expect(runScript("throw", true).classes.has("dark")).toBe(true)
    expect(runScript("throw", false).classes.has("dark")).toBe(false)
  })

  it("uses the same storage key as the app", () => {
    expect(THEME_INIT_SCRIPT).toContain(JSON.stringify(THEME_STORAGE_KEY))
  })
})

describe("applyTheme", () => {
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  function setup(systemDark = false) {
    vi.useFakeTimers()
    const root = fakeRoot()
    const store = new Map<string, string>()
    const events: string[] = []
    const win = {
      matchMedia: () => ({ matches: systemDark }),
      setTimeout: (fn: () => void, ms: number) => setTimeout(fn, ms),
      dispatchEvent: (event: Event) => void events.push(event.type),
    }
    vi.stubGlobal("window", win)
    vi.stubGlobal("document", { documentElement: root })
    vi.stubGlobal("localStorage", {
      setItem: (key: string, value: string) => void store.set(key, value),
    })
    return { root, store, events }
  }

  it("stores, applies, adds theme-changing for a moment and notifies", () => {
    const { root, store, events } = setup()
    applyTheme("dark" satisfies ThemePreference)
    expect(store.get(THEME_STORAGE_KEY)).toBe("dark")
    expect(root.classes.has("dark")).toBe(true)
    expect(root.style.colorScheme).toBe("dark")
    expect(root.classes.has("theme-changing")).toBe(true)
    expect(events).toEqual(["chapa-tema"])
    vi.advanceTimersByTime(300)
    expect(root.classes.has("theme-changing")).toBe(false)
  })

  it("follows the system when the preference is system", () => {
    const { root } = setup(true)
    applyTheme("system")
    expect(root.classes.has("dark")).toBe(true)
  })

  it("still applies when storage throws", () => {
    const { root } = setup()
    vi.stubGlobal("localStorage", {
      setItem: () => {
        throw new Error("blocked")
      },
    })
    applyTheme("dark")
    expect(root.classes.has("dark")).toBe(true)
  })
})
