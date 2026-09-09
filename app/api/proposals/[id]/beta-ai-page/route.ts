import { NextResponse } from 'next/server'
import { parse } from 'node-html-parser'
import { createClient } from '@/lib/supabase/server'
import { getAccountContext } from '@/lib/accountContext'
import { isBetaAiEngineEnabled } from '@/lib/betaFlags'
import { resolveBrandKit } from '@/lib/brand-extraction/prompt'
import { mapProposalToDealFacts } from '@/lib/ai/mapProposalToDealFacts'
import { buildCodegenPrompt } from '@/lib/ai/codegenPrompt'
import { runStageText } from '@/lib/ai/harness'
import { stripCodeFence } from '@/lib/ai/stripCodeFence'
import { verifyProposalTags } from '@/lib/ai/verifyProposalTags'
import { attemptAutoRepair } from '@/lib/ai/autoRepair'
import { injectVerifiedValues } from '@/lib/ai/injectVerifiedValues'
import { compileTailwindForHtml, buildFinalArtifact } from '@/lib/ai/compileTailwind'
import { publishGeneratedPage } from '@/lib/ai/publishGeneratedPage'
import { logError } from '@/lib/logging'
import type { ProposalType } from '@/lib/schema/proposal'

/** First real integration point for the new generation engine (docs/CORE_ENGINE_V2_SPEC.md's
 * whole proof chain — Phase 1+2, all previously proven only via dev routes and fixtures).
 * Feature-flagged, checked server-side (not just a hidden UI button) so a direct request from a
 * non-flagged account is genuinely refused, not merely hidden. Every pipeline call below is the
 * exact, unmodified function every dev proof route already used — the only new logic in this
 * whole route is the real-proposal → CodegenDealFacts mapping. */
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
    const { facts, sourceOfTruth } = mapProposalToDealFacts(proposal.content as ProposalType, account.currency)

    const prompt = buildCodegenPrompt(facts, brandKit)
    const result = await runStageText('codegen', { prompt, maxOutputTokens: 6000 })
    const htmlBeforeInjection = stripCodeFence(result.text)

    let verification = verifyProposalTags(parse(htmlBeforeInjection), sourceOfTruth)
    let repairedHtml = htmlBeforeInjection
    if (!verification.allPresent) {
      const repair = await attemptAutoRepair(htmlBeforeInjection, facts, brandKit, sourceOfTruth, verification)
      repairedHtml = repair.html
      verification = repair.verification
      if (!verification.allPresent) {
        return NextResponse.json({ error: 'Could not generate a valid page for this proposal after repair attempts.', verification }, { status: 500 })
      }
    }

    const root = parse(repairedHtml)
    const htmlAfterInjection = injectVerifiedValues(root, sourceOfTruth)
    const compiledCss = await compileTailwindForHtml(htmlAfterInjection)
    const finalHtml = buildFinalArtifact(htmlAfterInjection, compiledCss)

    const published = await publishGeneratedPage(proposal.id, {
      html: finalHtml,
      provider: result.provider,
      model: result.model,
      usedFallback: result.usedFallback,
    })

    return NextResponse.json({
      version: published.version,
      slug: proposal.slug,
      previewPath: `/${proposal.slug}`,
    })
  } catch (error) {
    logError('Beta AI page generation failed', error, { proposalId: id })
    return NextResponse.json({ error: 'Something went wrong generating the beta page.' }, { status: 500 })
  }
}
