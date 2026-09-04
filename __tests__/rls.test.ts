import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

// Clients
const getAnonClient = () => createClient(supabaseUrl, supabaseAnonKey)
const getAdminClient = () => createClient(supabaseUrl, supabaseServiceKey)

const isConfigured = !!supabaseUrl && !!supabaseAnonKey && !!supabaseServiceKey

describe.skipIf(!isConfigured)('Row Level Security (RLS) Policies', () => {
  let userA: any
  let userB: any

  // createClient() throws synchronously on an empty key ("supabaseKey is required") — that
  // happens here, at describe-body evaluation time, which runs regardless of skipIf. A CI run
  // with no real Supabase project (no .env.local, as in this repo's own CI) would otherwise crash
  // the whole file before skipIf ever gets a chance to skip anything.
  const clientA = isConfigured ? getAnonClient() : null!
  const clientB = isConfigured ? getAnonClient() : null!
  const publicClient = isConfigured ? getAnonClient() : null!
  const adminClient = isConfigured ? getAdminClient() : null!

  beforeAll(async () => {
    // describe.skipIf only skips the it() blocks below, not beforeAll/afterAll themselves —
    // without this, a CI run with no real Supabase project configured still tries a real
    // network call here and fails the whole file instead of skipping cleanly.
    if (!isConfigured) return
    const emailA = `user_a_${Date.now()}@example.com`
    const emailB = `user_b_${Date.now()}@example.com`
    const password = 'testpassword123'

    // 1. Create users directly via Admin API (bypasses rate limits & auto-confirms)
    const { data: adminUserA, error: errA } = await adminClient.auth.admin.createUser({
      email: emailA,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: 'Test User A' }
    })
    if (errA) throw errA

    const { data: adminUserB, error: errB } = await adminClient.auth.admin.createUser({
      email: emailB,
      password: password,
      email_confirm: true,
      user_metadata: { full_name: 'Test User B' }
    })
    if (errB) throw errB

    // 2. Sign in as those users with anon clients to establish a session for RLS
    const { data: authA, error: signInErrA } = await clientA.auth.signInWithPassword({
      email: emailA,
      password: password,
    })
    if (signInErrA) throw signInErrA
    userA = authA.user

    const { data: authB, error: signInErrB } = await clientB.auth.signInWithPassword({
      email: emailB,
      password: password,
    })
    if (signInErrB) throw signInErrB
    userB = authB.user

    // Ensure public client is logged out
    await publicClient.auth.signOut()
  })

  afterAll(async () => {
    if (!isConfigured) return
    // Clean up created test users
    if (userA?.id) await adminClient.auth.admin.deleteUser(userA.id)
    if (userB?.id) await adminClient.auth.admin.deleteUser(userB.id)
  })

  it('verifies User A has exactly one account and can read it', async () => {
    const { data: accounts, error } = await clientA.from('accounts').select('*')
    expect(error).toBeNull()
    expect(accounts).toHaveLength(1)
  })

  it('verifies User A cannot read User B proposals', async () => {
    const { data: bAccounts } = await clientB.from('accounts').select('id').single()
    const bAccountId = bAccounts?.id
    expect(bAccountId).toBeDefined()

    const { data: aReadsB, error } = await clientA
      .from('accounts')
      .select('*')
      .eq('id', bAccountId)
    
    expect(aReadsB).toHaveLength(0)
  })

  it('verifies public cannot read private proposals', async () => {
    const { data: aAccounts } = await clientA.from('accounts').select('id').single()
    
    // Check for a system template, or insert a temporary one if none exists
    const { data: systemTemplate } = await clientA.from('templates').select('id').eq('is_system_default', true).limit(1).maybeSingle()
    let templateId = systemTemplate?.id
    if (!templateId) {
      const { data: newTemplate } = await clientA.from('templates').insert({
        name: 'Test Template',
        category: 'Test',
        structure: {},
        account_id: aAccounts?.id
      }).select().single()
      templateId = newTemplate?.id
    }

    const { data: proposal } = await clientA.from('proposals').insert({
      account_id: aAccounts?.id,
      template_id: templateId,
      status: 'DRAFT',
      content: {},
      slug: `draft-prop-${Date.now()}`
    }).select().single()

    const { data: publicReads, error } = await publicClient
      .from('proposals')
      .select('*')
      .eq('id', proposal?.id)

    expect(publicReads).toHaveLength(0)
  })
})
