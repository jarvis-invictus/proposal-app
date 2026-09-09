import type { SupabaseClient } from '@supabase/supabase-js'

export const FREE_TIER_ACTIVE_PROPOSAL_LIMIT = 1

export type ProposalLimitCheck = { allowed: true } | { allowed: false; reason: string }

/** The free tier's stated "1 active proposal" limit (`app/dashboard/settings/SettingsClient.tsx`'s
 * own pricing copy), enforced here for the first time. `pay_per_proposal` and `agency` are both
 * uncapped by proposal count per that same copy, so this only ever blocks `free`. "Active" means
 * `status != 'ARCHIVED'` — the only status the schema or the dashboard itself ever treats as
 * put-away (`proposal_status_enum`: DRAFT, PENDING_APPROVAL, PUBLISHED, ARCHIVED).
 *
 * Takes the caller's own RLS-scoped client, same as every other plan-tier check in this app
 * (e.g. `connectDomain` in `app/dashboard/settings/actions.ts`) — no service-role client needed.
 * Not hardened against a concurrent double-create race, same as those existing checks. */
export async function checkActiveProposalLimit(supabase: SupabaseClient, accountId: string): Promise<ProposalLimitCheck> {
  const { data: account } = await supabase.from('accounts').select('plan_tier').eq('id', accountId).single()
  if (account?.plan_tier !== 'free') return { allowed: true }

  const { count } = await supabase
    .from('proposals')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .neq('status', 'ARCHIVED')

  if ((count ?? 0) >= FREE_TIER_ACTIVE_PROPOSAL_LIMIT) {
    return { allowed: false, reason: `Free plan is limited to ${FREE_TIER_ACTIVE_PROPOSAL_LIMIT} active proposal. Archive your existing proposal or upgrade to create another.` }
  }
  return { allowed: true }
}
