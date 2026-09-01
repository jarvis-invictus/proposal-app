import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    debug: false,
  })
} else if (process.env.NODE_ENV !== 'production') {
  console.warn('[sentry] NEXT_PUBLIC_SENTRY_DSN not set — client-side error tracking is disabled.')
}
