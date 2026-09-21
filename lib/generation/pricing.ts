/** Objective, deterministic data-integrity fixes applied to a generated draft — not judgment
 * calls, so they're corrected silently in code rather than surfaced as an AI "opinion" via the
 * critique pass. */
export function correctPricing<T extends { packages?: Array<{ originalPrice?: number | null; discountedPrice?: number }> }>(content: T): T {
  if (!Array.isArray(content.packages)) return content
  return {
    ...content,
    packages: content.packages.map((pkg) => {
      // An "original" price that isn't actually higher than the selling price isn't a real
      // discount — drop it rather than show a misleading strikethrough, and never invent a
      // fabricated higher figure. Dropped to null, not 0 — 0 is a genuine price (a free package),
      // not a "no discount" sentinel.
      if (typeof pkg.originalPrice === 'number' && typeof pkg.discountedPrice === 'number' && pkg.originalPrice <= pkg.discountedPrice) {
        return { ...pkg, originalPrice: null }
      }
      return pkg
    }),
  }
}

// `\d+` first (handles a plain ungrouped run of digits like "32000"), then only real
// thousands-separator commas — exactly 3 digits after each one. A greedy `[\d,]+` instead would
// sweep up trailing sentence punctuation, e.g. the comma in "$32000, payable...".
const CURRENCY_PREFIX = /[$₹€£]\s?(\d+(?:,\d{3})*(?:\.\d+)?)/g

/** Deterministic, mechanical check — `terms`/`paymentSection.terms` are free prose that can quote
 * a dollar figure once and never get revisited when packages/add-ons are edited later (confirmed:
 * nothing else in the codebase reconciles hand-typed numbers in these fields against pricing).
 * Advisory only, never auto-corrected like correctPricing above — free text can legitimately
 * mention other real figures (a monthly ad spend, a late fee) that aren't a package price at all. */
export function findStalePriceMentions(content: {
  terms?: string[]
  paymentSection?: { terms?: string }
  packages?: Array<{ discountedPrice?: number; originalPrice?: number | null }>
  addOns?: Array<{ price?: number }>
}): { field: string; note: string }[] {
  const knownAmounts = new Set<number>()
  for (const pkg of content.packages ?? []) {
    if (typeof pkg.discountedPrice === 'number') knownAmounts.add(pkg.discountedPrice)
    if (typeof pkg.originalPrice === 'number' && pkg.originalPrice > 0) knownAmounts.add(pkg.originalPrice)
  }
  for (const addOn of content.addOns ?? []) {
    if (typeof addOn.price === 'number') knownAmounts.add(addOn.price)
  }
  if (knownAmounts.size === 0) return []

  const findings: { field: string; note: string }[] = []
  const scan = (text: string, field: string) => {
    for (const match of text.matchAll(CURRENCY_PREFIX)) {
      const amount = Number(match[1].replace(/,/g, ''))
      if (!Number.isFinite(amount) || amount === 0 || knownAmounts.has(amount)) continue
      findings.push({ field, note: `Mentions ${match[0]}, which doesn't match any current package or add-on price — likely stale after a pricing edit.` })
    }
  }
  ;(content.terms ?? []).forEach((term, i) => scan(term, `terms[${i}]`))
  if (content.paymentSection?.terms) scan(content.paymentSection.terms, 'paymentSection.terms')
  return findings
}
