import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { headers, cookies } from 'next/headers'
import { env } from '@/env'
import { verifyProposalAccessToken, proposalAccessCookieName } from '@/lib/proposalAccess'
import PublicProposalView from './PublicProposalView'
import { PasswordGate } from './PasswordGate'
import { ProposalUnavailable } from './ProposalUnavailable'

// generateMetadata and the page component both run for the same request — React's cache()
// dedupes them into a single DB round trip instead of two, keyed by the slug argument.
const getProposalBySlug = cache(async (slug: string) => {
  // Uses the service_role key so we can get the account's display-only payment details
  // (which is otherwise blocked by RLS for public visitors).
  const adminSupabase = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  return adminSupabase
    .from('proposals')
    .select('*, accounts(payment_upi_id, payment_link, payment_qr_url, currency), brand_kits(*)')
    .eq('slug', slug)
    .single()
})

// Also cache()-deduped — both generateMetadata and the page component need to know whether the
// current visitor is the owning account, and this was previously computed twice (or, in
// generateMetadata's case, never at all — see the comment below).
const getViewerAccountId = cache(async (): Promise<string | null> => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: userRecord } = await supabase.from('users').select('account_id').eq('id', user.id).single()
  return userRecord?.account_id ?? null
})

// The core "share one link" feature previewed as bare title-only (or nothing at all) in
// Slack/iMessage/WhatsApp with no openGraph/twitter metadata — this is the fix. No per-request
// object is passed to generateMetadata, so the host is read via next/headers to build an
// absolute image URL (there's no metadataBase configured anywhere in this app). Reuses the same
// cached getProposalBySlug() the page component calls below instead of its own separate query.
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  const { data: proposal } = await getProposalBySlug(resolvedParams.slug)
  const viewerAccountId = await getViewerAccountId()
  const isOwner = viewerAccountId === proposal?.account_id

  // An unpublished proposal's real title/client name shouldn't linger in link-preview metadata
  // either — the page body already refuses to show it (ProposalUnavailable), so the <head>
  // shouldn't quietly keep serving it to whatever crawler or chat unfurl still has the old link.
  if (proposal?.status === 'ARCHIVED' && !isOwner) {
    return { title: 'Proposal', description: 'This proposal is no longer available.' }
  }

  // A password-protected proposal's real title/client name is exactly the content the gate below
  // exists to hide — previously this ran unconditionally, leaking it straight into the HTML
  // <head> (page title, Open Graph tags) regardless of whether the render itself was gated.
  // Same token check as the page component below — once a visitor has actually unlocked it,
  // there's no reason to keep hiding the title from them specifically.
  if (proposal?.password_hash && !isOwner) {
    const token = (await cookies()).get(proposalAccessCookieName(proposal.id))?.value
    if (!verifyProposalAccessToken(token, proposal.id, proposal.password_hash)) {
      return { title: 'Proposal', description: 'A password-protected proposal made with Marg.' }
    }
  }

  const title = proposal?.content?.title || 'Proposal'
  const clientName = proposal?.content?.clientName as string | undefined
  const description = clientName ? `A proposal prepared for ${clientName}.` : 'A proposal made with Marg.'

  const host = (await headers()).get('host')
  const logoUrl = host ? `${host.startsWith('localhost') || host.startsWith('127.0.0.1') ? 'http' : 'https'}://${host}/logo.png` : undefined

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      ...(logoUrl ? { images: [{ url: logoUrl, width: 542, height: 462, alt: 'Marg' }] } : {}),
    },
    twitter: {
      card: 'summary',
      title,
      description,
      ...(logoUrl ? { images: [logoUrl] } : {}),
    },
  }
}

export default async function PublicProposalPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params

  const viewerAccountId = await getViewerAccountId()
  const { data: proposal, error } = await getProposalBySlug(resolvedParams.slug)

  if (error || !proposal) {
    notFound()
  }

  const isOwner = viewerAccountId === proposal.account_id

  // A proposal the owner took down — a clear "no longer available" message, not a 404 that
  // reads as a broken/wrong link, and not the content itself either.
  if (proposal.status === 'ARCHIVED' && !isOwner) {
    return <ProposalUnavailable />
  }
  if (proposal.status !== 'PUBLISHED' && !isOwner) {
    notFound() // Hide drafts from the public
  }

  // Password gate — content must never reach the client until the correct password is supplied.
  // Checked before proposalForClient is even built below, so proposal.content never enters this
  // render's props for a visitor who hasn't unlocked it yet.
  if (proposal.password_hash && !isOwner) {
    const token = (await cookies()).get(proposalAccessCookieName(proposal.id))?.value
    if (!verifyProposalAccessToken(token, proposal.id, proposal.password_hash)) {
      return <PasswordGate slug={resolvedParams.slug} />
    }
  }

  // Never ship the hash to the client, even for the owner's own preview.
  const { password_hash: _password_hash, ...proposalForClient } = proposal

  return (
    <PublicProposalView
      proposal={proposalForClient}
      paymentDisplay={proposal.accounts ?? null}
      isOwner={isOwner}
      currency={proposal.accounts?.currency || 'USD'}
    />
  )
}
