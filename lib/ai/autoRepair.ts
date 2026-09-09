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

function describeTagFailures(v: VerificationReport): string[] {
  const failures: string[] = []
  if (!v.priceTotal.present) failures.push('data-proposal-field="price_total" (on the element whose visible text shows the final total price) is missing — add it to the real element.')
  if (!v.dueDate.present) failures.push('data-proposal-field="due_date" (on the element whose visible text shows the project due date) is missing — add it to the real element.')
  if (!v.acceptAction.present) {
    failures.push('data-proposal-action="accept" is missing — add it to the single accept/sign button.')
  } else if (!v.acceptAction.exactlyOne) {
    // Distinct wording from the missing case, on purpose — "remove the extra" is a different
    // instruction than "add the missing one", and conflating them risks the model not
    // understanding which real change is actually being asked for.
    failures.push(`data-proposal-action="accept" appears on ${v.acceptAction.count} different elements, but must appear on exactly ONE. Remove this attribute from every extra element — keep it on only the real accept/sign button — without changing anything else about the page.`)
  }
  return failures
}

/** Bounded, mechanical retry for the guardrail gaps flagged since Phase 1 sub-piece 2:
 * `verifyProposalTags` reporting a missing tag, or a duplicated accept action, with nothing
 * attempting a fix (docs/CORE_ENGINE_V2_SPEC.md §4). Reuses the existing revise pathway (Phase 2)
 * rather than new prompt infrastructure — the feedback string names the specific problem(s) by
 * their real attribute, with distinct wording for "missing" vs. "duplicated" rather than a vague
 * "fix this". `allPresent` (gating below) requires `acceptAction.exactlyOne`, not just `present` —
 * a page with two accept buttons is exactly as unready to publish as one missing its accept
 * button, so both are handled by the same bounded retry.
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
    const failures = describeTagFailures(currentVerification)
    const feedback = `AUTOMATIC REPAIR REQUIRED — the previous version has the following problem(s): ${failures.join('; ')}. Fix ONLY this. Do not change anything else about the page.`

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
