import { describe, expect, it } from "vitest"
import { parseWorktrees } from "./changes"

describe("parseWorktrees", () => {
  it("lê caminho e branch de cada worktree", () => {
    const porcelain = [
      "worktree /repo/chapa\nHEAD abc\nbranch refs/heads/main",
      "worktree /repo/wt/x\nHEAD def\nbranch refs/heads/feat/x",
      "worktree /repo/wt/y\nHEAD 123\ndetached",
    ].join("\n\n")
    expect(parseWorktrees(porcelain)).toEqual([
      { path: "/repo/chapa", branch: "main" },
      { path: "/repo/wt/x", branch: "feat/x" },
      { path: "/repo/wt/y", branch: "(detached)" },
    ])
  })
})
