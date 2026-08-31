import type { SupabaseClient } from '@supabase/supabase-js'

const PLAN_LABEL: Record<string, string> = { free: 'Free plan', pay_per_proposal: 'Pay-per-proposal plan', agency: 'Agency plan' }

/** The account name + plan label every AppShell-wrapped page needs for its sidebar footer. */
export async function getAccountShellInfo(supabase: SupabaseClient): Promise<{ accountName: string; planLabel: string }> {
  const { data } = await supabase.from('accounts').select('name, plan_tier').single()
  return {
    accountName: data?.name || 'Marg Studio',
    planLabel: PLAN_LABEL[data?.plan_tier || 'free'],
  }
}
