import { parse } from 'node-html-parser'
import type { CodegenDealFacts } from '@/lib/ai/codegenPrompt'
import { buildRevisePrompt } from '@/lib/ai/revisePrompt'
import { runStageText } from '@/lib/ai/harness'
import { verifyProposalTags, type ProposalSourceOfTruth, type VerificationReport } from '@/lib/ai/verifyProposalTags'
import { stripCodeFence } from '@/lib/ai/stripCodeFence'
import type { BrandKitContext } from '@/lib/brand-extraction/prompt'

export type AutoRepairResult = {
  html: string
  verification: VerificationReport
  attemptsUsed: number
  repaired: boolean
}

export type AutoRepairOptions = {
  maxAttempts?: number
  /** Injectable prompt-builder, defaulting to the real `buildRevisePrompt`. Exists only so a test
   * can force every repair attempt to fail deterministically (proving the exhaustion path) — not
   * a production configuration point. */
  buildPrompt?: typeof buildRevisePrompt
}

function describeMissingTags(v: VerificationReport): string[] {
  const missing: string[] = []
  if (!v.priceTotal.present) missing.push('data-proposal-field="price_total" (on the element whose visible text shows the final total price)')
  if (!v.dueDate.present) missing.push('data-proposal-field="due_date" (on the element whose visible text shows the project due date)')
  if (!v.acceptAction.present) missing.push('data-proposal-action="accept" (on the single accept/sign button)')
  return missing
}

/** Bounded, mechanical retry for the guardrail gap flagged since Phase 1 sub-piece 2:
 * `verifyProposalTags` reporting a missing tag with nothing attempting a fix
 * (docs/CORE_ENGINE_V2_SPEC.md §4). Reuses the existing revise pathway (Phase 2) rather than new
 * prompt infrastructure — the feedback string names the specific missing element(s) by their real
 * attribute, not a vague "fix this". Gated purely on tag *presence* (`allPresent`), not
 * `acceptAction.exactlyOne` — a duplicated accept action is a different failure mode this does
 * not attempt to fix.
 *
 * Not a user-directed revision: the caller must NOT publish intermediate attempts or count them
 * against MAX_VERSIONS — only the final result (repaired-and-passing, or exhausted-and-failed) is
 * meant to reach `publishGeneratedPage`. This function never calls it itself. `html` in and out is
 * pre-injection markup — the same stage already passed into `injectVerifiedValues` elsewhere;
 * auto-repair only fixes tag presence, then hands back to the existing chain. */
export async function attemptAutoRepair(
  html: string,
  facts: CodegenDealFacts,
  brandKit: BrandKitContext | null,
  sourceOfTruth: ProposalSourceOfTruth,
  verification: VerificationReport,
  opts: AutoRepairOptions = {}
): Promise<AutoRepairResult> {
  if (verification.allPresent) {
    return { html, verification, attemptsUsed: 0, repaired: false }
  }

  const maxAttempts = opts.maxAttempts ?? 2
  const buildPrompt = opts.buildPrompt ?? buildRevisePrompt

  let currentHtml = html
  let currentVerification = verification

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const missing = describeMissingTags(currentVerification)
    const feedback = `AUTOMATIC REPAIR REQUIRED — the previous version is missing required elements: ${missing.join('; ')}. Fix ONLY this: add the missing attribute(s) to the correct real element(s). Do not change anything else about the page.`

    const prompt = buildPrompt(currentHtml, facts, brandKit, feedback)
    const result = await runStageText('revise', { prompt, maxOutputTokens: 6000 })
    currentHtml = stripCodeFence(result.text)
    currentVerification = verifyProposalTags(parse(currentHtml), sourceOfTruth)

    if (currentVerification.allPresent) {
      return { html: currentHtml, verification: currentVerification, attemptsUsed: attempt, repaired: true }
    }
  }

  return { html: currentHtml, verification: currentVerification, attemptsUsed: maxAttempts, repaired: false }
}
