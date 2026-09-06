import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { env } from '@/env'
import { verifyProposalPassword, signProposalAccessToken, proposalAccessCookieName, PROPOSAL_ACCESS_TTL_SECONDS } from '@/lib/proposalAccess'
import { checkAiRateLimit, extractClientIp } from '@/lib/ratelimit'
import { logError } from '@/lib/logging'

// Public route — verifies a proposal's password and, on success, sets a short-lived signed
// cookie so the visitor isn't asked again for the rest of their visit. The [id] param actually
// holds the slug, same convention as the sibling accept/view routes.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: slug } = await params
  const body = await request.json().catch(() => ({ password: '' }))
  const password = body?.password

  if (typeof password !== 'string' || !password) {
    return NextResponse.json({ error: 'Password required' }, { status: 400 })
  }

  const rl = await checkAiRateLimit(`proposal-unlock:${slug}:${extractClientIp(request)}`, 'proposalUnlock')
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many attempts — try again in a few minutes.' }, { status: 429 })
  }

  const adminSupabase = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const { data: proposal, error } = await adminSupabase
    .from('proposals')
    .select('id, status, password_hash')
    .eq('slug', slug)
    .maybeSingle()

  if (error) {
    logError('Failed to look up proposal for unlock', error, { slug })
    return NextResponse.json({ error: 'Something went wrong — please try again.' }, { status: 500 })
  }

  if (!proposal || proposal.status !== 'PUBLISHED' || !proposal.password_hash ||
      !verifyProposalPassword(password, proposal.password_hash)) {
    return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
  }

  const token = signProposalAccessToken(proposal.id, proposal.password_hash)
  const cookieStore = await cookies()
  cookieStore.set(proposalAccessCookieName(proposal.id), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: PROPOSAL_ACCESS_TTL_SECONDS,
  })

  return NextResponse.json({ ok: true })
}
