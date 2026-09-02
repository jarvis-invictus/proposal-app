import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'

// Every call in this file must be safe with zero Upstash env vars set — that's the state of
// every local dev machine until Sahil creates the account. Never throw here; degrade to "allow
// the request" instead, so an AI route never crashes over infrastructure that isn't provisioned
// yet.
const configured = !!process.env.UPSTASH_REDIS_REST_URL && !!process.env.UPSTASH_REDIS_REST_TOKEN

export type Bucket = 'chat' | 'generate'

// Two independent buckets, not one shared one: conversational turns and a full document
// generation have very different cost/behavior profiles, and sharing one budget meant a normal
// multi-turn conversation could exhaust the limit before the user ever reached "generate."
const limiters: Record<Bucket, Ratelimit | null> = { chat: null, generate: null }

if (configured) {
  const redis = Redis.fromEnv()
  limiters.chat = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(15, '10 m'),
    analytics: true,
    prefix: 'marg-ai-ratelimit-chat',
  })
  limiters.generate = new Ratelimit({
    redis,
    // Expensive LLM calls (GPT-4o, billed per request) — deliberately stricter than chat.
    limiter: Ratelimit.slidingWindow(6, '10 m'),
    analytics: true,
    prefix: 'marg-ai-ratelimit-generate',
  })
} else if (process.env.NODE_ENV !== 'production') {
  console.warn('[ratelimit] UPSTASH_REDIS_REST_URL/TOKEN not set — rate limiting is bypassed. Fine for local dev, not for production.')
}

export type RateLimitResult = { success: boolean; limit?: number; remaining?: number; reset?: number }

/** Checks the given identifier against the named bucket's sliding-window limit. Always returns
 * success:true when Upstash isn't configured — callers don't need their own env-presence
 * branching. */
export async function checkAiRateLimit(identifier: string, bucket: Bucket): Promise<RateLimitResult> {
  const limiter = limiters[bucket]
  if (!limiter) return { success: true }
  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier)
    return { success, limit, remaining, reset }
  } catch (err) {
    // Upstash reachability issue, not a rate-limit decision — fail open rather than blocking
    // every AI request because Redis had one bad moment.
    console.error(`[ratelimit] Upstash request failed for bucket "${bucket}", allowing request through:`, err)
    return { success: true }
  }
}

/** Prefer the signed-in account over raw IP — an IP throttles a whole shared office/VPN together
 * while letting an IP-rotating abuser dodge the limit on one account, the wrong unit for a SaaS
 * product. Falls back to IP only when there's no session (these routes don't require auth). */
export function rateLimitIdentifier(accountId: string | null, ip: string): string {
  return accountId ? `account:${accountId}` : `ip:${ip}`
}

/** x-forwarded-for can carry a client-supplied chain ("client, proxy1, proxy2") — the first
 * entry is the original client. Falls back to 127.0.0.1 locally, where there's no proxy chain
 * at all. */
export function extractClientIp(request: Request): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return request.headers.get('x-real-ip') || '127.0.0.1'
}
