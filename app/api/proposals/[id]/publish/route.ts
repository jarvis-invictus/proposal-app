import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { logError } from '@/lib/logging'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRecord } = await supabase.from('users').select('account_id, role').eq('id', user.id).single()
  if (!userRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // RLS ("Users can manage own proposals") already scopes this select/update to the caller's
  // own account, but checking account_id explicitly keeps the 404-vs-403 behavior obvious here
  // rather than depending on a policy defined elsewhere.
  const { data: proposal, error: fetchError } = await supabase
    .from('proposals')
    .select('id, account_id, status, slug, content')
    .eq('id', id)
    .single()

  if (fetchError || !proposal || proposal.account_id !== userRecord.account_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (proposal.status !== 'DRAFT') {
    return NextResponse.json({ error: `Cannot publish a proposal with status ${proposal.status}` }, { status: 400 })
  }

  const isDrafter = userRecord.role === 'drafter'
  const nextStatus = isDrafter ? 'PENDING_APPROVAL' : 'PUBLISHED'

  const updateData: Record<string, any> = { status: nextStatus, updated_at: new Date().toISOString() }
  if (isDrafter) {
    updateData.submitted_by = user.id
    updateData.submitted_at = new Date().toISOString()
  }

  const { data: updated, error: updateError } = await supabase
    .from('proposals')
    .update(updateData)
    .eq('id', id)
    .select('status, slug')
    .single()

  if (updateError) {
    logError('Failed to update proposal status', updateError, { proposalId: id, nextStatus })
    return NextResponse.json({ error: 'Failed to update the proposal — please try again.' }, { status: 500 })
  }

  if (isDrafter) {
    // notifications has no INSERT policy for regular authenticated users (only SELECT/UPDATE),
    // same reason /api/proposals/[id]/view uses the service-role client for its own insert.
    const adminSupabase = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const title = (proposal.content as any)?.title || 'A proposal'
    const { error: notifError } = await adminSupabase.from('notifications').insert({
      account_id: userRecord.account_id,
      proposal_id: id,
      message: `${title} was submitted for approval.`,
    })
    if (notifError) {
      logError('Failed to insert approval notification', notifError, { proposalId: id })
      // Don't fail the request over this — the status transition itself already succeeded.
    }
  }

  return NextResponse.json({ status: updated.status, slug: updated.slug })
}
