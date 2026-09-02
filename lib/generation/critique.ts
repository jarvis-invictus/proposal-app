import { z } from 'zod'

/** Freeform-judgment findings only — objective data-integrity issues (e.g. bad pricing) are
 * fixed deterministically in lib/generation/pricing.ts instead, never surfaced as an "opinion."
 * These are always advisory: shown once to the person reviewing the draft, never blocking. */
export const CritiqueSchema = z.object({
  issues: z.array(z.object({
    field: z.string().describe('Which part of the proposal this concerns, e.g. "packages[0]" or "tone".'),
    severity: z.enum(['low', 'medium', 'high']),
    note: z.string().describe('A short, specific note explaining the concern — what a reviewer should double-check and why.'),
  })).describe('Concerns worth a second look before sending. Empty array if the draft looks solid.'),
})

export type CritiqueIssue = z.infer<typeof CritiqueSchema>['issues'][number]
