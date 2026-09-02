/** Objective, deterministic data-integrity fixes applied to a generated draft — not judgment
 * calls, so they're corrected silently in code rather than surfaced as an AI "opinion" via the
 * critique pass. */
export function correctPricing<T extends { packages?: Array<{ originalPrice?: number; discountedPrice?: number }> }>(content: T): T {
  if (!Array.isArray(content.packages)) return content
  return {
    ...content,
    packages: content.packages.map((pkg) => {
      // An "original" price that isn't actually higher than the selling price isn't a real
      // discount — drop it rather than show a misleading strikethrough, and never invent a
      // fabricated higher figure.
      if (typeof pkg.originalPrice === 'number' && typeof pkg.discountedPrice === 'number' && pkg.originalPrice <= pkg.discountedPrice) {
        return { ...pkg, originalPrice: 0 }
      }
      return pkg
    }),
  }
}
