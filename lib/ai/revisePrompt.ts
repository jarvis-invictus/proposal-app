import { brandContextBlock, type BrandKitContext } from '@/lib/brand-extraction/prompt'
import { TAGGING_CONTRACT_BLOCK, type CodegenDealFacts } from '@/lib/ai/codegenPrompt'

/** Builds the revision prompt (docs/CORE_ENGINE_V2_SPEC.md §2 stage 10) — full-page
 * regeneration from feedback, not a patch, same reasoning that made patching raw HTML infeasible
 * in the first place. Takes the prior *markup* (post-injection, pre-compile — not the stored
 * post-compile artifact, which has ~10KB of mechanically-derived CSS the model doesn't need to
 * reason about) as full context, per §9's now-resolved open question: full HTML, not a summary,
 * for a bounded 2-3 round loop where token cost stays predictable and a summary risks losing
 * exactly the structural/stylistic detail a real revision needs to preserve. Restates only the
 * core tagging contract, not sub-piece 3-5's one-off proof requirements — the prior HTML already
 * has those, and the model is told to preserve structure except where feedback requires change. */
export function buildRevisePrompt(priorHtml: string, facts: CodegenDealFacts, brandKit: BrandKitContext | null, feedback: string): string {
  return `You are revising an existing HTML proposal page based on real human feedback. Produce a COMPLETE, new version of the entire page — do not describe a diff or patch, write the full document.

ORIGINAL DEAL FACTS — still the source of truth, unchanged by this revision:
Client: ${facts.clientName}
Project: ${facts.projectName}
Total price: ${facts.totalPrice}
Due date: ${facts.dueDate}
Deliverables: ${facts.deliverables.join(', ')}
Payment term: ${facts.paymentTerm}
${brandContextBlock(brandKit)}

FEEDBACK TO ADDRESS:
"${feedback}"

PRIOR VERSION OF THE PAGE — preserve its structure, styling approach, and design intent except where the feedback above requires a real change:
${priorHtml}

${TAGGING_CONTRACT_BLOCK}

OUTPUT FORMAT: respond with ONLY the raw HTML document, starting with <!DOCTYPE html> and ending with </html>. No markdown code fences, no explanation before or after, no commentary.`
}
