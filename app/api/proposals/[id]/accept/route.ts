import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { env } from '@/env'

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
    .select('id, status, accepted_at')
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

  const { data: proposal, error } = await adminSupabase
    .from('proposals')
    .update({ accepted_at: new Date().toISOString(), accepted_by_name: name.trim() })
    .eq('slug', slug)
    .select('accepted_at, accepted_by_name')
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(proposal)
}
