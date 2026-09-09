import { createClient as createAdminClient } from '@supabase/supabase-js'
import { env } from '@/env'

export type PublishGeneratedPageInput = {
  html: string
  provider: string
  model: string
  usedFallback: boolean
}

/** Hard round cap (docs/CORE_ENGINE_V2_SPEC.md §2 stage 10, §8) — enforced inside the
 * `publish_generated_page` Postgres function itself (see the migration), not here, so there's no
 * separate path that could bypass it. */
const MAX_VERSIONS = 3

/** Writes a new versioned row to `generated_pages` and marks it published
 * (docs/CORE_ENGINE_V2_SPEC.md §2 stage 11, §9). Service-role only — this table has no
 * anon/authenticated grants at all (see the migration).
 *
 * Calls a single atomic Postgres function (`supabase/migrations/20260909030806_add_publish_
 * generated_page_function.sql`) rather than a separate select-then-insert from application
 * code. That two-step pattern hit a real, 100%-reproducible bug in Phase 2 sub-piece 1: Next.js's
 * fetch request memoization returned a stale "0 existing rows" result for the second of two
 * structurally-identical version-lookups within one Server Component render, so a v1-then-v2
 * sequence both landed as version 1 (confirmed via direct DB query, and a targeted `cache:
 * 'no-store'` test on just the lookup call did NOT fix it — memoization is a separate layer from
 * the HTTP cache directive, per Next.js's own docs). That same two-step pattern was also the
 * previously-flagged race condition under genuine concurrent publishes. The atomic RPC call fixes
 * both: there's no longer a separate "read current state" request for anything to memoize
 * against or race with, and the function's own advisory transaction lock serializes real
 * concurrent calls for the same proposal. */
export async function publishGeneratedPage(proposalId: string, input: PublishGeneratedPageInput): Promise<{ id: string; version: number }> {
  const supabase = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data, error } = await supabase.rpc('publish_generated_page', {
    p_proposal_id: proposalId,
    p_html: input.html,
    p_provider: input.provider,
    p_model: input.model,
    p_used_fallback: input.usedFallback,
    p_max_versions: MAX_VERSIONS,
  })
  if (error) throw error

  const row = Array.isArray(data) ? data[0] : data
  return { id: row.id, version: row.version }
}
