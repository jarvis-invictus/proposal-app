import { brandContextBlock, type BrandKitContext } from '@/lib/brand-extraction/prompt'
import type { FlatFact } from './flattenProposalFacts'

function factsBlock(facts: FlatFact[]): string {
  return facts.map((f) => `- ${f.path} = "${f.displayValue}"`).join('\n')
}

/** The generic counterpart to codegenPrompt.ts's TAGGING_CONTRACT_BLOCK — exported so
 * genericRevisePrompt.ts composes with this instead of duplicating it (same "shared, not
 * duplicated" principle already applied to TAGGING_CONTRACT_BLOCK itself and to
 * parseDurationDays). Static prose, no facts-dependent interpolation, so it can be shared as-is
 * across a fresh-generation prompt and a revise prompt. */
export const GENERIC_TAGGING_CONTRACT_BLOCK = `TAGGING CONTRACT — non-negotiable, in addition to your creative freedom above. For EVERY fact listed above under PROPOSAL FACTS, tag the real HTML element whose visible text actually shows that value with:
data-proposal-field="<path>"
— where <path> is copied EXACTLY as given above (character-for-character, including every bracket and dot — e.g. data-proposal-field="packages[0].discountedPrice"). Do not paraphrase, renumber, or invent your own path names. Each path must be tagged exactly once, on the element that actually displays it (not a wrapper that doesn't contain it, not omitted, not duplicated).

In addition, exactly one element in the whole page — the single element that functions as the accept/sign trigger (e.g. a button) — must carry:
data-proposal-action="accept"`

/** Generalizes codegenPrompt.ts's fixed DEAL FACTS + TAGGING_CONTRACT_BLOCK into one block driven
 * by a real proposal's actual flattened facts (flattenProposalFacts.ts), instead of a hardcoded
 * 2-field + 1-action contract. Deliberately merges "what to say" and "what to tag it as" into a
 * single list — each line is both — rather than a separate prose summary plus a separate raw path
 * list: two sections stating the same thing in different shapes is exactly the kind of drift this
 * mechanism exists to prevent (accurate prose next to a mistagged or paraphrased path).
 * data-proposal-action="accept" stays its own fixed, separate instruction below — it's a UI
 * affordance (which element triggers acceptance), not a data value, so it has no FlatFact entry
 * and never will. No test-only variant (nothing here needs to be deliberately broken). Now the
 * real generation prompt for app/api/proposals/[id]/beta-ai-page/route.ts (sub-piece 6,
 * docs/PROJECT_ROADMAP.md §6, mapProposalToDealFacts retired) — codegenPrompt.ts/
 * buildCodegenPrompt is untouched but no longer used by any real, customer-facing path. */
export function buildGenericCodegenPrompt(facts: FlatFact[], brandKit: BrandKitContext | null): string {
  const headingFont = brandKit?.fonts?.heading || 'Georgia'

  return `You are writing a complete, self-contained HTML proposal page for a freelancer/agency to send a client.

PROPOSAL FACTS — every one of these must appear as real, accurate content somewhere on the page. Never invent, omit, or alter any of these values:
${factsBlock(facts)}
${brandContextBlock(brandKit)}

CREATIVE FREEDOM: you have full control over layout, copy, styling, and animation. Use inline Tailwind utility classes for styling. Inline <style> and <script> tags are allowed for anything Tailwind classes can't express — no external stylesheet or script files, no build step.

${GENERIC_TAGGING_CONTRACT_BLOCK}

ADDITIONAL REQUIREMENTS — also non-negotiable, in addition to your creative freedom above:
1. Use the exact brand heading font as a QUOTED arbitrary-value Tailwind class — font-['${headingFont}'] literally, including the single quotes inside the brackets — on at least one heading element.

OUTPUT FORMAT: respond with ONLY the raw HTML document, starting with <!DOCTYPE html> and ending with </html>. No markdown code fences, no explanation before or after, no commentary.`
}
