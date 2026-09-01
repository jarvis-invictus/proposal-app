import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Seeds a real, pre-confirmed user via the admin API (bypasses email confirmation and signup
// rate limits, same reason __tests__/rls.test.ts does this) so the test exercises the real
// login server action and session cookie, not a stubbed one.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const canSeed = !!supabaseUrl && !!supabaseServiceKey

test.describe('Login flow', () => {
  test.skip(!canSeed, 'Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to seed a test user')

  const email = `e2e-login-${Date.now()}@example.com`
  const password = 'E2ETestPassword123!'
  let userId: string | undefined
  let accountId: string | undefined

  test.beforeAll(async () => {
    const admin = createClient(supabaseUrl, supabaseServiceKey)
    const { data, error } = await admin.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: { full_name: 'E2E Login Test' },
    })
    if (error) throw error
    userId = data.user?.id

    // on_auth_user_created auto-creates a fresh account with onboarding_completed_at unset,
    // which redirects a first-ever login to the onboarding wizard instead of the dashboard.
    // That's real, correct product behavior — but this test is scoped to the login mechanism
    // itself, not the separate onboarding flow, so mark it complete rather than adding brittle
    // wizard-navigation steps to a test that isn't about onboarding.
    const { data: userRecord } = await admin.from('users').select('account_id').eq('id', userId).single()
    accountId = userRecord?.account_id
    if (accountId) {
      await admin.from('accounts').update({ onboarding_completed_at: new Date().toISOString() }).eq('id', accountId)
    }
  })

  test.afterAll(async () => {
    const admin = createClient(supabaseUrl, supabaseServiceKey)
    // Deleting the auth user cascades to its `users` row (ON DELETE CASCADE) but not to the
    // `accounts` row that trigger created — accounts has no FK back to auth.users to cascade on.
    if (userId) await admin.auth.admin.deleteUser(userId)
    if (accountId) await admin.from('accounts').delete().eq('id', accountId)
  })

  test('logs in with valid credentials and lands on a working Dashboard', async ({ page }) => {
    await page.goto('/login')

    await page.getByLabel('Email address').fill(email)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: 'Log in' }).click()

    await page.waitForURL('**/dashboard')
    await expect(page.getByRole('heading', { name: 'Proposals', level: 1 })).toBeVisible()
  })
})
