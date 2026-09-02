/** Deterministic completeness gate for the chat intake — replaces trusting the model's own
 * self-reported "I'm ready" judgment with an actual check against structured facts. Shared
 * between the chat route (for its own record) and the client (which is what actually decides
 * whether to advance past the intake screen — see NewProposalClient.tsx). */

export type ProposalFacts = {
  clientName?: string
  packages?: Array<{ name?: string; discountedPrice?: number; deliverables?: string[] }>
  timeline?: Array<{ phase?: string }>
  paymentSchedule?: string
}

export type CompletenessResult = { complete: boolean; missing: string[] }

export function assessCompleteness(facts: ProposalFacts | null | undefined): CompletenessResult {
  const missing: string[] = []

  if (!facts?.clientName?.trim()) missing.push('the client or company name')

  const packages = facts?.packages ?? []
  if (packages.length === 0) {
    missing.push('at least one pricing package')
  } else {
    packages.forEach((pkg, i) => {
      const label = pkg.name ? `"${pkg.name}"` : `package ${i + 1}`
      if (!(typeof pkg.discountedPrice === 'number' && pkg.discountedPrice > 0)) missing.push(`a price for ${label}`)
      if (!pkg.deliverables || pkg.deliverables.length === 0) missing.push(`deliverables for ${label}`)
    })
  }

  if (!facts?.timeline || facts.timeline.length === 0) missing.push('a project timeline')
  if (!facts?.paymentSchedule?.trim()) missing.push('a payment schedule')

  return { complete: missing.length === 0, missing }
}
