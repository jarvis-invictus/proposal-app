import { NextResponse } from 'next/server'
import { parse } from 'node-html-parser'
import { createClient } from '@/lib/supabase/server'
import { getAccountContext } from '@/lib/accountContext'
import { isBetaAiEngineEnabled } from '@/lib/betaFlags'
import { resolveBrandKit } from '@/lib/brand-extraction/prompt'
import { flattenProposalFacts } from '@/lib/ai/flattenProposalFacts'
import { computeDueDateFact } from '@/lib/ai/computeDueDateFact'
import { buildGenericCodegenPrompt } from '@/lib/ai/genericCodegenPrompt'
import { runStageText } from '@/lib/ai/harness'
import { stripCodeFence } from '@/lib/ai/stripCodeFence'
import { genericVerifyFields } from '@/lib/ai/genericVerifyFields'
import { genericInjectFields } from '@/lib/ai/genericInjectFields'
import { attemptGenericAutoRepair, checkAcceptAction, looksTruncated } from '@/lib/ai/genericAutoRepair'
import { compileTailwindForHtml, buildFinalArtifact } from '@/lib/ai/compileTailwind'
import { publishGeneratedPage } from '@/lib/ai/publishGeneratedPage'
import { logError } from '@/lib/logging'
import type { ProposalType } from '@/lib/schema/proposal'

const INITIAL_MAX_OUTPUT_TOKENS = 8000
const RETRY_MAX_OUTPUT_TOKENS = 14000

/** Real integration point for the generic fact-addressing mechanism (docs/PROJECT_ROADMAP.md §6,
 * sub-piece 6 — the actual cutover, retiring mapProposalToDealFacts's role here). Feature-flagged,
 * checked server-side (not just a hidden UI button) so a direct request from a non-flagged account
 * is genuinely refused, not merely hidden. Every generic pipeline call below is the exact,
 * unmodified function every dev proof route (sub-pieces 1-5) already proved — the only new logic
 * in this route is appending one computed due-date fact and the truncation-check-and-retry on the
 * initial generation, matching every real generation call site elsewhere in this project. */
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

    const facts = flattenProposalFacts(content, account.currency)
    facts.push(computeDueDateFact(content))

    const prompt = buildGenericCodegenPrompt(facts, brandKit)

    let result = await runStageText('codegen', { prompt, maxOutputTokens: INITIAL_MAX_OUTPUT_TOKENS })
    let html = stripCodeFence(result.text)
    if (looksTruncated(html)) {
      result = await runStageText('codegen', { prompt, maxOutputTokens: RETRY_MAX_OUTPUT_TOKENS })
      html = stripCodeFence(result.text)
    }

    let root = parse(html)
    let report = genericVerifyFields(root, facts)
    let acceptAction = checkAcceptAction(root)

    if (!report.every((r) => r.present) || !acceptAction.exactlyOne) {
      const repair = await attemptGenericAutoRepair(html, facts, brandKit, report, acceptAction)
      html = repair.html
      report = repair.report
      acceptAction = repair.acceptAction
      if (!report.every((r) => r.present) || !acceptAction.exactlyOne) {
        return NextResponse.json(
          { error: 'Could not generate a valid page for this proposal after repair attempts.', report, acceptAction },
          { status: 500 }
        )
      }
    }

    const finalRoot = parse(html)
    const htmlAfterInjection = genericInjectFields(finalRoot, facts)
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
