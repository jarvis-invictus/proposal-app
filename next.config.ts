import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";

const nextConfig: NextConfig = {
  /* config options here */
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
