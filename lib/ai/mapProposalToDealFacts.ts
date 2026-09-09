import type { ProposalType } from '@/lib/schema/proposal'
import type { CodegenDealFacts } from '@/lib/ai/codegenPrompt'
import type { ProposalSourceOfTruth } from '@/lib/ai/verifyProposalTags'

/** Only this exact shape counts as a parseable phase duration — deliberately conservative,
 * checked against real local proposal data before being written this way: alongside clean cases
 * ("1 week", "2 weeks"), real timelines also contain "" (empty) and "Monthly", neither of which
 * this correctly rejects. A range like "2-3 weeks" or anything with extra words is also rejected
 * — never confidently reduced to "the first number found". */
const DURATION_PATTERN = /^(\d+)\s+(day|days|week|weeks|month|months)$/i
const DAYS_PER_UNIT: Record<string, number> = { day: 1, days: 1, week: 7, weeks: 7, month: 30, months: 30 }

export function parseDurationDays(duration: string): number | null {
  const match = DURATION_PATTERN.exec(duration.trim())
  if (!match) return null
  const [, countStr, unit] = match
  return Number(countStr) * DAYS_PER_UNIT[unit.toLowerCase()]
}

function parseDate(value: string): Date | null {
  const date = new Date(value)
  return isNaN(date.getTime()) ? null : date
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + days)
  return result
}

/** Computes a real due date from a real proposal's relative-duration timeline — there is no
 * fixed calendar due date anywhere in the real schema, only phase durations like "2 weeks" summed
 * from `dateIssued`. Falls back to `validUntil` + 30 days (or today + 30 if even that doesn't
 * parse) whenever *any* phase's duration fails `DURATION_PATTERN` — a mixed result is never
 * partially trusted. */
function computeDueDate(content: ProposalType): Date {
  const issued = parseDate(content.dateIssued)
  if (issued && content.timeline.length > 0) {
    let totalDays = 0
    let allParsed = true
    for (const phase of content.timeline) {
      const days = parseDurationDays(phase.duration)
      if (days === null) { allParsed = false; break }
      totalDays += days
    }
    if (allParsed) return addDays(issued, totalDays)
  }

  const validUntil = parseDate(content.validUntil)
  return addDays(validUntil ?? new Date(), 30)
}

/** Real bug found and fixed via the real-proposal verification run, not a fixture: `toISOString()`
 * converts through UTC, which silently shifts a local midnight back a calendar day on any
 * positive-UTC-offset server (confirmed live — a real proposal's computed "October 18, 2026"
 * local date came out as "2026-10-17" through `toISOString()`, exactly one day off). Extracting
 * the local year/month/day components directly avoids the UTC round-trip entirely. */
function toIsoDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function toDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

/** The one genuinely new piece of work in this integration — every prior sub-piece used
 * hardcoded fixtures; this derives the same shapes from a REAL, already-saved proposal
 * (docs/CORE_ENGINE_V2_SPEC.md's whole proof chain, now fed real data for the first time). Pure
 * data mapping — no AI call, no new generation/guardrail logic.
 *
 * Real proposals have multiple tiered packages; the new engine (verifyProposalTags/
 * injectVerifiedValues) supports exactly one price. Resolved by using the `popular` package, or
 * the first package if none is marked — stated limitation, not hidden: a multi-tier proposal's
 * other packages' numbers won't appear anywhere in the new-engine version. */
export function mapProposalToDealFacts(content: ProposalType, currency: string): { facts: CodegenDealFacts; sourceOfTruth: ProposalSourceOfTruth } {
  const selectedPackage = content.packages.find((p) => p.popular) ?? content.packages[0]
  const dueDate = computeDueDate(content)

  const facts: CodegenDealFacts = {
    clientName: content.clientName,
    projectName: content.title,
    totalPrice: `${selectedPackage?.discountedPrice ?? 0} ${currency}`,
    dueDate: toDisplayDate(dueDate),
    deliverables: selectedPackage?.deliverables ?? [],
    paymentTerm: content.paymentSection?.schedule || '',
  }

  const sourceOfTruth: ProposalSourceOfTruth = {
    priceTotal: selectedPackage?.discountedPrice ?? 0,
    currency,
    dueDate: toIsoDate(dueDate),
  }

  return { facts, sourceOfTruth }
}
