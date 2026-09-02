import type { SupportedCurrency } from '@/lib/formatCurrency'

/** Shared between every AI call that generates pricing, so the instruction can't drift between
 * call sites the way the section-id mismatch did before it was caught. */
export function currencyPromptInstruction(currency: SupportedCurrency): string {
  return `The user operates in the currency: ${currency}. All generated pricing, timeline costs, and add-on values MUST be contextually appropriate for this currency (e.g., INR values are typically much higher numerically than USD values). Do not include currency symbols in the data fields, just the raw numbers.`
}
