import "server-only"
import { MissingEnvError } from "@/core/errors"

function present(value: string | undefined): value is string {
  return value !== undefined && value !== ""
}

// Neither credential: null (the deploy only offers the demo, as in the Vercel previews).
// Only one of them: the configuration is incomplete, so it fails loudly.
export function readGoogleCredentials(
  env: Record<string, string | undefined>,
): { clientId: string; clientSecret: string } | null {
  const clientId = env.AUTH_GOOGLE_ID
  const clientSecret = env.AUTH_GOOGLE_SECRET
  if (!present(clientId) && !present(clientSecret)) return null
  if (!present(clientId) || !present(clientSecret)) {
    throw new MissingEnvError("Defina AUTH_GOOGLE_ID e AUTH_GOOGLE_SECRET no .env.local")
  }
  return { clientId, clientSecret }
}
