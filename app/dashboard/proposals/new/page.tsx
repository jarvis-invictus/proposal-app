import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardShell } from '../../DashboardShell'
import { NewProposalClient } from './NewProposalClient'

export default async function NewProposalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <DashboardShell userEmail={user.email ?? ''}>
      <NewProposalClient />
    </DashboardShell>
  )
}
