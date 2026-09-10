import type { ProposalType } from '@/lib/schema/proposal'

/** Only this exact shape counts as a parseable phase duration — deliberately conservative,
 * checked against real local proposal data before being written this way: alongside clean cases
 * ("1 week", "2 weeks"), real timelines also contain "" (empty) and "Monthly", neither of which
 * this correctly rejects. A range like "2-3 weeks" or anything with extra words is also rejected
 * — never confidently reduced to "the first number found". */
const DURATION_PATTERN = /^(\d+)\s+(day|days|week|weeks|month|months)$/i
const DAYS_PER_UNIT: Record<string, number> = { day: 1, days: 1, week: 7, weeks: 7, month: 30, months: 30 }

/** Real, separate consumer: components/editor/TimelineBlock.tsx uses this directly for inline
 * duration-format validation — untouched by the beta-ai-page generic-pipeline cutover
 * (docs/PROJECT_ROADMAP.md §6, sub-piece 6). */
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
 * partially trusted. Exported (was private) so lib/ai/computeDueDateFact.ts can reuse this
 * directly rather than duplicating the date-math, per sub-piece 6's confirmed decision to
 * preserve this as an honest, verified computed fact rather than lose it or leave it to the AI's
 * own unverified prose. */
export function computeDueDate(content: ProposalType): Date {
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

/** Exported (was private) alongside computeDueDate, for the same reason. */
export function toDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}
