import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAccountContext } from '@/lib/accountContext'
import { isBetaAiEngineEnabled } from '@/lib/betaFlags'
import { resolveBrandKit } from '@/lib/brand-extraction/prompt'
import { generateAndPublishPage, GenerationFailedError } from '@/lib/ai/generateAndPublishPage'
import { logError } from '@/lib/logging'
import type { ProposalType } from '@/lib/schema/proposal'

export const maxDuration = 60

/** Thin wrapper around lib/ai/generateAndPublishPage.ts's real pipeline (docs/PROJECT_ROADMAP.md
 * §6, sub-piece 6) — the pipeline itself moved there so app/api/proposals/[id]/publish/route.ts
 * and approveProposal() (app/dashboard/settings/actions.ts) can call the exact same
 * implementation instead of a second copy. This route's own job is now just: auth, the
 * feature-flag gate (checked server-side, not just a hidden UI button, so a direct request from a
 * non-flagged account is genuinely refused), fetching the proposal, and shaping the response —
 * unchanged from before the extraction. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const account = await getAccountContext()
  if (!account) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isBetaAiEngineEnabled(account.accountId)) {
    return NextResponse.json({ error: 'This feature is not enabled for your account.' }, { status: 403 })
  }

  const supabase = await createClient()
  // RLS ("Users can manage own proposals") already scopes this to the caller's own account —
  // same reliance every other authenticated proposal route in this app already has.
  const { data: proposal, error: fetchError } = await supabase
    .from('proposals')
    .select('id, slug, brand_kit_id, content')
    .eq('id', id)
    .single()

  if (fetchError || !proposal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const brandKit = await resolveBrandKit(account.accountId, proposal.brand_kit_id)
    const content = proposal.content as ProposalType
    const published = await generateAndPublishPage(proposal.id, content, brandKit, account.currency)

    return NextResponse.json({
      version: published.version,
      slug: proposal.slug,
      previewPath: `/${proposal.slug}`,
    })
  } catch (error) {
    if (error instanceof GenerationFailedError) {
      return NextResponse.json({ error: error.message, report: error.report, acceptAction: error.acceptAction }, { status: 500 })
    }
    logError('Beta AI page generation failed', error, { proposalId: id })
    return NextResponse.json({ error: 'Something went wrong generating the beta page.' }, { status: 500 })
  }
}
