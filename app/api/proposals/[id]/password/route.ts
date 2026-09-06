import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { hashProposalPassword } from '@/lib/proposalAccess'
import { logError, logAction } from '@/lib/logging'

// Authenticated, owner/approver-only — set, change, or clear a proposal's optional password
// protection. Separate from publish/route.ts on purpose: privacy can change independent of the
// DRAFT->PUBLISHED transition (before publishing, or any time after, without re-publishing).
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: userRecord } = await supabase.from('users').select('account_id, role').eq('id', user.id).single()
  if (!userRecord) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (userRecord.role !== 'owner' && userRecord.role !== 'approver') {
    return NextResponse.json({ error: 'Only an owner or approver can change link privacy' }, { status: 403 })
  }

  const { password } = await request.json() as { password: string | null }
  if (password !== null) {
    if (typeof password !== 'string' || password.trim().length < 4 || password.length > 200) {
      return NextResponse.json({ error: 'Password must be 4–200 characters' }, { status: 400 })
    }
    if (!process.env.PROPOSAL_LINK_SECRET) {
      return NextResponse.json({ error: 'Password protection is not configured on this deployment yet.' }, { status: 500 })
    }
  }

  const { data: proposal, error: fetchError } = await supabase
    .from('proposals')
    .select('id, account_id, status')
    .eq('id', id)
    .single()

  if (fetchError || !proposal || proposal.account_id !== userRecord.account_id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  if (proposal.status !== 'DRAFT' && proposal.status !== 'PUBLISHED') {
    return NextResponse.json({ error: `Cannot change link privacy for a proposal with status ${proposal.status}` }, { status: 400 })
  }

  const password_hash = password ? hashProposalPassword(password.trim()) : null
  const { error: updateError } = await supabase.from('proposals').update({ password_hash }).eq('id', id)

  if (updateError) {
    logError('Failed to update proposal password protection', updateError, { proposalId: id })
    return NextResponse.json({ error: 'Failed to save — please try again.' }, { status: 500 })
  }

  logAction(password_hash ? 'set_proposal_password' : 'clear_proposal_password', user.id, { proposalId: id })
  return NextResponse.json({ hasPassword: !!password_hash })
}
