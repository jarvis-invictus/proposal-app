import * as Sentry from '@sentry/nextjs'

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    debug: false,
  })
} else if (process.env.NODE_ENV !== 'production') {
  // Deliberately still dev-only, unlike the server/edge configs — this warning prints to the
  // real browser console of anyone viewing a live proposal page (a client, not just Sahil), and
  // "our monitoring isn't configured" isn't something to surface to that audience. The
  // Claude-primary failure this session is investigating happens server-side only
  // (lib/ai/harness.ts, called from an API route), so the client bundle isn't where that
  // specific blind spot needs closing — see sentry.server.config.ts for the one that does.
  console.warn('[sentry] NEXT_PUBLIC_SENTRY_DSN not set — client-side error tracking is disabled.')
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
