import type { HTMLElement } from 'node-html-parser'
import type { FlatFact } from './flattenProposalFacts'

export type FieldReport = {
  path: string
  present: boolean
  rawText: string | null
  matches: boolean
}

/** Generalizes verifyProposalTags.ts's per-field report shape (present/rawText/matches) to any
 * number of paths instead of two hardcoded field names. Reports only on paths flattenProposalFacts
 * actually produced — a path never in `facts` (e.g. an excluded field like packages[i].popular)
 * simply never appears here, whether or not something in the HTML happens to carry that attribute. */
export function genericVerifyFields(root: HTMLElement, facts: FlatFact[]): FieldReport[] {
  return facts.map((fact) => {
    const el = root.querySelector(`[data-proposal-field="${fact.path}"]`)
    return {
      path: fact.path,
      present: !!el,
      rawText: el ? el.textContent : null,
      matches: !!el && el.textContent.trim() === fact.displayValue,
    }
  })
}
