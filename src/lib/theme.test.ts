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
  const state = { stored, systemDark }
  const localStorage = {
    getItem: () => {
      if (state.stored === "throw") throw new Error("blocked")
      return state.stored
    },
  }
  const mediaListeners: Array<() => void> = []
  const media = {
    get matches() {
      return state.systemDark
    },
    addEventListener: (_type: string, listener: () => void) => void mediaListeners.push(listener),
  }
  const storageListeners: Array<(event: { key: string | null }) => void> = []
  const addEventListener = (type: string, listener: (event: { key: string | null }) => void) => {
    if (type === "storage") storageListeners.push(listener)
  }
  new Function("document", "localStorage", "matchMedia", "addEventListener", THEME_INIT_SCRIPT)(
    { documentElement: root },
    localStorage,
    () => media,
    addEventListener,
  )
  return {
    root,
    changeSystem(dark: boolean) {
      state.systemDark = dark
      for (const listener of mediaListeners) listener()
    },
    changeStorageFromOtherTab(value: string | null, key: string | null = THEME_STORAGE_KEY) {
      state.stored = value
      for (const listener of storageListeners) listener({ key })
    },
  }
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
        const { root } = runScript(preference, systemDark)
        const expected = resolveTheme(preference, systemDark)
        expect(root.classes.has("dark")).toBe(expected === "dark")
        expect(root.style.colorScheme).toBe(expected)
      })
    }
  }

  it("treats an invalid stored value as system", () => {
    expect(runScript("azul", true).root.classes.has("dark")).toBe(true)
    expect(runScript("azul", false).root.classes.has("dark")).toBe(false)
  })

  it("survives a localStorage that throws", () => {
    expect(runScript("throw", true).root.classes.has("dark")).toBe(true)
    expect(runScript("throw", false).root.classes.has("dark")).toBe(false)
  })

  it("follows the OS theme while the page is open, with system", () => {
    const page = runScript("system", false)
    page.changeSystem(true)
    expect(page.root.classes.has("dark")).toBe(true)
    expect(page.root.style.colorScheme).toBe("dark")
    page.changeSystem(false)
    expect(page.root.classes.has("dark")).toBe(false)
  })

  it("ignores OS theme changes with a fixed preference", () => {
    const page = runScript("light", false)
    page.changeSystem(true)
    expect(page.root.classes.has("dark")).toBe(false)
  })

  it("applies a preference changed in another tab", () => {
    const page = runScript("light", false)
    page.changeStorageFromOtherTab("dark")
    expect(page.root.classes.has("dark")).toBe(true)
    page.changeStorageFromOtherTab("dark", "outra-chave")
    page.changeStorageFromOtherTab(null, "outra-chave")
    expect(page.root.classes.has("dark")).toBe(true)
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
