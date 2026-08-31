import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '../DashboardShell'
import { BrandKitPageClient } from './BrandKitPageClient'

export default async function BrandKitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userRecord } = await supabase.from('users').select('account_id').eq('id', user.id).single()
  const { data: account } = await supabase.from('accounts').select('id, name').eq('id', userRecord?.account_id).single()

  return (
    <DashboardShell userEmail={user.email ?? ''}>
      <BrandKitPageClient accountId={account?.id ?? ''} accountName={account?.name || 'Marg Studio'} />
    </DashboardShell>
  )
}
