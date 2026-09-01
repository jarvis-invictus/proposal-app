import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Every call in this file must be safe with zero Upstash env vars set — that's the state of
// every local dev machine until Sahil creates the account. Never throw here; degrade to "allow
// the request" instead, so an AI route never crashes over infrastructure that isn't provisioned
// yet.
const configured = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

let ratelimit: Ratelimit | null = null
if (configured) {
  ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    // Expensive LLM calls (GPT-4o, billed per request) — deliberately strict.
    limiter: Ratelimit.slidingWindow(5, '10 m'),
    analytics: true,
    prefix: 'marg-ai-ratelimit',
  })
} else if (process.env.NODE_ENV !== 'production') {
  console.warn('[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting is bypassed. Fine for local dev, not for production.')
}

export type RateLimitResult = { success: boolean; limit?: number; remaining?: number; reset?: number }

/** Checks the given identifier (normally a client IP) against the shared AI rate limit.
 * Always returns success:true when Upstash isn't configured — callers don't need their own
 * env-presence branching. */
export async function checkAiRateLimit(identifier: string): Promise<RateLimitResult> {
  if (!ratelimit) return { success: true }
  try {
    const { success, limit, remaining, reset } = await ratelimit.limit(identifier)
    return { success, limit, remaining, reset }
  } catch (err) {
    // Upstash reachability issue, not a rate-limit decision — fail open rather than blocking
    // every AI request because Redis had one bad moment.
    console.error('[ratelimit] Upstash request failed, allowing request through:', err)
    return { success: true }
  }
}

/** x-forwarded-for can carry a client-supplied chain ("client, proxy1, proxy2") — the first
 * entry is the original client. Falls back to 127.0.0.1 locally, where there's no proxy chain
 * at all. */
export function extractClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return request.headers.get('x-real-ip') || '127.0.0.1'
}
