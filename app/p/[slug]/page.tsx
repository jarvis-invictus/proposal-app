import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { notFound } from 'next/navigation'
import { env } from '@/env'
import PublicProposalView from './PublicProposalView'

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  const adminSupabase = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data: proposal } = await adminSupabase
    .from('proposals')
    .select('content')
    .eq('slug', resolvedParams.slug)
    .single()
    
  return {
    title: proposal?.content?.title || 'Proposal'
  }
}

export default async function PublicProposalPage({ params }: { params: Promise<{ slug: string }> }) {
  const resolvedParams = await params
  
  // 1. Check if the current viewer is authenticated
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  let viewerAccountId = null
  if (user) {
    const { data: userRecord } = await supabase.from('users').select('account_id').eq('id', user.id).single()
    if (userRecord) viewerAccountId = userRecord.account_id
  }

  // 2. Fetch the proposal using the service_role key so we can get the account's display-only
  // payment details (which is otherwise blocked by RLS for public visitors).
  const adminSupabase = createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: proposal, error } = await adminSupabase
    .from('proposals')
    .select('*, accounts(payment_upi_id, payment_link, payment_qr_url, currency), brand_kits(*)')
    .eq('slug', resolvedParams.slug)
    .single()

  if (error || !proposal) {
    notFound()
  }

  // 3. Manual Authorization Guard
  const isOwner = viewerAccountId === proposal.account_id
  if (proposal.status !== 'PUBLISHED' && !isOwner) {
    notFound() // Hide drafts from the public
  }

  return (
    <PublicProposalView
      proposal={proposal}
      paymentDisplay={proposal.accounts ?? null}
      isOwner={isOwner}
      currency={proposal.accounts?.currency || 'USD'}
    />
  )
}
