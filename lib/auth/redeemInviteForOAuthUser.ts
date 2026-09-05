import { createClient as createAdminClient } from '@supabase/supabase-js'
import type { User } from '@supabase/supabase-js'
import { env } from '@/env'
import { logError } from '@/lib/logging'

/**
 * The on_auth_user_created trigger (supabase/migrations/20260901160000_invite_redemption_on_signup.sql)
 * only reads raw_user_meta_data, which is set at signup time — but signInWithOAuth has no `data`
 * option the way signUp does, so an invited teammate signing up with Google always lands in a
 * brand-new standalone account the trigger creates for them, with the invite_id nowhere for it to
 * read. This reconciles that after the fact, from the OAuth callback route, using the exact same
 * match rule the trigger itself uses (id + accepted_at IS NULL + case-insensitive email match) so
 * an invalid/stale/wrong-email invite id degrades the same safe way it does for a password signup:
 * silently do nothing and leave the user in the account the trigger already gave them.
 */
export async function redeemInviteForOAuthUser(user: User, inviteId: string) {
  const adminSupabase = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: invitation } = await adminSupabase
    .from('invitations')
    .select('id, account_id, role')
    .eq('id', inviteId)
    .is('accepted_at', null)
    .ilike('email', user.email ?? '')
    .maybeSingle()

  if (!invitation) return

  const { data: userRow } = await adminSupabase
    .from('users')
    .select('account_id')
    .eq('id', user.id)
    .single()

  if (!userRow || userRow.account_id === invitation.account_id) return

  // Only reassign a genuinely fresh, still-empty auto-created account — never an account the
  // user has since actually started using — so replaying an old invite link months later can't
  // rip someone out of the real account they've built up in the meantime.
  const [{ count: memberCount }, { count: proposalCount }] = await Promise.all([
    adminSupabase.from('users').select('id', { count: 'exact', head: true }).eq('account_id', userRow.account_id),
    adminSupabase.from('proposals').select('id', { count: 'exact', head: true }).eq('account_id', userRow.account_id),
  ])
  if (memberCount !== 1 || proposalCount !== 0) return

  const staleAccountId = userRow.account_id

  const { error: reassignError } = await adminSupabase
    .from('users')
    .update({ account_id: invitation.account_id, role: invitation.role })
    .eq('id', user.id)
  if (reassignError) {
    logError('Failed to reassign OAuth user onto invited account', reassignError, { userId: user.id, inviteId })
    return
  }

  await adminSupabase.from('invitations').update({ accepted_at: new Date().toISOString() }).eq('id', invitation.id)

  // Best-effort cleanup of the orphaned solo account the trigger created — the user's already
  // moved onto the real account either way, so a failure here is just a harmless leftover row.
  const { error: cleanupError } = await adminSupabase.from('accounts').delete().eq('id', staleAccountId)
  if (cleanupError) {
    logError('Failed to clean up orphaned auto-created account after OAuth invite redemption', cleanupError, { staleAccountId, userId: user.id })
  }
}
