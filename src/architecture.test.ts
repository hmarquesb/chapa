import { readdirSync, readFileSync } from "node:fs"
import { dirname, join, posix, relative, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

// Enforces the layer rules from AGENTS.md ("Camadas e importações").
// Each violation reads "<file>: <rule>" so a failing run points straight at the culprit.

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..")
const SKIPPED_DIRS = new Set(["node_modules", ".next", ".git", ".vercel", "coverage"])
const CODE_FILE = /\.(ts|tsx)$/
const TEST_FILE = /\.test\.tsx?$/

const RULES = {
  clientImportsServer:
    "rule 1: src/components and src/lib must not import @/core, @/infra, @google/genai or postgres",
  genaiOutsideLlm: "rule 2: only src/infra/llm may import @google/genai",
  postgresOutsideDb: "rule 3: only src/infra/db may import postgres",
  missingServerOnly:
    'rule 4: files in src/core and src/infra must start with import "server-only" as the first import',
  nextInCore: "rule 5: src/core must not import next or next/*",
  publicSecret:
    "rule 6: NEXT_PUBLIC_ variables must not contain KEY, SECRET, TOKEN or DATABASE in their name",
  authOutsideAuth: "rule 7: only src/infra/auth may import next-auth or @auth/*",
} as const

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("//"))
    .join("\n")
}

function importSpecifiers(source: string): string[] {
  const patterns = [
    /\b(?:import|export)\s+(?:[^'"`;]*?\s+from\s+)?["']([^"']+)["']/g,
    /\bimport\s*\(\s*["']([^"']+)["']\s*\)/g,
    /\brequire\s*\(\s*["']([^"']+)["']\s*\)/g,
  ]
  const found: string[] = []
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) {
      if (match[1]) found.push(match[1])
    }
  }
  return found
}

// Turns "@/core/x" or a relative path into a repo-relative path ("src/core/x").
function resolveSpecifier(file: string, specifier: string): string | null {
  if (specifier.startsWith("@/")) return `src/${specifier.slice(2)}`
  if (specifier.startsWith("./") || specifier.startsWith("../")) {
    return posix.normalize(posix.join(posix.dirname(file), specifier))
  }
  return null
}

function isPackage(specifier: string, name: string): boolean {
  return specifier === name || specifier.startsWith(`${name}/`)
}

function isUnder(path: string, dir: string): boolean {
  return path === dir || path.startsWith(`${dir}/`)
}

function firstImportIsServerOnly(source: string): boolean {
  const firstImport = source.split("\n").find((line) => /^\s*import\b/.test(line))
  return firstImport !== undefined && /^\s*import\s+["']server-only["'];?\s*$/.test(firstImport)
}

const PUBLIC_VAR = /\bNEXT_PUBLIC_[A-Z0-9_]*/g
const SECRET_WORD = /KEY|SECRET|TOKEN|DATABASE/

// `file` is repo-relative with forward slashes, e.g. "src/core/types.ts".
function checkFile(file: string, rawSource: string): string[] {
  const source = stripComments(rawSource)
  const specifiers = importSpecifiers(source)
  const violations = new Set<string>()
  const add = (rule: string) => violations.add(`${file}: ${rule}`)

  const inClient = isUnder(file, "src/components") || isUnder(file, "src/lib")
  const inCore = isUnder(file, "src/core")
  const inServerLayer = inCore || isUnder(file, "src/infra")

  for (const specifier of specifiers) {
    const resolved = resolveSpecifier(file, specifier)
    const isGenai = isPackage(specifier, "@google/genai")
    const isPostgres = isPackage(specifier, "postgres")

    if (
      inClient &&
      (isGenai ||
        isPostgres ||
        (resolved !== null && (isUnder(resolved, "src/core") || isUnder(resolved, "src/infra"))))
    ) {
      add(RULES.clientImportsServer)
    }
    if (isGenai && !isUnder(file, "src/infra/llm")) add(RULES.genaiOutsideLlm)
    if (isPostgres && !isUnder(file, "src/infra/db")) add(RULES.postgresOutsideDb)
    if (inCore && isPackage(specifier, "next")) add(RULES.nextInCore)
    if (
      (isPackage(specifier, "next-auth") || specifier.startsWith("@auth/")) &&
      !isUnder(file, "src/infra/auth")
    ) {
      add(RULES.authOutsideAuth)
    }
  }

  if (inServerLayer && !TEST_FILE.test(file) && !firstImportIsServerOnly(source)) {
    add(RULES.missingServerOnly)
  }

  for (const match of rawSource.matchAll(PUBLIC_VAR)) {
    if (SECRET_WORD.test(match[0].slice("NEXT_PUBLIC_".length))) add(RULES.publicSecret)
  }

  return [...violations]
}

function listCodeFiles(dir: string): string[] {
  const files: string[] = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRS.has(entry.name)) files.push(...listCodeFiles(join(dir, entry.name)))
    } else if (entry.isFile() && CODE_FILE.test(entry.name)) {
      files.push(join(dir, entry.name))
    }
  }
  return files
}

