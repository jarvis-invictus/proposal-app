import type { HTMLElement } from 'node-html-parser'
import { canonicalPrice, canonicalDueDate, type ProposalSourceOfTruth } from '@/lib/ai/verifyProposalTags'

/** Overwrites every present tagged element's content with the real, canonical value —
 * unconditionally, regardless of whether it already matched — so a wrong or oddly-phrased
 * price/date becomes structurally impossible in the final output, not just detected
 * (docs/CORE_ENGINE_V2_SPEC.md §7). Operates on the same parsed tree `verifyProposalTags` just
 * read, so the "before" report and this mutation describe the same document. A missing tag is
 * left alone here — that's verifyProposalTags's job to report as a failure, not injection's job
 * to invent content for. */
export function injectVerifiedValues(root: HTMLElement, sot: ProposalSourceOfTruth): string {
  const priceEl = root.querySelector('[data-proposal-field="price_total"]')
  if (priceEl) priceEl.set_content(canonicalPrice(sot))

  const dueDateEl = root.querySelector('[data-proposal-field="due_date"]')
  if (dueDateEl) dueDateEl.set_content(canonicalDueDate(sot))

  return root.toString()
}
