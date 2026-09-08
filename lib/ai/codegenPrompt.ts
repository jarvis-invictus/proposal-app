import { brandContextBlock, type BrandKitContext } from '@/lib/brand-extraction/prompt'

export type CodegenDealFacts = {
  clientName: string
  projectName: string
  totalPrice: string
  dueDate: string
  deliverables: string[]
  paymentTerm: string
}

/** Builds the code-generation prompt (docs/CORE_ENGINE_V2_SPEC.md §2 stage 4, §4's tagging
 * contract enforced in this same prompt rather than as a separate pass). Reuses
 * `brandContextBlock()` as-is — it already takes a plain `BrandKitContext`-shaped object, no DB
 * call required, so a fixture object satisfies it directly. */
export function buildCodegenPrompt(facts: CodegenDealFacts, brandKit: BrandKitContext | null): string {
  const primaryHex = brandKit?.colors?.primary

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

TAGGING CONTRACT — non-negotiable, in addition to your creative freedom above. These three attributes must each appear exactly once, on the real HTML element that actually shows or triggers the corresponding thing (not on a wrapper that doesn't contain it, not omitted, not duplicated):
1. data-proposal-field="price_total" — on the element whose visible text shows the final total price (must contain the real total price figure given above).
2. data-proposal-field="due_date" — on the element whose visible text shows the project due date (must contain the real due date given above).
3. data-proposal-action="accept" — on the single element that functions as the accept/sign trigger (e.g. a button). Exactly one element in the whole page may carry this attribute.

ADDITIONAL REQUIREMENTS — also non-negotiable, in addition to your creative freedom above:
4. Use the exact brand primary color as an arbitrary-value Tailwind class — e.g. bg-[${primaryHex || '#000000'}] or text-[${primaryHex || '#000000'}] — on at least one element. This is a technical class-syntax requirement, distinct from the "never state raw colors as literal text" guidance above, which is about narrative prose only, not Tailwind class syntax.
5. Include one small inline <script> that runs on page load and adds the exact Tailwind class "opacity-100" to one element via that element's classList.add('opacity-100'), as a simple fade-in effect. Do NOT put "opacity-100" in that element's (or any element's) static class="..." attribute anywhere in the page — it must appear only inside this <script> block.

OUTPUT FORMAT: respond with ONLY the raw HTML document, starting with <!DOCTYPE html> and ending with </html>. No markdown code fences, no explanation before or after, no commentary.`
}
