import { afterEach, describe, expect, it, vi } from "vitest"
import { MissingEnvError } from "@/core/errors"
import { requireEnv } from "@/infra/env"

describe("requireEnv", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
  })

  it("returns the value from the given env", () => {
    expect(requireEnv("X", { X: "abc" })).toBe("abc")
  })

  it("throws MissingEnvError when the variable is missing", () => {
    expect(() => requireEnv("X", {})).toThrow(MissingEnvError)
    expect(() => requireEnv("X", {})).toThrow("Defina X no .env.local")
  })

  it("throws MissingEnvError when the variable is empty", () => {
    expect(() => requireEnv("X", { X: "" })).toThrow(MissingEnvError)
  })

  it("names the error class for logs", () => {
    try {
      requireEnv("X", {})
      expect.unreachable()
    } catch (error) {
      expect((error as Error).name).toBe("MissingEnvError")
    }
  })

  it("reads process.env by default", () => {
    vi.stubEnv("CHAPA_TEST_VAR", "from-process")
    expect(requireEnv("CHAPA_TEST_VAR")).toBe("from-process")
  })
})
