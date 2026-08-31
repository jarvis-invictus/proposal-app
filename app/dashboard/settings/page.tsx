import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '../DashboardShell'
import { SettingsClient } from './SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase.from('users').select('account_id').eq('id', user.id).single()

  const { data: account } = await supabase
    .from('accounts')
    .select('id, name, payment_upi_id, payment_link, payment_qr_url')
    .eq('id', userRecord?.account_id)
    .single()

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, message, read, created_at')
    .order('created_at', { ascending: false })
    .limit(30)

  const { data: apiKeys } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, created_at, revoked_at')
    .order('created_at', { ascending: false })

  return (
    <DashboardShell userEmail={user.email ?? ''}>
      <SettingsClient
        account={account}
        userEmail={user.email ?? ''}
        notifications={notifications ?? []}
        apiKeys={apiKeys ?? []}
      />
    </DashboardShell>
  )
}
