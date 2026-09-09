import type { HTMLElement } from 'node-html-parser'
import { currencySymbol, formatAmount } from '@/lib/formatCurrency'

export type ProposalSourceOfTruth = {
  priceTotal: number
  currency: string
  dueDate: string // ISO date, e.g. '2026-11-15'
}

export type FieldVerification = {
  present: boolean
  rawText: string | null
  canonicalValue: string
  matches: boolean
}

export type VerificationReport = {
  priceTotal: FieldVerification
  dueDate: FieldVerification
  acceptAction: { present: boolean; exactlyOne: boolean; count: number }
  allPresent: boolean
}

/** Composes the two already-exported currency helpers — symbol + grouped digits — rather than
 * inventing new price-formatting logic. This function *is* the guardrail: whatever it returns is
 * what gets injected as the real, canonical value. */
export function canonicalPrice(sot: ProposalSourceOfTruth): string {
  return `${currencySymbol(sot.currency)}${formatAmount(sot.priceTotal, sot.currency)}`
}

/** Pinned to an explicit format rather than the runtime-default-locale `.toLocaleDateString()`
 * used elsewhere for cosmetic dates (dateIssued/validUntil) — a guardrail can't inherit an
 * ambiguity the rest of the codebase can tolerate. */
export function canonicalDueDate(sot: ProposalSourceOfTruth): string {
  return new Date(sot.dueDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

/** Generalizes checkTags.ts's mechanism (Phase 1 sub-piece 1) into a real per-field report, not
 * just a pass/fail boolean — docs/CORE_ENGINE_V2_SPEC.md §6's deterministic verification, first
 * real version. Takes an already-parsed tree (not a raw HTML string) so injectVerifiedValues can
 * mutate the exact same tree this report was taken from. */
export function verifyProposalTags(root: HTMLElement, sot: ProposalSourceOfTruth): VerificationReport {
  const priceEl = root.querySelector('[data-proposal-field="price_total"]')
  const dueDateEl = root.querySelector('[data-proposal-field="due_date"]')
  const acceptEls = root.querySelectorAll('[data-proposal-action="accept"]')

  const canonicalP = canonicalPrice(sot)
  const canonicalD = canonicalDueDate(sot)

  const priceTotal: FieldVerification = {
    present: !!priceEl,
    rawText: priceEl ? priceEl.textContent : null,
    canonicalValue: canonicalP,
    matches: !!priceEl && priceEl.textContent.trim() === canonicalP,
  }
  const dueDate: FieldVerification = {
    present: !!dueDateEl,
    rawText: dueDateEl ? dueDateEl.textContent : null,
    canonicalValue: canonicalD,
    matches: !!dueDateEl && dueDateEl.textContent.trim() === canonicalD,
  }
  const acceptAction = {
    present: acceptEls.length > 0,
    exactlyOne: acceptEls.length === 1,
    count: acceptEls.length,
  }

  return {
    priceTotal,
    dueDate,
    acceptAction,
    // Requires exactlyOne, not just present — a page with two accept/sign buttons is not
    // structurally ready to publish either, and nothing else in the pipeline catches it
    // (injectVerifiedValues never touches data-proposal-action by design).
    allPresent: priceTotal.present && dueDate.present && acceptAction.present && acceptAction.exactlyOne,
  }
}
