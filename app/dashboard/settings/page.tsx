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

  const { data: userRecord } = await supabase.from('users').select('account_id, role').eq('id', user.id).single()
  const accountId = userRecord?.account_id

  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, business_address, gstin, default_validity_days, payment_upi_id, payment_link, payment_qr_url, plan_tier, extra_domain_slots, currency, stripe_customer_id, stripe_subscription_id, stripe_price_id, billing_status')
    .eq('id', accountId)
    .single()

  const { data: memberRows } = await supabase.from('users').select('id, role, avatar_url').eq('account_id', accountId)
  const { data: invitations } = await supabase
    .from('invitations')
    .select('id, email, role, invited_at, accepted_at')
    .eq('account_id', accountId)
    .is('accepted_at', null)
    .order('invited_at', { ascending: false })

  const { data: pendingProposals } = await supabase
    .from('proposals')
    .select('id, content, submitted_by, submitted_at')
    .eq('account_id', accountId)
    .eq('status', 'PENDING_APPROVAL')
    .order('submitted_at', { ascending: false })

  const { data: approvedProposals } = await supabase
    .from('proposals')
    .select('id, content, approved_by, approved_at')
    .eq('account_id', accountId)
    .not('approved_at', 'is', null)
    .order('approved_at', { ascending: false })
    .limit(5)

  const { data: brandKits } = await supabase.from('brand_kits').select('id, source_reference').eq('account_id', accountId)
  const { data: templates } = await supabase.from('templates').select('id, name').eq('account_id', accountId)
  const { data: domains } = await supabase.from('domains').select('id, domain_name, cname_verified, ssl_issued').eq('account_id', accountId)

  // Emails aren't stored on public.users — resolve them via the admin API, service-role only.
  const adminSupabase = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: authUsers } = await adminSupabase.auth.admin.listUsers()
  const emailById = new Map((authUsers?.users ?? []).map((u) => [u.id, u.email ?? '']))

  const members = (memberRows ?? []).map((m) => ({ ...m, email: emailById.get(m.id) || '' }))
  const pendingApprovals = (pendingProposals ?? []).map((p) => ({
    id: p.id, title: p.content?.title || 'Untitled proposal',
    submittedByEmail: p.submitted_by ? emailById.get(p.submitted_by) || '' : '',
    submittedAt: p.submitted_at,
  }))
  const recentApprovals = (approvedProposals ?? []).map((p) => ({
    id: p.id, title: p.content?.title || 'Untitled proposal',
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
