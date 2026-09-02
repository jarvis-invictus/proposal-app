/** Shared `prefers-reduced-motion` check — several components duplicated this inline
 * (GeneratingScreen.tsx among them); centralized here so new motion code doesn't re-derive it. */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
