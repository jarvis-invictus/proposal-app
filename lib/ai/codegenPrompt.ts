import { brandContextBlock, type BrandKitContext } from '@/lib/brand-extraction/prompt'

export type CodegenDealFacts = {
  clientName: string
  projectName: string
  totalPrice: string
  dueDate: string
  deliverables: string[]
  paymentTerm: string
}

/** The actual §4 tagging contract — the only part of the prompt genuinely load-bearing for
 * `verifyProposalTags`/`injectVerifiedValues` to keep working. Exported so `revisePrompt.ts`
 * composes with this instead of duplicating it; a revision doesn't need the rest of
 * `buildCodegenPrompt`'s one-off proof requirements (arbitrary-value classes, script-only
 * classes, the isolation checks) restated — the prior HTML already has them, and the model is
 * told to preserve structure except where feedback requires a change. */
export const TAGGING_CONTRACT_BLOCK = `TAGGING CONTRACT — non-negotiable, in addition to your creative freedom above. These three attributes must each appear exactly once, on the real HTML element that actually shows or triggers the corresponding thing (not on a wrapper that doesn't contain it, not omitted, not duplicated):
1. data-proposal-field="price_total" — on the element whose visible text shows the final total price (must contain the real total price figure given above).
2. data-proposal-field="due_date" — on the element whose visible text shows the project due date (must contain the real due date given above).
3. data-proposal-action="accept" — on the single element that functions as the accept/sign trigger (e.g. a button). Exactly one element in the whole page may carry this attribute.`

/** Dev-proof-only additional requirements from Phase 1 sub-pieces 4-5: an arbitrary-value
 * brand-hex class (proves a specific Tailwind arbitrary-value compilation path), a script-only
 * class (proves the compiler picks up classes added via `classList.add`, not just static
 * `class="..."` attributes), and the two origin-isolation checks (`#isolation-check`,
 * `#cookie-isolation-check`) that render visible "Checking..." divs and real
 * BLOCKED/NOT BLOCKED text. None of this has any customer-facing value — it exists purely to
 * exercise pipeline mechanics for the dev proof routes. Must never be included in a real,
 * customer-facing generation — hence kept out of `buildCodegenPrompt` entirely, not just
 * conditionally appended. */
function devProofRequirementsTestOnly(primaryHex: string | undefined): string {
  return `

DEV-PROOF REQUIREMENTS (test-only — never used in real generation) — also non-negotiable, in addition to everything above:
A. Use the exact brand primary color as an arbitrary-value Tailwind class — e.g. bg-[${primaryHex || '#000000'}] or text-[${primaryHex || '#000000'}] — on at least one element. This is a technical class-syntax requirement, distinct from the "never state raw colors as literal text" guidance above, which is about narrative prose only, not Tailwind class syntax.
B. Include one small inline <script> that runs on page load and adds the exact Tailwind class "opacity-100" to one element via that element's classList.add('opacity-100'), as a simple fade-in effect. Do NOT put "opacity-100" in that element's (or any element's) static class="..." attribute anywhere in the page — it must appear only inside this <script> block.
C. Include a visible <div id="isolation-check">Checking...</div> somewhere near the bottom of the page. In the same inline <script>, wrap an attempt to read window.parent.document in a try/catch, and set that div's textContent to "BLOCKED — " + error.name + ": " + error.message if it throws, or "NOT BLOCKED — isolation failed" if it does not throw. Do this exactly as described — this is a real security check, not a cosmetic detail.
D. Include a visible <div id="cookie-isolation-check">Checking...</div> near the bottom of the page. In the same inline <script>, check document.cookie for the substring "subpiece5_isolation_marker". If it is NOT found, set that div's textContent to "BLOCKED — cookie not visible from this origin". If it IS found, set it to "NOT BLOCKED — isolation failed, cookie: " + document.cookie. This proves origin isolation via subdomain, a separate real security check from #C's iframe check — do not skip or merge these.`
}

/** Shared core — the actual prompt content for both the real and test-only variants below. Takes
 * an optional test-only requirements block so the two variants can't drift out of sync on
 * everything except that one deliberate difference. */
function buildCodegenPromptCore(facts: CodegenDealFacts, brandKit: BrandKitContext | null, extraRequirementsTestOnly: string | null): string {
  const primaryHex = brandKit?.colors?.primary
  const headingFont = brandKit?.fonts?.heading || 'Georgia'

  return `You are writing a complete, self-contained HTML proposal page for a freelancer/agency to send a client.

DEAL FACTS — use only these, never invent figures or terms not listed here:
Client: ${facts.clientName}
Project: ${facts.projectName}
Total price: ${facts.totalPrice}
Due date: ${facts.dueDate}
Deliverables: ${facts.deliverables.join(', ')}
Payment term: ${facts.paymentTerm}
${brandContextBlock(brandKit)}

CREATIVE FREEDOM: you have full control over layout, copy, styling, and animation. Use inline Tailwind utility classes for styling. Inline <style> and <script> tags are allowed for anything Tailwind classes can't express — no external stylesheet or script files, no build step.

${TAGGING_CONTRACT_BLOCK}

ADDITIONAL REQUIREMENTS — also non-negotiable, in addition to your creative freedom above:
1. Use the exact brand heading font as a QUOTED arbitrary-value Tailwind class — font-['${headingFont}'] literally, including the single quotes inside the brackets — on at least one heading element. This specific quoted-arbitrary-value form (not the unquoted font-[${headingFont}] form) is required — it exercises a real class of bug found and fixed in this pipeline (a quote-containing arbitrary-value class silently failing to compile), and must never silently regress.${extraRequirementsTestOnly ? devProofRequirementsTestOnly(primaryHex) : ''}

OUTPUT FORMAT: respond with ONLY the raw HTML document, starting with <!DOCTYPE html> and ending with </html>. No markdown code fences, no explanation before or after, no commentary.`
}

/** Builds the REAL code-generation prompt (docs/CORE_ENGINE_V2_SPEC.md §2 stage 4, §4's tagging
 * contract enforced in this same prompt rather than as a separate pass) — the only variant used
 * by any real, customer-facing generation path (`app/api/proposals/[id]/beta-ai-page/route.ts`).
 * Contains no dev-proof scaffolding: no isolation-check divs, no script-only class, no synthetic
 * arbitrary-hex-class requirement. Reuses `brandContextBlock()` as-is — it already takes a plain
 * `BrandKitContext`-shaped object, no DB call required, so a fixture object satisfies it directly
 * for the dev routes below. */
export function buildCodegenPrompt(facts: CodegenDealFacts, brandKit: BrandKitContext | null): string {
  return buildCodegenPromptCore(facts, brandKit, null)
}

/** TEST-ONLY — identical to `buildCodegenPrompt` plus Phase 1 sub-piece 4-5's dev-proof
 * requirements (see `devProofRequirementsTestOnly`). Used only by the dev-only proof routes
 * (`app/dev/*`, `app/api/dev/*`); must never be called from any real, customer-facing path. */
export function buildCodegenPromptTestOnly(facts: CodegenDealFacts, brandKit: BrandKitContext | null): string {
  return buildCodegenPromptCore(facts, brandKit, '_test_only_')
}
