import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app/AppShell'
import { getAccountShellInfo } from '@/lib/accountShellInfo'
import { BrandKitPageClient } from './BrandKitPageClient'

export default async function BrandKitPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: userRecord } = await supabase.from('users').select('account_id').eq('id', user.id).single()
  const { data: account } = await supabase.from('accounts').select('id, name').eq('id', userRecord?.account_id).single()
  const shellInfo = await getAccountShellInfo(supabase)

  return (
    <AppShell screen="brand" title="Set up your brand kit" accountName={shellInfo.accountName} planLabel={shellInfo.planLabel}>
      <BrandKitPageClient accountId={account?.id ?? ''} accountName={account?.name || 'Marg Studio'} />
    </AppShell>
  )
}
