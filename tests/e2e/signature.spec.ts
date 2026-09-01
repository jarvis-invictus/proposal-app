import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Seeds a real published proposal and hits the real accept flow — this is the highest-stakes
// loop in the app (a signature is a legal record), so it's worth the seeding cost rather than
// mocking the exact path that matters most. Mirrors the getAdminClient()/beforeAll/afterAll
// pattern __tests__/rls.test.ts already established for this codebase.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const canSeed = !!supabaseUrl && !!supabaseServiceKey

test.describe('Signature loop', () => {
  test.skip(!canSeed, 'Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to seed a test proposal')

  const slug = `e2e-signature-test-${Date.now()}`
  let accountId: string

  test.beforeAll(async () => {
    const admin = createClient(supabaseUrl, supabaseServiceKey)

    const { data: account, error: accountErr } = await admin
      .from('accounts').insert({ name: 'E2E Signature Test Co' }).select('id').single()
    if (accountErr) throw accountErr
    accountId = account.id

    let templateId: string
    const { data: systemTemplate } = await admin
      .from('templates').select('id').eq('is_system_default', true).limit(1).maybeSingle()
    if (systemTemplate) {
      templateId = systemTemplate.id
    } else {
      const { data: newTemplate, error: templateErr } = await admin
        .from('templates').insert({ name: 'E2E Template', category: 'Test', structure: {}, account_id: accountId })
        .select('id').single()
      if (templateErr) throw templateErr
      templateId = newTemplate.id
    }

    const { error: proposalErr } = await admin.from('proposals').insert({
      account_id: accountId,
      template_id: templateId,
      status: 'PUBLISHED',
      slug,
      content: {
        title: 'E2E Test Proposal',
        clientName: 'E2E Test Client',
        preparedFor: 'E2E Test Client',
        preparedBy: 'E2E Test Co',
        dateIssued: 'January 1, 2026',
        validUntil: 'January 31, 2026',
        packages: [{
          name: 'Test Package', description: 'A test package',
          originalPrice: 1000, discountedPrice: 800, popular: true,
          deliverables: ['Deliverable one'],
        }],
        addOns: [],
        timeline: [],
        terms: ['Standard terms'],
        paymentSection: { schedule: '50% upfront', terms: '' },
      },
    })
    if (proposalErr) throw proposalErr
  })

  test.afterAll(async () => {
    const admin = createClient(supabaseUrl, supabaseServiceKey)
    await admin.from('proposals').delete().eq('slug', slug)
    if (accountId) await admin.from('accounts').delete().eq('id', accountId)
  })

  test('a client can sign a published proposal and the signature certificate renders', async ({ page }) => {
    await page.goto(`/p/${slug}`)

    await page.getByRole('button', { name: 'Accept proposal' }).click()
    await page.getByLabel('Your full name').fill('E2E Test Signer')

    const signResponse = page.waitForResponse((res) => res.url().includes(`/api/proposals/${slug}/accept`) && res.status() === 200)
    await page.getByRole('button', { name: 'Accept & sign' }).click()
    await signResponse

    await expect(page.getByText('Signature Certificate')).toBeVisible()
    await expect(page.getByText('Accepted by E2E Test Signer')).toBeVisible()
  })
})
