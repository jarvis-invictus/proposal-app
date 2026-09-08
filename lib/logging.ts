import * as Sentry from '@sentry/nextjs'

/** Reports to Sentry AND still logs to the console — call this instead of a bare
 * console.error so a failure is actually visible in production (Sentry), not just whichever
 * terminal happened to be tailing a `console.error` at the time. Works in both server and
 * client code; @sentry/nextjs swaps in the right SDK for each at build time. */
export function logError(message: string, error: unknown, context?: Record<string, unknown>) {
  console.error(message, error)
  Sentry.captureException(error, { extra: { message, ...context } })
}

/** One-line structured log for a destructive/irreversible action (delete, etc.) — actor and
 * target are the two things an incident review would need later ("who did this, to what"),
 * which a bare success path (or no logging at all) doesn't give you. */
export function logAction(action: string, actorId: string, target: Record<string, unknown>) {
  console.log(`[action] ${action}`, { actorId, ...target })
}

/** One-line structured log for which provider actually served a harness-wrapped AI call
 * (docs/CORE_ENGINE_V2_SPEC.md §3) — primary/fallback routing is otherwise invisible, and this
 * is the one place to look when a stage silently starts always falling back. */
export function logAiProvider(stage: string, provider: string, model: string, usedFallback: boolean) {
  console.log(`[ai-harness] ${stage}`, { provider, model, usedFallback })
}
