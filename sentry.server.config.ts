import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    debug: false,
  })
} else {
  // Previously suppressed in production (`NODE_ENV !== 'production'` guard) — meaning the one
  // signal that error reporting itself was silently disabled was itself silenced in the only
  // environment where that matters. Confirmed real, not hypothetical: this is exactly why a
  // real Claude-primary failure in production (every `logError()` call, including
  // lib/ai/harness.ts's primary-provider failure) went unnoticed for ~12 days — `logError`
  // called `Sentry.captureException`, which was a genuine no-op with zero indication why.
  console.warn('[sentry] NEXT_PUBLIC_SENTRY_DSN not set — server-side error tracking is disabled.')
}
