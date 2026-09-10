import type { ProposalType } from '@/lib/schema/proposal'
import { computeDueDate, toDisplayDate } from './mapProposalToDealFacts'
import type { FlatFact } from './flattenProposalFacts'

export const COMPUTED_DUE_DATE_PATH = 'projectDueDate'

/** NOT a real ProposalType schema leaf — a derived value, computed the same way the old
 * mapProposalToDealFacts did (sum timeline durations from dateIssued, fall back to
 * validUntil+30d). Preserved as an honest, explicitly-labeled, verified fact rather than lost or
 * left to the AI's own unverified prose — confirmed decision, docs/PROJECT_ROADMAP.md §6,
 * sub-piece 6. Always `provided: true`: computeDueDate has a guaranteed fallback chain and never
 * returns null. Appended to flattenProposalFacts's real output by the caller (beta-ai-page's
 * route) — not part of flattenProposalFacts itself, which stays a pure walk of real schema
 * leaves only, unchanged from sub-piece 1. */
export function computeDueDateFact(content: ProposalType): FlatFact {
  const displayValue = toDisplayDate(computeDueDate(content))
  return { path: COMPUTED_DUE_DATE_PATH, provided: true, value: displayValue, displayValue }
}
