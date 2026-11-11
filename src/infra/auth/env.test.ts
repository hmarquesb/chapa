import { describe, expect, it } from "vitest"
import { MissingEnvError } from "@/core/errors"
import { readGoogleCredentials } from "@/infra/auth/env"

describe("readGoogleCredentials", () => {
  it("returns null when neither credential is set", () => {
    expect(readGoogleCredentials({})).toBeNull()
  })

  it("returns both credentials when both are set", () => {
    expect(
      readGoogleCredentials({ AUTH_GOOGLE_ID: "id-de-teste", AUTH_GOOGLE_SECRET: "segredo" }),
    ).toEqual({ clientId: "id-de-teste", clientSecret: "segredo" })
  })

  it("throws MissingEnvError when only one is set", () => {
    for (const env of [{ AUTH_GOOGLE_ID: "id-de-teste" }, { AUTH_GOOGLE_SECRET: "segredo" }]) {
      expect(() => readGoogleCredentials(env)).toThrow(MissingEnvError)
      expect(() => readGoogleCredentials(env)).toThrow(
        "Defina AUTH_GOOGLE_ID e AUTH_GOOGLE_SECRET no .env.local",
      )
    }
  })

  it("treats an empty string as absent", () => {
    expect(readGoogleCredentials({ AUTH_GOOGLE_ID: "", AUTH_GOOGLE_SECRET: "" })).toBeNull()
    expect(() =>
      readGoogleCredentials({ AUTH_GOOGLE_ID: "id-de-teste", AUTH_GOOGLE_SECRET: "" }),
    ).toThrow(MissingEnvError)
  })
})
