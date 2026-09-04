import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'
import { ESIGN_CONSENT_STATEMENT, type Signature } from '@/lib/signature'
import { sendEmail } from '@/lib/email'
import { ProposalSignedEmail } from '@/emails/ProposalSignedEmail'

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

  // The is('accepted_at', null) filter is what actually prevents the race, not the earlier
  // SELECT above (that check is only a fast-path 409 for the common case — two concurrent
  // submits can both pass it). Whichever request's UPDATE lands first wins the row here; the
  // other matches zero rows and gets maybeSingle() -> null instead of silently overwriting the
  // first signer's name/IP/timestamp in what's meant to be a legal record.
  const { data: proposal, error } = await adminSupabase
    .from('proposals')
    .update({ accepted_at: new Date().toISOString(), accepted_by_name: name.trim(), signature })
    .eq('slug', slug)
    .is('accepted_at', null)
    .select('accepted_at, accepted_by_name, signature')
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  if (!proposal) {
    return NextResponse.json({ error: 'Already accepted' }, { status: 409 })
  }

  const content = existing.content as any
  const title = content?.title || 'Your proposal'
  const { error: notifError } = await adminSupabase.from('notifications').insert({
    account_id: existing.account_id,
    proposal_id: existing.id,
    message: `${name.trim()} accepted ${title}.`,
  })
  if (notifError) {
    console.error('Failed to insert acceptance notification', notifError)
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
    console.error('Failed to send signature notification email', emailErr)
  }

  return NextResponse.json(proposal)
}
