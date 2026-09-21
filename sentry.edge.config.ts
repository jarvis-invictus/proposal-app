import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    debug: false,
  })
} else {
  // See sentry.server.config.ts for why this warning is no longer suppressed in production.
  console.warn('[sentry] NEXT_PUBLIC_SENTRY_DSN not set — edge runtime error tracking is disabled.')
}
