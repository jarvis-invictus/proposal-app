import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { logError } from '@/lib/logging'
import { isBetaAiEngineEnabled } from '@/lib/betaFlags'
import { resolveBrandKit } from '@/lib/brand-extraction/prompt'
import { generateAndPublishPage, GenerationFailedError } from '@/lib/ai/generateAndPublishPage'
import type { ProposalType } from '@/lib/schema/proposal'

// Real Core Engine V2 generation (see the aiPage block below) can take well over Vercel's default
// function timeout — confirmed by direct measurement this session, 20-120s depending on whether a
// repair round is needed. This route previously had no maxDuration at all; a proposal's real
// Publish action must not risk being killed mid-request by a platform default sized for a plain
// status update. 60s is the same ceiling app/api/generate-proposal/route.ts already uses.
export const maxDuration = 60

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRecord } = await supabase.from('users').select('account_id, role, accounts(currency)').eq('id', user.id).single()
  if (!userRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const accountCurrency = (Array.isArray(userRecord.accounts) ? userRecord.accounts[0] : userRecord.accounts)?.currency || 'USD'

  // RLS ("Users can manage own proposals") already scopes this select/update to the caller's
  // own account, but checking account_id explicitly keeps the 404-vs-403 behavior obvious here
  // rather than depending on a policy defined elsewhere.
  const { data: proposal, error: fetchError } = await supabase
    .from('proposals')
    .select('id, account_id, status, slug, content, brand_kit_id')
    .eq('id', id)
    .single()

  if (fetchError || !proposal || proposal.account_id !== userRecord.account_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (proposal.status !== 'DRAFT') {
    return NextResponse.json({ error: `Cannot publish a proposal with status ${proposal.status}` }, { status: 400 })
  }

  const isDrafter = userRecord.role === 'drafter'
  const nextStatus = isDrafter ? 'PENDING_APPROVAL' : 'PUBLISHED'

  const updateData: Record<string, any> = { status: nextStatus, updated_at: new Date().toISOString() }
  if (isDrafter) {
    updateData.submitted_by = user.id
    updateData.submitted_at = new Date().toISOString()
  }

  // .eq('status', 'DRAFT') is what actually prevents the race, not the earlier SELECT above
  // (that's only a fast-path 400 for the common case — two concurrent publish clicks/retries can
  // both pass it). Whichever request's UPDATE lands first wins the row here; the other matches
  // zero rows and gets maybeSingle() -> null instead of silently double-publishing and inserting
  // a duplicate approval notification — same pattern accept/route.ts uses for accepted_at.
  const { data: updated, error: updateError } = await supabase
    .from('proposals')
    .update(updateData)
    .eq('id', id)
    .eq('status', 'DRAFT')
    .select('status, slug')
    .maybeSingle()

  if (updateError) {
    logError('Failed to update proposal status', updateError, { proposalId: id, nextStatus })
    return NextResponse.json({ error: 'Failed to update the proposal — please try again.' }, { status: 500 })
  }
  if (!updated) {
    return NextResponse.json({ error: 'This proposal was already published or submitted.' }, { status: 409 })
  }

  if (isDrafter) {
    // notifications has no INSERT policy for regular authenticated users (only SELECT/UPDATE),
    // same reason /api/proposals/[id]/view uses the service-role client for its own insert.
    const adminSupabase = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    const title = (proposal.content as any)?.title || 'A proposal'
    const { error: notifError } = await adminSupabase.from('notifications').insert({
      account_id: userRecord.account_id,
      proposal_id: id,
      message: `${title} was submitted for approval.`,
    })
    if (notifError) {
      logError('Failed to insert approval notification', notifError, { proposalId: id })
      // Don't fail the request over this — the status transition itself already succeeded.
    }
  }

  // Real bug this session found and closes: this route previously only ever flipped
  // `status`, never called Core Engine V2 — every generated_pages row that existed came from a
  // separate, disconnected trigger (the one-time fire-and-forget call on new-proposal creation)
  // or manual/diagnostic use, never from Publish. Runs only at the real "goes live" moment
  // (updated.status === 'PUBLISHED' — a drafter's PENDING_APPROVAL submission isn't live yet;
  // see approveProposal() in app/dashboard/settings/actions.ts for that path's own generation
  // call) and only for the same feature-flagged allowlist every other V2 entry point already
  // gates on — this does not change who gets the AI-generated page, only makes Publish actually
  // trigger it for accounts that already could.
  //
  // Deliberately NOT allowed to fail the publish itself: the status flip above is the real,
  // reliable "the link is live" guarantee every proposal has always had, and must keep having
  // regardless of whether the AI page designer succeeds this time. A failure here is caught,
  // logged for real (logError — Sentry once configured, console always), and reported back in
  // the response as aiPageGenerated:false + aiPageError — the client surfaces this to the person
  // who just clicked Publish (PublishModal.tsx's result screen) rather than silently serving the
  // generic template with no indication anything was even attempted, which is the exact failure
  // mode flagged as unacceptable this session.
  let aiPageGenerated = false
  let aiPageError: string | null = null
  if (updated.status === 'PUBLISHED' && isBetaAiEngineEnabled(userRecord.account_id)) {
    try {
      const brandKit = await resolveBrandKit(userRecord.account_id, proposal.brand_kit_id)
      await generateAndPublishPage(id, proposal.content as ProposalType, brandKit, accountCurrency)
      aiPageGenerated = true
    } catch (genError) {
      aiPageError = genError instanceof GenerationFailedError ? genError.message : 'Something went wrong generating the AI page design.'
      logError('AI page generation failed during publish', genError, { proposalId: id })
    }
  }

  return NextResponse.json({ status: updated.status, slug: updated.slug, aiPageGenerated, aiPageError })
}
