import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingWizard } from './OnboardingWizard'
import { DashboardClient, type DashboardProposal } from './DashboardClient'
import { formatCurrency } from '@/lib/formatCurrency'

const PLAN_LABEL: Record<string, string> = { free: 'Free plan', pay_per_proposal: 'Pay-per-proposal plan', agency: 'Agency plan' }

function dealValue(content: any, currencyCode: string): string {
  const packages = content?.packages
  if (!Array.isArray(packages) || packages.length === 0) return ''
  const highest = Math.max(...packages.map((p: any) => Number(p.discountedPrice) || 0))
  return highest > 0 ? formatCurrency(highest, currencyCode) : ''
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: accountData } = await supabase
    .from('accounts')
    .select('id, name, onboarding_completed_at, category, plan_tier, currency, subdomain')
    .single()

  const accountName = accountData?.name || 'Marg Studio'

  // The wizard is a full-screen flow (its own header, no sidebar) shown until it's finished
  // once — by completing it or using "Skip setup" — which persists onboarding_completed_at.
  if (accountData && !accountData.onboarding_completed_at) {
    const firstName = (user.user_metadata?.full_name as string | undefined)?.split(' ')[0] || user.email?.split('@')[0] || 'there'
    // Reloading before the wizard is finished restarts it from the welcome screen every time
    // (progress isn't persisted) — so the brand-kit step needs to know a kit from an earlier
    // attempt already exists, or it looks like a brand-new scan on every revisit.
    const { data: existingKitRows } = await supabase
      .from('brand_kits')
      .select('id, name, colors')
      .eq('account_id', accountData.id)
      .order('updated_at', { ascending: false })
    const existingBrandKits = (existingKitRows ?? []).map((row) => ({
      id: row.id,
      name: row.name || 'Your brand kit',
      colors: (row.colors as any) || null,
    }))
    return <OnboardingWizard firstName={firstName} accountId={accountData.id} existingBrandKits={existingBrandKits} />
  }

  const [{ data: proposalRows }, { count: brandKitCount }] = await Promise.all([
    supabase
      .from('proposals')
      .select('id, slug, content, updated_at, status, accepted_at, last_viewed_at')
      .order('updated_at', { ascending: false }),
    supabase.from('brand_kits').select('id', { count: 'exact', head: true }),
  ])

  const rows = proposalRows ?? []

  const proposals: DashboardProposal[] = rows.map((p) => {
    let displayStatus: DashboardProposal['displayStatus'] = 'draft'
    let statusLabel: string | undefined
    if (p.status === 'PENDING_APPROVAL') { displayStatus = 'sent'; statusLabel = 'Pending approval' }
    else if (p.status === 'ARCHIVED') { displayStatus = 'draft'; statusLabel = 'Archived' }
    else if (p.status === 'PUBLISHED') {
      displayStatus = p.accepted_at ? 'accepted' : p.last_viewed_at ? 'viewed' : 'sent'
    }
    return {
      id: p.id,
      slug: p.slug,
      title: p.content?.title || 'Untitled proposal',
      client: p.content?.clientName || 'Unknown client',
      updatedAt: p.updated_at,
      value: dealValue(p.content, accountData?.currency || 'USD'),
      displayStatus,
      statusLabel,
      pendingApproval: p.status === 'PENDING_APPROVAL',
    }
  })

  const counts = {
    total: rows.length,
    open: rows.filter((p) => p.status === 'PUBLISHED' && !p.accepted_at).length,
    won: rows.filter((p) => !!p.accepted_at).length,
  }

  const clients = Array.from(new Set(proposals.map((p) => p.client))).sort()

  const setupDone = {
    brand: (brandKitCount ?? 0) > 0,
    proposal: rows.length > 0,
    share: rows.some((p) => p.status === 'PUBLISHED'),
  }
  const showNudge = !(setupDone.brand && setupDone.proposal && setupDone.share)

  return (
    <DashboardClient
      accountName={accountName}
      planLabel={PLAN_LABEL[accountData?.plan_tier || 'free']}
      category={accountData?.category ?? null}
      proposals={proposals}
      counts={counts}
      clients={clients}
      setupDone={setupDone}
      showNudge={showNudge}
      accountSubdomain={accountData?.subdomain ?? null}
    />
  )
}
