import type { NextConfig } from "next"

// cacheComponents/partialPrefetching from the create-next-app template are left off on purpose:
// with Cache Components, route segments that export `dynamic` fail the build, and AGENTS.md
// requires Route Handlers to export `dynamic = "force-dynamic"`.
const nextConfig: NextConfig = {
  // `next dev` would otherwise inject a managed block into our hand-written AGENTS.md.
  agentRules: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
}

export default nextConfig
