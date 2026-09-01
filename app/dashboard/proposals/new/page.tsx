import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/app/AppShell'
import { getAccountShellInfo } from '@/lib/accountShellInfo'
import { NewProposalClient } from './NewProposalClient'

export default async function NewProposalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const shellInfo = await getAccountShellInfo(supabase)

  return (
    <AppShell screen="proposals" title="New proposal" accountName={shellInfo.accountName} planLabel={shellInfo.planLabel}>
      <NewProposalClient />
    </AppShell>
  )
}
