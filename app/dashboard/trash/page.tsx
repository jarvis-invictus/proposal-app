import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAccountShellInfo } from '@/lib/accountShellInfo'
import { TrashClient, type TrashProposal } from './TrashClient'

export default async function TrashPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Neither query depends on the other's result — both are RLS-scoped with no explicit
  // account filter needing input from the other side, so they run in parallel.
  const [shellInfo, { data: rows }] = await Promise.all([
    getAccountShellInfo(supabase),
    supabase
      .from('proposals')
      .select("id, slug, status, accepted_at, deleted_at, title:content->>title, client:content->>clientName")
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
      .limit(500),
  ])

  const proposals: TrashProposal[] = (rows ?? []).map((p) => ({
    id: p.id,
    slug: p.slug,
    title: p.title || 'Untitled proposal',
    client: p.client || 'Unknown client',
    status: p.status,
    acceptedAt: p.accepted_at,
    deletedAt: p.deleted_at as string,
  }))

  return (
    <TrashClient
      accountName={shellInfo.accountName}
      planLabel={shellInfo.planLabel}
      proposals={proposals}
    />
  )
}
