import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { redirect } from 'next/navigation'
import { env } from '@/env'
import { AppShell } from '@/components/app/AppShell'
import { SettingsClient } from './SettingsClient'
import { logout } from '../../(auth)/actions'

const PLAN_LABEL: Record<string, string> = { free: 'Free plan', pay_per_proposal: 'Pay-per-proposal plan', agency: 'Agency plan' }

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Emails aren't stored on public.users — resolve them via the admin API, service-role only.
  const adminSupabase = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  const { data: userRecord } = await supabase.from('users').select('account_id, role').eq('id', user.id).single()
  const accountId = userRecord?.account_id

  const [
    { data: account },
    { data: memberRows },
    { data: invitations },
    { data: pendingProposals },
    { data: approvedProposals },
    { data: brandKits },
    { data: templates },
    { data: domains },
  ] = await Promise.all([
    supabase
      .from('accounts')
      .select('id, name, business_address, gstin, default_validity_days, payment_upi_id, payment_link, payment_qr_url, plan_tier, extra_domain_slots, currency, stripe_customer_id, stripe_subscription_id, stripe_price_id, billing_status, subdomain')
      .eq('id', accountId)
      .single(),
    supabase.from('users').select('id, role, avatar_url').eq('account_id', accountId),
    supabase
      .from('invitations')
      .select('id, email, role, invited_at, accepted_at')
      .eq('account_id', accountId)
      .is('accepted_at', null)
      .order('invited_at', { ascending: false }),
    supabase
      .from('proposals')
      .select("id, submitted_by, submitted_at, title:content->>title")
      .eq('account_id', accountId)
      .eq('status', 'PENDING_APPROVAL')
      .order('submitted_at', { ascending: false })
      .limit(200),
    supabase
      .from('proposals')
      .select("id, approved_by, approved_at, title:content->>title")
      .eq('account_id', accountId)
      .not('approved_at', 'is', null)
      .order('approved_at', { ascending: false })
      .limit(5),
    supabase.from('brand_kits').select('id, source_reference').eq('account_id', accountId),
    supabase.from('templates').select('id, name').eq('account_id', accountId),
    supabase.from('domains').select('id, domain_name, cname_verified, ssl_issued').eq('account_id', accountId),
  ])

  // Resolve emails only for the specific, bounded set of IDs this page actually needs — not
  // every signup on the whole platform (see DECISION_LOG.md for the listAllUsers() this
  // replaces). The ID set isn't known until the queries above resolve, so this is a genuinely
  // separate second wave, not folded into the Promise.all above.
  const memberIds = (memberRows ?? []).map((m) => m.id)
  const submitterIds = (pendingProposals ?? []).map((p) => p.submitted_by).filter((id): id is string => !!id)
  const approverIds = (approvedProposals ?? []).map((p) => p.approved_by).filter((id): id is string => !!id)
  const neededIds = Array.from(new Set([...memberIds, ...submitterIds, ...approverIds]))

  const authUserResults = await Promise.all(neededIds.map((id) => adminSupabase.auth.admin.getUserById(id)))
  const emailById = new Map(neededIds.map((id, i) => [id, authUserResults[i].data.user?.email ?? '']))

  const members = (memberRows ?? []).map((m) => ({ ...m, email: emailById.get(m.id) || '' }))
  const pendingApprovals = (pendingProposals ?? []).map((p) => ({
    id: p.id, title: p.title || 'Untitled proposal',
    submittedByEmail: p.submitted_by ? emailById.get(p.submitted_by) || '' : '',
    submittedAt: p.submitted_at,
  }))
  const recentApprovals = (approvedProposals ?? []).map((p) => ({
    id: p.id, title: p.title || 'Untitled proposal',
    approvedByEmail: p.approved_by ? emailById.get(p.approved_by) || '' : '',
    approvedAt: p.approved_at,
  }))

  return (
    <AppShell screen="settings" title="Settings" subtitle="Your business details, your team, and what your clients see."
      accountName={account?.name || 'Marg Studio'} planLabel={PLAN_LABEL[account?.plan_tier || 'free']}
      actions={
        <form action={logout}>
          <button type="submit" style={{
            border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)',
            color: 'var(--text-secondary)', fontWeight: 'var(--weight-medium)', fontFamily: 'var(--font-sans)',
          }}>
            Log out
          </button>
        </form>
      }>
      <SettingsClient
        account={account}
        userEmail={user.email ?? ''}
        myRole={userRecord?.role || 'owner'}
        members={members}
        invitations={invitations ?? []}
        pendingApprovals={pendingApprovals}
        recentApprovals={recentApprovals}
        sharedItems={{
          kits: (brandKits ?? []).map((k) => k.source_reference || 'Brand kit'),
          templates: (templates ?? []).map((t) => t.name),
        }}
        domains={domains ?? []}
      />
    </AppShell>
  )
}
