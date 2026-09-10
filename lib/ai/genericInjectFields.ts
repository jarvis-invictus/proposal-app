import type { HTMLElement } from 'node-html-parser'
import type { FlatFact } from './flattenProposalFacts'

/** Generalizes injectVerifiedValues.ts's mutation — overwrite whatever tag is present with the
 * real, canonical value, unconditionally, regardless of what the AI wrote — to any number of
 * paths instead of two hardcoded field names. A path with no matching tag is left alone (nothing
 * to overwrite); a tag that exists for a path never in `facts` (an excluded field) is never
 * looked up at all, so it's untouched by construction, not by a runtime filter. */
export function genericInjectFields(root: HTMLElement, facts: FlatFact[]): string {
  for (const fact of facts) {
    const el = root.querySelector(`[data-proposal-field="${fact.path}"]`)
    if (el) el.set_content(fact.displayValue)
  }
  return root.toString()
}
