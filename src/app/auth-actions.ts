"use server"

import { redirect } from "next/navigation"
import { isAuthError, isDemoLimitError, signIn, signOut } from "@/infra/auth"

// On success, signIn and signOut throw Next's redirect, which must propagate: only Auth.js
// errors are caught here.

export async function signInAsDemo(): Promise<void> {
  try {
    await signIn("demo", { redirectTo: "/" })
  } catch (error) {
    if (isDemoLimitError(error)) redirect("/entrar?erro=limite-demo")
    if (isAuthError(error)) redirect("/entrar?erro=falha")
    throw error
  }
}

export async function signInWithGoogle(): Promise<void> {
  await signIn("google", { redirectTo: "/" })
}

export async function signOutOfAccount(): Promise<void> {
  await signOut({ redirectTo: "/entrar" })
}
