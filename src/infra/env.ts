import "server-only"
import { MissingEnvError } from "@/core/errors"

// Lê process.env (ou o env passado). Lança MissingEnvError com a mensagem
// "Defina <NOME> no .env.local" se a variável estiver ausente ou vazia.
export function requireEnv(
  name: string,
  env: Record<string, string | undefined> = process.env,
): string {
  const value = env[name]
  if (value === undefined || value === "") {
    throw new MissingEnvError(`Defina ${name} no .env.local`)
  }
  return value
}
