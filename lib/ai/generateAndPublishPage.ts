import { parse } from 'node-html-parser'
import type { BrandKitContext } from '@/lib/brand-extraction/prompt'
import { flattenProposalFacts } from '@/lib/ai/flattenProposalFacts'
import { computeDueDateFact } from '@/lib/ai/computeDueDateFact'
import { buildGenericCodegenPrompt, resolveDisplayFonts } from '@/lib/ai/genericCodegenPrompt'
import { runStageText } from '@/lib/ai/harness'
import { stripCodeFence } from '@/lib/ai/stripCodeFence'
import { genericVerifyFields, type FieldReport } from '@/lib/ai/genericVerifyFields'
import { genericInjectFields } from '@/lib/ai/genericInjectFields'
import { verifyHeadingFontUsage } from '@/lib/ai/verifyHeadingFont'
import { attemptGenericAutoRepair, checkAcceptAction, looksTruncated, type AcceptActionStatus } from '@/lib/ai/genericAutoRepair'
import { compileTailwindForHtml, buildFinalArtifact } from '@/lib/ai/compileTailwind'
import { googleFontsHref } from '@/lib/webfonts'
import { publishGeneratedPage } from '@/lib/ai/publishGeneratedPage'
import type { ProposalType } from '@/lib/schema/proposal'

const INITIAL_MAX_OUTPUT_TOKENS = 8000
const RETRY_MAX_OUTPUT_TOKENS = 14000

/** Thrown when generation completes but never reaches a publishable state (truncation survives
 * the retry, or required tags/the accept action are still missing after repair) — distinct from
 * an unexpected exception (network error, AI SDK throw) so callers can report *why* generation
 * failed instead of a generic 500. */
export class GenerationFailedError extends Error {
  report?: FieldReport[]
  acceptAction?: AcceptActionStatus
  constructor(message: string, report?: FieldReport[], acceptAction?: AcceptActionStatus) {
    super(message)
    this.name = 'GenerationFailedError'
    this.report = report
    this.acceptAction = acceptAction
  }
}

export type GenerateAndPublishResult = { version: number; provider: string; model: string; usedFallback: boolean }

/** The real Core Engine V2 pipeline (docs/CORE_ENGINE_V2_SPEC.md) — flatten → prompt → generate →
 * verify/repair → inject → compile → build → publish. Extracted from what was previously inline
 * in app/api/proposals/[id]/beta-ai-page/route.ts (the only place it used to run) so the real
 * Publish flow (app/api/proposals/[id]/publish/route.ts, app/dashboard/settings/actions.ts's
 * approveProposal()) can call the exact same, single implementation instead of a second copy that
 * could drift — a real, confirmed bug found this session: Publish had never called this pipeline
 * at all, so every generated_pages row that existed was created either by the one-time
 * fire-and-forget call on new-proposal creation (app/dashboard/proposals/new/NewProposalClient.tsx,
 * gated behind the same "beta" button, not Publish) or by manual/diagnostic calls, never by the
 * real Publish button. Throws GenerationFailedError (a validation failure, not an exception) or
 * lets an unexpected error (network, AI SDK throw, timeout) propagate — callers decide what
 * "generation failed" should mean for their own flow; this function never silently swallows a
 * failure or returns a partial/placeholder result. */
export async function generateAndPublishPage(
  proposalId: string,
  content: ProposalType,
  brandKit: BrandKitContext | null,
  currency: string
): Promise<GenerateAndPublishResult> {
  const facts = flattenProposalFacts(content, currency)
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
      throw new GenerationFailedError('Could not generate a valid page for this proposal after repair attempts.', report, acceptAction)
    }
  }

  const finalRoot = parse(html)
  const htmlAfterInjection = genericInjectFields(finalRoot, facts)
  const compiledCss = await compileTailwindForHtml(htmlAfterInjection)
  const fontLinkHref = googleFontsHref([brandKit?.fonts?.heading, brandKit?.fonts?.body])
  const displayFonts = resolveDisplayFonts(brandKit)
  const finalHtml = buildFinalArtifact(htmlAfterInjection, compiledCss, fontLinkHref, displayFonts)

  const headingFontReport = verifyHeadingFontUsage(finalHtml, displayFonts.heading)
  if (headingFontReport.missing.length > 0 || !headingFontReport.cssVariableResolved) {
    console.warn(`[generateAndPublishPage] heading font check failed — ${headingFontReport.missing.length}/${headingFontReport.total} heading(s) missing the class, cssVariableResolved=${headingFontReport.cssVariableResolved}`, { proposalId, missing: headingFontReport.missing, resolvedFontFamily: headingFontReport.resolvedFontFamily })
  }

  const published = await publishGeneratedPage(proposalId, {
    html: finalHtml,
    provider: result.provider,
    model: result.model,
    usedFallback: result.usedFallback,
  })

  return { version: published.version, provider: result.provider, model: result.model, usedFallback: result.usedFallback }
}
