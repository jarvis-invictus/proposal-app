import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from './DashboardShell'
import { StatStrip } from '@/components/app/StatStrip'
import { EmptyState } from '@/components/app/EmptyState'
import { DashboardActions } from './DashboardActions'
import { DashboardEntryPoints } from './DashboardEntryPoints'
import { OnboardingSequence } from './OnboardingSequence'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch the account name from the accounts table using the authenticated user's ID
  const { data: accountData } = await supabase
    .from('accounts')
    .select('id, name, onboarding_completed_at')
    .single()

  const accountName = accountData?.name || 'your Dashboard'

  // Onboarding: shown in place of the normal dashboard until brand kit + first proposal +
  // first share are all done, then permanently retired via onboarding_completed_at.
  if (accountData && !accountData.onboarding_completed_at) {
    const [{ count: brandKitCount }, { data: allProposals }] = await Promise.all([
      supabase.from('brand_kits').select('id', { count: 'exact', head: true }),
      supabase.from('proposals').select('id, status').order('updated_at', { ascending: false }),
    ])

    const done = {
      brandKit: (brandKitCount ?? 0) > 0,
      proposal: (allProposals?.length ?? 0) > 0,
      shared: (allProposals ?? []).some((p) => p.status === 'PUBLISHED'),
    }

    if (done.brandKit && done.proposal && done.shared) {
      // All three complete — persist it server-side so this is retired for good, not just
      // hidden client-side, then fall through to render the normal dashboard below.
      await supabase
        .from('accounts')
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq('id', accountData.id)
    } else {
      return (
        <DashboardShell userEmail={user.email ?? ''}>
          <OnboardingSequence
            name={accountName}
            done={done}
            latestProposalId={allProposals?.[0]?.id ?? null}
          />
        </DashboardShell>
      )
    }
  }

  // Fetch user's proposals
  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, content, updated_at, status')
    .eq('status', 'DRAFT')
    .order('updated_at', { ascending: false })

  // Lightweight status counts for the quick-figures strip (doesn't affect the DRAFT-only list above)
  const { data: allStatuses } = await supabase
    .from('proposals')
    .select('status')

  const counts = {
    total: allStatuses?.length ?? 0,
    draft: allStatuses?.filter((p) => p.status === 'DRAFT').length ?? 0,
    published: allStatuses?.filter((p) => p.status === 'PUBLISHED').length ?? 0,
  }

  return (
    <DashboardShell userEmail={user.email ?? ''}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 'var(--text-h2)', fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-primary)' }}>
          Welcome to {accountName}
        </h1>
      </div>

      <StatStrip
        counts={counts}
        items={[
          { key: 'total', label: 'Total proposals', icon: 'file-text' },
          { key: 'draft', label: 'Drafts', icon: 'clock' },
          { key: 'published', label: 'Published', icon: 'circle-check-big' },
        ]}
      />

      <DashboardEntryPoints />

      {proposals && proposals.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 24 }}>
          {proposals.map((proposal) => (
            <DashboardActions key={proposal.id} proposal={proposal} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No proposals yet"
          description="Get started by creating a new proposal."
        />
      )}
    </DashboardShell>
  )
}
