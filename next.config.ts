import type { NextConfig } from "next"

// cacheComponents/partialPrefetching from the create-next-app template are left off on purpose:
// with Cache Components, route segments that export `dynamic` fail the build, and AGENTS.md
// requires Route Handlers to export `dynamic = "force-dynamic"`.
const nextConfig: NextConfig = {
  // `next dev` would otherwise inject a managed block into our hand-written AGENTS.md.
  agentRules: false,
  poweredByHeader: false,
  // The continue link (/?sessao=<id>) works as a credential, so no page leaks it as a referrer.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ]
  },
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
