import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const id = resolvedParams.id
    
    let supabase: any = await createClient()

    // 1. Check Auth
    let user = null
    const authHeader = request.headers.get('Authorization')
    
    if (authHeader) {
      const authClient = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authHeader } }
      })
      const { data } = await authClient.auth.getUser()
      user = data.user
      supabase = authClient as any
    } else {
      const { data } = await supabase.auth.getUser()
      user = data.user
    }

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()

    // 2. Lock signed proposals. There's no separate "ACCEPTED" status in
    // proposal_status_enum (DRAFT/PUBLISHED/PENDING_APPROVAL/ARCHIVED) — acceptance is
    // recorded via accepted_at/signature on a PUBLISHED proposal, so that's the real signal
    // to guard on. Checked here (not just in the UI) so a raw PATCH can't bypass it.
    const { data: existing, error: fetchError } = await supabase
      .from('proposals')
      .select('accepted_at, signature')
      .eq('id', id)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
    }
    if (existing.accepted_at || existing.signature) {
      return NextResponse.json(
        { error: 'This proposal has been signed and is now locked as a legally binding document.' },
        { status: 403 }
      )
    }

    // 3. Update Proposal
    // RLS will ensure that the user can only update their own proposals.
    // Publishing (DRAFT -> PUBLISHED/PENDING_APPROVAL) is handled by the dedicated
    // /api/proposals/[id]/publish route, not here, since that transition needs the
    // service-role client to insert an approval notification.
    const updateData: any = {
      updated_at: new Date().toISOString()
    }
    if (body.content) updateData.content = body.content

    const { data: proposal, error } = await supabase
      .from('proposals')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating proposal:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(proposal)
  } catch (err) {
    console.error('Unexpected error updating proposal:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
