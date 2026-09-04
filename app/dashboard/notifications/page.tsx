import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAccountShellInfo } from '@/lib/accountShellInfo'
import { NotificationsClient, type NotificationRow } from './NotificationsClient'

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: userRecord } = await supabase.from('users').select('role').eq('id', user.id).single()
  const shellInfo = await getAccountShellInfo(supabase)

  const { data: rows } = await supabase
    .from('notifications')
    .select('id, message, read, created_at, proposal_id, proposals(id, slug, status)')
    .order('created_at', { ascending: false })
    .limit(50)

  const notifications: NotificationRow[] = (rows ?? []).map((n: any) => ({
    id: n.id,
    message: n.message,
    read: n.read,
    createdAt: n.created_at,
    proposalId: n.proposal_id,
    proposalSlug: n.proposals?.slug ?? null,
    proposalStatus: n.proposals?.status ?? null,
  }))

  return (
    <NotificationsClient
      accountName={shellInfo.accountName}
      planLabel={shellInfo.planLabel}
      notifications={notifications}
      myRole={userRecord?.role || 'owner'}
    />
  )
}
