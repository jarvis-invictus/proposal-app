import { createClient as createAdminClient } from '@supabase/supabase-js'
import { env } from '@/env'

export type PublishGeneratedPageInput = {
  html: string
  provider: string
  model: string
  usedFallback: boolean
}

/** Writes a new versioned row to `generated_pages` and marks it published
 * (docs/CORE_ENGINE_V2_SPEC.md §2 stage 11, §9). Service-role only — this table has no
 * anon/authenticated grants at all (see the migration). KNOWN GAP, not fixed here: computing
 * `nextVersion` in application code and then inserting is a real race condition under concurrent
 * publishes for the same proposalId — harmless today since nothing else calls this function
 * against more than one test proposal, but a unique constraint + retry (or a serializable
 * transaction) would be the real fix before this handles genuine concurrent publishes. */
export async function publishGeneratedPage(proposalId: string, input: PublishGeneratedPageInput): Promise<{ id: string; version: number }> {
  const supabase = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: existing, error: existingError } = await supabase
    .from('generated_pages')
    .select('version')
    .eq('proposal_id', proposalId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (existingError) throw existingError

  const nextVersion = (existing?.version ?? 0) + 1

  const { data, error } = await supabase
    .from('generated_pages')
    .insert({
      proposal_id: proposalId,
      version: nextVersion,
      html: input.html,
      provider: input.provider,
      model: input.model,
      used_fallback: input.usedFallback,
      published_at: new Date().toISOString(),
    })
    .select('id, version')
    .single()
  if (error) throw error

  return data
}
