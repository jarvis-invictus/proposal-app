import { createClient } from '@/lib/supabase/server'
import type { SupportedCurrency } from '@/lib/formatCurrency'

/** Server-side only. Resolves the signed-in user's account currency, defaulting to USD when
 * there's no session or the lookup fails for any reason — an AI generation call should degrade
 * to the old (USD-assuming) behavior rather than fail the whole request over this. */
export async function getAccountCurrency(): Promise<SupportedCurrency> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return 'USD'

    const { data: userRecord } = await supabase.from('users').select('account_id').eq('id', user.id).single()
    if (!userRecord) return 'USD'

    const { data: account } = await supabase.from('accounts').select('currency').eq('id', userRecord.account_id).single()
    return (account?.currency as SupportedCurrency) || 'USD'
  } catch {
    return 'USD'
  }
}

/** Shared between every AI call that generates pricing, so the instruction can't drift between
 * call sites the way the section-id mismatch did before it was caught. */
export function currencyPromptInstruction(currency: SupportedCurrency): string {
  return `The user operates in the currency: ${currency}. All generated pricing, timeline costs, and add-on values MUST be contextually appropriate for this currency (e.g., INR values are typically much higher numerically than USD values). Do not include currency symbols in the data fields, just the raw numbers.`
}