// Fixtures are assembled at runtime so this file never matches its own rules.
const imp = (specifier: string) => `import x from "${specifier}"\n`
const SERVER_ONLY = `import "server-only"\n`
const PUBLIC = "NEXT_PUBLIC_"

describe("architecture checker", () => {
  it("rule 1: flags client code importing core, infra or SDKs", () => {
    expect(checkFile("src/components/chat/x.tsx", imp("@/core/types"))).toEqual([
      `src/components/chat/x.tsx: ${RULES.clientImportsServer}`,
    ])
    expect(checkFile("src/lib/a.ts", imp("../infra/env"))).toEqual([
      `src/lib/a.ts: ${RULES.clientImportsServer}`,
    ])
    expect(checkFile("src/lib/a.ts", imp("@/lib/types"))).toEqual([])
    expect(checkFile("src/lib/a.ts", imp("postgres"))).toContain(
      `src/lib/a.ts: ${RULES.clientImportsServer}`,
    )
  })

  it("rule 2: only src/infra/llm imports @google/genai", () => {
    expect(checkFile("src/infra/llm/gemini.ts", SERVER_ONLY + imp("@google/genai"))).toEqual([])
    expect(checkFile("scripts/x.ts", imp("@google/genai"))).toEqual([
      `scripts/x.ts: ${RULES.genaiOutsideLlm}`,
    ])
  })

  it("rule 3: only src/infra/db imports postgres", () => {
    expect(checkFile("src/infra/db/client.ts", SERVER_ONLY + imp("postgres"))).toEqual([])
    expect(checkFile("src/app/api/x/route.ts", imp("postgres"))).toEqual([
      `src/app/api/x/route.ts: ${RULES.postgresOutsideDb}`,
    ])
  })

  it('rule 4: core and infra start with import "server-only"', () => {
    expect(checkFile("src/core/a.ts", imp("@/lib/types"))).toEqual([
      `src/core/a.ts: ${RULES.missingServerOnly}`,
    ])
    expect(checkFile("src/infra/a.ts", imp("@/lib/types") + SERVER_ONLY)).toEqual([
      `src/infra/a.ts: ${RULES.missingServerOnly}`,
    ])
    expect(checkFile("src/core/a.ts", `// header\n${SERVER_ONLY}${imp("@/lib/types")}`)).toEqual([])
    expect(checkFile("src/core/a.test.ts", imp("vitest"))).toEqual([])
  })

  it("rule 5: core does not import next", () => {
    expect(checkFile("src/core/a.ts", SERVER_ONLY + imp("next/server"))).toEqual([
      `src/core/a.ts: ${RULES.nextInCore}`,
    ])
    expect(checkFile("src/core/a.ts", SERVER_ONLY + imp("nextish"))).toEqual([])
  })

  it("rule 6: secret-looking NEXT_PUBLIC_ variables are flagged", () => {
    expect(checkFile("src/app/page.tsx", `process.env.${PUBLIC}GEMINI_API_KEY`)).toEqual([
      `src/app/page.tsx: ${RULES.publicSecret}`,
    ])
    expect(checkFile("src/app/page.tsx", `process.env.${PUBLIC}SITE_NAME`)).toEqual([])
  })

  it("rule 7: only src/infra/auth imports next-auth or @auth/*", () => {
    expect(checkFile("src/infra/auth/index.ts", SERVER_ONLY + imp("next-auth"))).toEqual([])
    expect(
      checkFile("src/infra/auth/config.ts", SERVER_ONLY + imp("next-auth/providers/google")),
    ).toEqual([])
    expect(checkFile("src/core/a.ts", SERVER_ONLY + imp("next-auth"))).toEqual([
      `src/core/a.ts: ${RULES.authOutsideAuth}`,
    ])
    expect(checkFile("src/app/page.tsx", imp("@auth/core/errors"))).toEqual([
      `src/app/page.tsx: ${RULES.authOutsideAuth}`,
    ])
    expect(checkFile("src/app/page.tsx", imp("@/infra/auth"))).toEqual([])
  })
})

describe("architecture of the project", () => {
  it("follows the layer rules from AGENTS.md", () => {
    const violations = listCodeFiles(ROOT).flatMap((path) =>
      checkFile(relative(ROOT, path).split(sep).join("/"), readFileSync(path, "utf8")),
    )
    expect(violations).toEqual([])
  })
})
