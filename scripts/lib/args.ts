// Parser mínimo de argumentos dos scripts locais (ingest, chat, eval).
// --chave valor → flags.chave = "valor"; --flag → true; --no-flag → flags.flag = "false".

// Flags que nunca levam valor, para que "--debug a" deixe "a" nos posicionais.
// debug: scripts/chat.ts (S05); judge e compare: scripts/eval.ts (S08),
// em que "--compare a.json b.json" deixa os dois caminhos nos posicionais.
const BOOLEAN_FLAGS: ReadonlySet<string> = new Set(["debug", "judge", "compare"])

export function parseArgs(argv: string[]): {
  flags: Record<string, string | true>
  positionals: string[]
} {
  const flags: Record<string, string | true> = {}
  const positionals: string[] = []

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i] as string
    if (!arg.startsWith("--") || arg.length === 2) {
      positionals.push(arg)
      continue
    }
    const name = arg.slice(2)
    if (name.startsWith("no-") && name.length > 3) {
      flags[name.slice(3)] = "false"
      continue
    }
    const next = argv[i + 1]
    if (!BOOLEAN_FLAGS.has(name) && next !== undefined && !next.startsWith("--")) {
      flags[name] = next
      i++
    } else {
      flags[name] = true
    }
  }
  return { flags, positionals }
}
