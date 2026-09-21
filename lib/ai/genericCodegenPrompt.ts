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

/** Concrete, enforced visual rules — not "make it look nice" abstraction. Values are pulled
 * directly from the old (pre-V2, still-live) engine's own proven component patterns
 * (components/blocks/blocks.tsx, app/p/[slug]/PublicProposalView.tsx, components/layout/
 * primitives.tsx) and its real design tokens (app/globals.css: --radius-card:16px,
 * --shadow-hover:0 8px 24px rgba(23,23,23,0.08), .hover-lift's 200ms transition + translateY(-2px),
 * the fade-up keyframe's translateY(12px)→0 with --ease-out-soft's cubic-bezier(0.16,1,0.3,1)) —
 * so a V2-generated page reads as the same product's design language, not a different one that
 * happens to share a logo. Confirmed necessary by a real generation (2026-09-20, "7 Sketch
 * Designers" brand kit): the previous single, vague requirement below ("at least one heading
 * element") produced a real Playfair Display font that was loaded and available but never applied
 * to any heading, flat cards with no hover/elevation, plain bulleted lists, and zero entrance
 * motion — compiling clean is not the same as looking designed.
 *
 * FONT DISCIPLINE rule below was itself rewritten after a second real bug, found live in
 * production the same night: the original wording told the AI to construct
 * font-['Playfair Display'] directly as an HTML class. A multi-word font name inside a raw class
 * attribute breaks — HTML splits class="..." on whitespace, so that became two invalid tokens
 * (font-['Playfair and Display'], confirmed via document.querySelector('h1').classList on the
 * live page) that matched no compiled CSS rule at all. Every heading silently rendered in the
 * body font. The fix isn't a smarter instruction for the AI to hand-construct the class
 * correctly — it's not asking it to construct the class at all. lib/ai/compileTailwind.ts's
 * buildFinalArtifact() now always injects real .heading-font/.body-font classes (backed by
 * --font-heading/--font-body CSS custom properties, set from the resolved brand kit) into every
 * generated page's own <style> block — the AI just references them by name. */
function buildDesignSystemBlock(): string {
  return `DESIGN SYSTEM — non-negotiable, concrete rules, not suggestions:

1. FONT DISCIPLINE. Two real CSS classes are already defined for you in this page's own <style> block: heading-font (the brand's heading font) and body-font (the brand's body font). Add class="heading-font" to every h1, h2, and h3 element on the page — not just one. Add class="body-font" to the <body> tag (a heading's own heading-font class still correctly overrides it there). Do NOT construct your own font-family styling for these — no font-['...'] Tailwind arbitrary-value class, no inline style="font-family:...". A multi-word font name inside an HTML class attribute silently breaks (HTML splits class="..." on whitespace), which is exactly why these two classes exist for you already. Headings must never fall back to the body font; body text must never pick up the heading font.
2. CARDS (pricing/package tiers, any boxed content block). Every card gets rounded-[16px], a subtle resting shadow (shadow-[0_2px_8px_rgba(0,0,0,0.06)]), and a hover state via a pure CSS transition — no JavaScript: transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)].
3. FEATURE/DELIVERABLE LISTS. Never a plain bulleted <ul><li> list. Every item gets this exact checkmark SVG before it (adjust only the color, via currentColor on a wrapping element colored with the brand's primary color given above), in a flex row with an ~8px gap to the text: <svg viewBox="0 0 20 20" fill="none" style="width:16px;height:16px;flex-shrink:0"><path d="M16.7 5.3a1 1 0 010 1.4l-7.4 7.4a1 1 0 01-1.4 0L3.3 9.5a1 1 0 111.4-1.4l3.6 3.6 6.7-6.7a1 1 0 011.4 0z" fill="currentColor"/></svg>
4. ENTRANCE ANIMATION. Restrained and professional — this is a B2B sales document, not a playful landing page. Include this exact CSS in your <style> block (the class name may be renamed, but keep the timing/easing/transform values unchanged): @keyframes marg-fade-up { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } } .marg-fade-up { animation: marg-fade-up 350ms cubic-bezier(0.16, 1, 0.3, 1) both; } — apply it once to each major section on page load. No bounce, no overshoot, no spring/elastic easing, no delay longer than ~80ms between staggered sections if you stagger them at all.
5. SPACING RHYTHM. Consistent, not ad-hoc per section: section padding 48–56px top/bottom; card padding 24px; heading margin-bottom scaled by level (~32px below an h2 section heading, ~8–16px below an h3 card heading); an 8–12px gap between list items.`
}

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
/** Same Georgia fallback the prompt's brand context has always implied — now also the single
 * source of truth for the CSS custom properties buildFinalArtifact() injects (lib/ai/
 * compileTailwind.ts), so the prompt's implicit "what font is this" and the actual --font-heading/
 * --font-body values a generated page resolves to can't drift apart. Exported so the beta-ai-page
 * route (and verifyHeadingFontUsage's caller) use the exact same resolution, not a second copy. */
export function resolveDisplayFonts(brandKit: BrandKitContext | null): { heading: string; body: string } {
  return {
    heading: brandKit?.fonts?.heading || 'Georgia',
    body: brandKit?.fonts?.body || 'Georgia',
  }
}

export function buildGenericCodegenPrompt(facts: FlatFact[], brandKit: BrandKitContext | null): string {
  return `You are writing a complete, self-contained HTML proposal page for a freelancer/agency to send a client.

PROPOSAL FACTS — every one of these must appear as real, accurate content somewhere on the page. Never invent, omit, or alter any of these values:
${factsBlock(facts)}
${brandContextBlock(brandKit)}

CREATIVE FREEDOM: you have full control over layout, copy, and animation within the design system below. Use inline Tailwind utility classes for styling. Inline <style> and <script> tags are allowed for anything Tailwind classes can't express — no external stylesheet or script files, no build step.

${GENERIC_TAGGING_CONTRACT_BLOCK}

${buildDesignSystemBlock()}

OUTPUT FORMAT: respond with ONLY the raw HTML document, starting with <!DOCTYPE html> and ending with </html>. No markdown code fences, no explanation before or after, no commentary.`
}
