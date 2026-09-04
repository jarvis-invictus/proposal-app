import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { ESIGN_CONSENT_STATEMENT, type Signature } from '@/lib/signature'
import { sendEmail } from '@/lib/email'
import { ProposalSignedEmail } from '@/emails/ProposalSignedEmail'
import { logError } from '@/lib/logging'

// x-forwarded-for can carry a client-supplied chain ("client, proxy1, proxy2") — the first
// entry is the original client. NextRequest has no reliable .ip in the App Router, so headers
// are the only portable source here.
function extractIp(request: NextRequest): string {
  const forwardedFor = request.headers.get('x-forwarded-for')
  if (forwardedFor) return forwardedFor.split(',')[0].trim()
  return request.headers.get('x-real-ip') || 'unknown'
}

// Public route — the person accepting a proposal has no account/session, so this uses the
// service-role client the same way the public proposal page itself does.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params
  const { name } = await request.json()

  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const adminSupabase = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const { data: existing, error: fetchError } = await adminSupabase
    .from('proposals')
    .select('id, account_id, status, accepted_at, content')
    .eq('slug', slug)
    .single()

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Proposal not found' }, { status: 404 })
  }
  if (existing.status !== 'PUBLISHED') {
    return NextResponse.json({ error: 'This proposal is not open for acceptance' }, { status: 400 })
  }
  if (existing.accepted_at) {
    return NextResponse.json({ error: 'Already accepted' }, { status: 409 })
  }

  const signature: Signature = {
    ip_address: extractIp(request),
    user_agent: request.headers.get('user-agent') || 'unknown',
    consent_statement: ESIGN_CONSENT_STATEMENT,
  }

  const { data: proposal, error } = await adminSupabase
    .from('proposals')
    .update({ accepted_at: new Date().toISOString(), accepted_by_name: name.trim(), signature })
    .eq('slug', slug)
    .select('accepted_at, accepted_by_name, signature')
    .single()

  if (error) {
    logError('Failed to record proposal acceptance', error, { slug, proposalId: existing.id })
    return NextResponse.json({ error: 'Failed to accept the proposal — please try again.' }, { status: 500 })
  }

  const content = existing.content as any
  const title = content?.title || 'Your proposal'
  const { error: notifError } = await adminSupabase.from('notifications').insert({
    account_id: existing.account_id,
    proposal_id: existing.id,
    message: `${name.trim()} accepted ${title}.`,
  })
  if (notifError) {
    logError('Failed to insert acceptance notification', notifError, { slug, proposalId: existing.id })
    // Don't fail the request over this — the acceptance itself already succeeded.
  }

  // Best-effort — a failed/missing owner lookup or email send must never fail an acceptance
  // that already succeeded and is legally meaningful.
  try {
    const { data: ownerRecord } = await adminSupabase
      .from('users')
      .select('id')
      .eq('account_id', existing.account_id)
      .eq('role', 'owner')
      .limit(1)
      .maybeSingle()

    if (ownerRecord) {
      const { data: ownerAuth } = await adminSupabase.auth.admin.getUserById(ownerRecord.id)
      const ownerEmail = ownerAuth?.user?.email
      if (ownerEmail) {
        const origin = request.headers.get('origin') || new URL(request.url).origin
        await sendEmail({
          to: ownerEmail,
          subject: `${name.trim()} signed ${title}`,
          react: ProposalSignedEmail({
            proposalName: title,
            clientName: name.trim(),
            viewLink: `${origin}/p/${slug}`,
          }),
          mockLink: `${origin}/p/${slug}`,
        })
      }
    }
  } catch (emailErr) {
    logError('Failed to send signature notification email', emailErr, { slug, proposalId: existing.id })
  }

  return NextResponse.json(proposal)
}
