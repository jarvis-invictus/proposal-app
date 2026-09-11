import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  // lightningcss (a transitive dependency of @tailwindcss/node, used by lib/ai/compileTailwind.ts
  // for server-side Tailwind compilation — docs/CORE_ENGINE_V2_SPEC.md §7) resolves its native
  // binary via a dynamic `require(...)` path that Turbopack/webpack can't statically bundle.
  // Marking these external tells Next.js to leave them un-bundled and let Node's own require()
  // resolve them directly at runtime, instead of failing with "Module not found" at build time.
  // `tailwindcss` itself was missed here originally — compileTailwind.ts's compile('@import
  // "tailwindcss";', ...) call has @tailwindcss/node resolve the real tailwindcss package
  // internally at runtime, the same class of dynamic resolution as the other three. Confirmed via
  // a real production error, not assumed: "Package path . is exported from package tailwindcss,
  // but no valid target file was found" — the identical error shape that motivated externalizing
  // the other three packages in the first place, reproduced on 2 separate real beta-ai-page calls.
  serverExternalPackages: ["@tailwindcss/node", "@tailwindcss/oxide", "lightningcss", "tailwindcss"],
};

// Only wrap with the Sentry build plugin when a DSN is actually configured — with no DSN
// (every local machine until Sahil creates the Sentry account) this must fall back to the
// plain config so `next build` never depends on Sentry project/auth-token setup.
export default process.env.NEXT_PUBLIC_SENTRY_DSN
  ? withSentryConfig(nextConfig, {
      silent: true,
      org: process.env.SENTRY_ORG,
      project: process.env.SENTRY_PROJECT,
      widenClientFileUpload: false,
    })
  : nextConfig;
