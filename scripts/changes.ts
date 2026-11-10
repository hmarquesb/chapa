// Lista as changes ativas do OpenSpec em todos os worktrees do repositório.
// O `openspec list` só enxerga o checkout atual; uma change que ainda não foi
// para a `main` existe só no worktree da sua branch. Sem rede, sem banco.
import { execFileSync } from "node:child_process"
import { existsSync } from "node:fs"
import { join } from "node:path"

type Worktree = { path: string; branch: string }

const NO_CHANGES = "No active changes found."

export function parseWorktrees(porcelain: string): Worktree[] {
  return porcelain
    .split("\n\n")
    .map((block) => {
      const lines = block.split("\n")
      const path = lines.find((l) => l.startsWith("worktree "))?.slice(9)
      const ref = lines.find((l) => l.startsWith("branch "))?.slice(7)
      return path ? { path, branch: ref?.replace("refs/heads/", "") ?? "(detached)" } : null
    })
    .filter((w): w is Worktree => w !== null)
}

function main(): void {
  const openspecBin = join(process.cwd(), "node_modules", ".bin", "openspec")
  const worktrees = parseWorktrees(
    execFileSync("git", ["worktree", "list", "--porcelain"], { encoding: "utf8" }),
  )

  let found = 0
  for (const wt of worktrees) {
    if (!existsSync(join(wt.path, "openspec", "changes"))) continue
    const out = execFileSync(openspecBin, ["list"], { cwd: wt.path, encoding: "utf8" }).trim()
    if (out.includes(NO_CHANGES)) continue
    found++
    console.log(`\n== ${wt.branch}  (${wt.path})\n${out}`)
  }
  if (found === 0) console.log(NO_CHANGES)
}

if (import.meta.url === `file://${process.argv[1]}`) main()
