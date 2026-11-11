import { describe, expect, it } from "vitest"
import { googleIdentity, readClaims, sessionToken } from "@/infra/auth/callbacks"

const ACCOUNT_ID = "7a0f2b8c-1d2e-4f30-9a41-5b6c7d8e9f01"

describe("googleIdentity", () => {
  it("returns the sub and the email of a verified Google profile", () => {
    expect(
      googleIdentity({
        providerAccountId: "1098765432",
        profile: {
          sub: "1098765432",
          email: "dono@exemplo.com",
          email_verified: true,
          name: "Fulano",
          picture: "https://exemplo.com/foto.png",
        },
      }),
    ).toEqual({ googleSub: "1098765432", email: "dono@exemplo.com" })
  })

  it("returns null when the email is not verified or missing", () => {
    for (const profile of [
      { email: "dono@exemplo.com", email_verified: false },
      { email: "dono@exemplo.com", email_verified: "true" },
      { email: "dono@exemplo.com" },
      { email_verified: true },
      { email: "", email_verified: true },
      null,
      "perfil",
    ]) {
      expect(googleIdentity({ providerAccountId: "1098765432", profile })).toBeNull()
    }
  })

  it("returns null without a provider account id", () => {
    expect(
      googleIdentity({
        providerAccountId: "",
        profile: { email: "dono@exemplo.com", email_verified: true },
      }),
    ).toBeNull()
  })
})

describe("sessionToken", () => {
  it("keeps only iat, exp and jti, sets sub to the accountId and adds the claims", () => {
    const token = {
      name: "Fulano",
      email: "dono@exemplo.com",
      picture: "https://exemplo.com/foto.png",
      sub: "outro-id",
      iat: 100,
      exp: 200,
      jti: "abc",
      extra: "x",
    }
    expect(sessionToken(token, { accountId: ACCOUNT_ID, kind: "google" })).toEqual({
      iat: 100,
      exp: 200,
      jti: "abc",
      sub: ACCOUNT_ID,
      accountId: ACCOUNT_ID,
      kind: "google",
    })
  })

  it("never carries name, email or picture", () => {
    const result = sessionToken(
      { name: "Fulano", email: "dono@exemplo.com", picture: "foto" },
      { accountId: ACCOUNT_ID, kind: "demo" },
    )
    expect(result).toEqual({ sub: ACCOUNT_ID, accountId: ACCOUNT_ID, kind: "demo" })
    expect(JSON.stringify(result)).not.toContain("dono@exemplo.com")
  })
})

describe("readClaims", () => {
  it("reads accountId and kind from a token or a session", () => {
    expect(readClaims({ accountId: ACCOUNT_ID, kind: "demo", sub: ACCOUNT_ID })).toEqual({
      accountId: ACCOUNT_ID,
      kind: "demo",
    })
    expect(readClaims({ expires: "2026-12-01", accountId: ACCOUNT_ID, kind: "google" })).toEqual({
      accountId: ACCOUNT_ID,
      kind: "google",
    })
  })

  it("returns null for an invalid kind", () => {
    expect(readClaims({ accountId: ACCOUNT_ID, kind: "admin" })).toBeNull()
    expect(readClaims({ accountId: ACCOUNT_ID })).toBeNull()
  })

  it("returns null when the accountId is not a UUID", () => {
    expect(readClaims({ accountId: "123", kind: "demo" })).toBeNull()
    expect(readClaims({ accountId: 7, kind: "demo" })).toBeNull()
    expect(readClaims({ kind: "demo" })).toBeNull()
  })

  it("returns null for values that are not objects", () => {
    for (const value of [null, undefined, "x", 1]) expect(readClaims(value)).toBeNull()
  })
})
