'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

/** Saves step 1's answers as soon as that step is left, WITHOUT marking onboarding finished.
 * Without this nothing persists until the very last step, so any reload mid-wizard loses the
 * business name and category and restarts from the welcome screen. */
export async function saveOnboardingBusiness({ business, category }: { business: string; category: string | null }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: userRecord } = await supabase.from('users').select('account_id').eq('id', user.id).single()
  if (!userRecord) throw new Error('No account found')

  const patch: { name?: string; category?: string | null } = {}
  if (business.trim()) patch.name = business.trim()
  if (category) patch.category = category
  if (!Object.keys(patch).length) return

  const { error } = await supabase.from('accounts').update(patch).eq('id', userRecord.account_id)
  if (error) throw new Error(error.message)
}

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
