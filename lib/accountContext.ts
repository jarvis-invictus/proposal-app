import { createClient } from '@/lib/supabase/server'
import type { SupportedCurrency } from '@/lib/formatCurrency'

export type AccountContext = { accountId: string; currency: SupportedCurrency }

/** Server-side only. Resolves the signed-in user's account id + currency in one lookup,
 * returning null when there's no session or the lookup fails for any reason — callers should
 * degrade to anonymous/IP-based behavior rather than fail the request over this. */
export async function getAccountContext(): Promise<AccountContext | null> {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: userRecord } = await supabase
      .from('users')
      .select('account_id, accounts(currency)')
      .eq('id', user.id)
      .single()
    if (!userRecord) return null

    const account = Array.isArray(userRecord.accounts) ? userRecord.accounts[0] : userRecord.accounts
    return { accountId: userRecord.account_id, currency: (account?.currency as SupportedCurrency) || 'USD' }
  } catch {
    return null
  }
}
