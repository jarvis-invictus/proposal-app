'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function updateAccountName(name: string) {
  if (!name || !name.trim()) throw new Error('Name is required')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: userRecord } = await supabase.from('users').select('account_id').eq('id', user.id).single()
  if (!userRecord) throw new Error('No account found')

  const { error } = await supabase.from('accounts').update({ name: name.trim() }).eq('id', userRecord.account_id)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/settings')
}

export async function updatePaymentDetails({ upi_id, payment_link, qr_url }: { upi_id: string; payment_link: string; qr_url: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: userRecord } = await supabase.from('users').select('account_id').eq('id', user.id).single()
  if (!userRecord) throw new Error('No account found')

  const { error } = await supabase
    .from('accounts')
    .update({ payment_upi_id: upi_id || null, payment_link: payment_link || null, payment_qr_url: qr_url || null })
    .eq('id', userRecord.account_id)
  if (error) throw new Error(error.message)

  revalidatePath('/dashboard/settings')
}

export async function markNotificationRead(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('notifications').update({ read: true }).eq('id', id)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
}

export async function markAllNotificationsRead() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')
  const { data: userRecord } = await supabase.from('users').select('account_id').eq('id', user.id).single()
  if (!userRecord) throw new Error('No account found')

  const { error } = await supabase.from('notifications').update({ read: true }).eq('account_id', userRecord.account_id).eq('read', false)
  if (error) throw new Error(error.message)
  revalidatePath('/dashboard/settings')
}
