import "server-only"
import type { Usage } from "@/core/types"

export function emptyUsage(): Usage {
  return { calls: 0, inputTokens: 0, outputTokens: 0 }
}

export function addUsage(...items: Usage[]): Usage {
  const total = emptyUsage()
  for (const item of items) {
    total.calls += item.calls
    total.inputTokens += item.inputTokens
    total.outputTokens += item.outputTokens
  }
  return total
}
