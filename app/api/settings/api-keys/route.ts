import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// Keys are shown in full exactly once, at creation — only a prefix + a hash are ever stored,
// same discipline as any other API-key feature (Stripe, GitHub, etc.).
function generateKey() {
  const secret = crypto.randomBytes(24).toString('hex')
  const full = `mrg_live_${secret}`
  const prefix = full.slice(0, 12)
  const hash = crypto.createHash('sha256').update(full).digest('hex')
  return { full, prefix, hash }
}

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('api_keys')
    .select('id, name, key_prefix, created_at, revoked_at')
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { name } = await request.json()
  if (!name || typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  }

  const { data: userRecord } = await supabase.from('users').select('account_id').eq('id', user.id).single()
  if (!userRecord) return NextResponse.json({ error: 'No account found' }, { status: 404 })

  const { full, prefix, hash } = generateKey()

  const { data, error } = await supabase
    .from('api_keys')
    .insert({ account_id: userRecord.account_id, name: name.trim(), key_prefix: prefix, key_hash: hash })
    .select('id, name, key_prefix, created_at')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // The full key is returned once here and never again.
  return NextResponse.json({ ...data, key: full })
}
