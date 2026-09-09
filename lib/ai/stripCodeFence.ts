/** Strips a leading/trailing ```html fence if the model adds one despite the prompt's explicit
 * instruction not to — a known, common quirk worth handling defensively rather than ignoring.
 * Extracted here (was previously duplicated locally) since both the codegen/revise dev routes and
 * `lib/ai/autoRepair.ts` need the same handling on the same kind of raw model output. */
export function stripCodeFence(text: string): string {
  const trimmed = text.trim()
  const fenced = trimmed.match(/^```(?:html)?\s*\n([\s\S]*?)\n```$/)
  return fenced ? fenced[1].trim() : trimmed
}
