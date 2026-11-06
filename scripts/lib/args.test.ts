import { describe, expect, it } from "vitest"
import { parseArgs } from "./args"

describe("parseArgs", () => {
  it("parses values, boolean flags and positionals", () => {
    expect(parseArgs(["--preset", "baseline", "--debug", "a"])).toEqual({
      flags: { preset: "baseline", debug: true },
      positionals: ["a"],
    })
  })

  it("turns --no-flag into the string 'false'", () => {
    expect(parseArgs(["--no-rewrite"])).toEqual({ flags: { rewrite: "false" }, positionals: [] })
  })

  it("does not let --no-flag consume the next argument", () => {
    expect(parseArgs(["--no-debug", "x"])).toEqual({
      flags: { debug: "false" },
      positionals: ["x"],
    })
  })

  it("never gives a value to the known boolean flags debug and judge", () => {
    expect(parseArgs(["--judge", "x", "--debug", "y"])).toEqual({
      flags: { judge: true, debug: true },
      positionals: ["x", "y"],
    })
  })

  it("keeps both paths of --compare as positionals", () => {
    expect(parseArgs(["--compare", "v1.json", "v2.json"])).toEqual({
      flags: { compare: true },
      positionals: ["v1.json", "v2.json"],
    })
  })

  it("treats a flag followed by another flag as boolean", () => {
    expect(parseArgs(["--debug", "--label", "v2"])).toEqual({
      flags: { debug: true, label: "v2" },
      positionals: [],
    })
  })

  it("treats a trailing flag as boolean", () => {
    expect(parseArgs(["x", "--debug"])).toEqual({ flags: { debug: true }, positionals: ["x"] })
  })

  it("keeps values with spaces and hyphenated flag names", () => {
    expect(parseArgs(["--nome", "Pizzaria Bella", "--delay-ms", "4000"])).toEqual({
      flags: { nome: "Pizzaria Bella", "delay-ms": "4000" },
      positionals: [],
    })
  })

  it("returns empty results for no arguments", () => {
    expect(parseArgs([])).toEqual({ flags: {}, positionals: [] })
  })

  it("does not mutate the input", () => {
    const argv = ["--preset", "padrao"]
    parseArgs(argv)
    expect(argv).toEqual(["--preset", "padrao"])
  })
})
