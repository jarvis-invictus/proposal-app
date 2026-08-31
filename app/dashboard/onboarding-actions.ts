'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/** Called once, when the wizard finishes (any step) or "Skip setup" is used. */
export async function finishOnboarding({ business, category }: { business: string; category: string | null }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: userRecord } = await supabase.from('users').select('account_id').eq('id', user.id).single()
  if (!userRecord) throw new Error('No account found')

  const { error } = await supabase
    .from('accounts')
    .update({ name: business || 'Marg Studio', category, onboarding_completed_at: new Date().toISOString() })
    .eq('id', userRecord.account_id)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard')
}
