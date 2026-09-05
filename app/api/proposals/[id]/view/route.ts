import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { env } from '@/env'
import { logError } from '@/lib/logging'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params
  
  // Use service_role key to bypass RLS since unauthenticated users cannot update the proposal record.
  // Alternatively, we update the JSONB `content` property to inject a lastViewedAt timestamp.
  const adminSupabase = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  // 1. Get the current proposal to check its content. Scoped to PUBLISHED so a guessed/leaked
  // draft slug can't be used to fire a fake "a client viewed your proposal" notification on
  // something that was never actually shared.
  const { data: proposal, error: fetchError } = await adminSupabase
    .from('proposals')
    .select('id, account_id, title:content->>title')
    .eq('slug', resolvedParams.id) // The URL param acts as the slug here
    .eq('status', 'PUBLISHED')
    .single<{ id: string; account_id: string; title: string | null }>()

  if (fetchError || !proposal) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // SERVER-SIDE CHECK: verify the requester's session against the proposal's account_id
  let user = null
  const authHeader = request.headers.get('Authorization')
  
  if (authHeader) {
    const authClient = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    })
    const { data } = await authClient.auth.getUser()
    user = data.user
  } else {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    user = data.user
  }
  
  if (user) {
    const { data: userRecord } = await adminSupabase
      .from('users')
      .select('account_id')
      .eq('id', user.id)
      .single()
      
    if (userRecord && userRecord.account_id === proposal.account_id) {
      // It's the owner, no-op!
      return NextResponse.json({ success: true, message: 'View ignored for owner' })
    }
  }

  // 2. Stamp the view timestamp — last_viewed_at is its own column, no need to touch the
  // (potentially large) JSONB content just to record this.
  const { error: updateError } = await adminSupabase
    .from('proposals')
    .update({ last_viewed_at: new Date().toISOString() })
    .eq('id', proposal.id)

  if (updateError) {
    logError('Failed to update view tracking', updateError, { proposalId: proposal.id })
    return NextResponse.json({ error: 'Failed to update' }, { status: 500 })
  }

  // 3. Insert Notification for the owner
  const message = `A client viewed your proposal: ${proposal.title || 'Untitled Proposal'}`
  const { error: notifError } = await adminSupabase
    .from('notifications')
    .insert({
      account_id: proposal.account_id,
      proposal_id: proposal.id,
      message
    })

  if (notifError) {
    logError('Failed to insert notification', notifError, { proposalId: proposal.id })
    // We don't fail the request if the notification insert fails
  }

  return NextResponse.json({ success: true })
}
