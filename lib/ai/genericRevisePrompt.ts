import { brandContextBlock, type BrandKitContext } from '@/lib/brand-extraction/prompt'
import { GENERIC_TAGGING_CONTRACT_BLOCK } from './genericCodegenPrompt'
import type { FlatFact } from './flattenProposalFacts'

function factsBlock(facts: FlatFact[]): string {
  return facts.map((f) => `- ${f.path} = "${f.displayValue}"`).join('\n')
}

/** Generalizes revisePrompt.ts's fixed ORIGINAL DEAL FACTS + TAGGING_CONTRACT_BLOCK into the same
 * FlatFact[]-driven PROPOSAL FACTS block genericCodegenPrompt.ts uses, restated in FULL every
 * round — not reduced to only the facts a given feedback round actually touches. Confirmed
 * deliberately, not assumed: a content-only feedback round ("add an FAQ section") touches zero
 * addressable facts, so a changed-only reminder would carry no tag-preservation signal at all for
 * the single most common kind of revise request; sub-piece 2 also already showed a FULL reminder
 * doesn't reach 100% compliance even with every fact explicitly listed, so a partial one would
 * likely do worse, not better. Same "full prior HTML, not a diff" precedent as buildRevisePrompt
 * itself — priorHtml is inlined verbatim, unsummarized. */
export function buildGenericRevisePrompt(priorHtml: string, facts: FlatFact[], brandKit: BrandKitContext | null, feedback: string): string {
  return `You are revising an existing HTML proposal page based on real human feedback. Produce a COMPLETE, new version of the entire page — do not describe a diff or patch, write the full document.

PROPOSAL FACTS — still the source of truth, unchanged by this revision. Every one of these must still appear as real, accurate content somewhere on the page. Never invent, omit, or alter any of these values:
${factsBlock(facts)}
${brandContextBlock(brandKit)}

FEEDBACK TO ADDRESS:
"${feedback}"

PRIOR VERSION OF THE PAGE — preserve its structure, styling approach, and design intent except where the feedback above requires a real change:
${priorHtml}

${GENERIC_TAGGING_CONTRACT_BLOCK}

OUTPUT FORMAT: respond with ONLY the raw HTML document, starting with <!DOCTYPE html> and ending with </html>. No markdown code fences, no explanation before or after, no commentary.`
}
