import { signup } from '../actions'
import Link from 'next/link'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { env } from '@/env'
import { Card } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

const ROLE_LABEL: Record<string, string> = { owner: 'Owner', approver: 'Approver', drafter: 'Drafter' }

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; invite?: string }>
}) {
  const { error, invite } = await searchParams

  // Public page, no session yet — "Account members can manage own invitations" RLS means the
  // anon key can't read this, so the admin client is required here (same reason the public
  // proposal page uses it). Only ever surfaces email/role/team-name, nothing sensitive.
  let invitation: { email: string; role: string; teamName: string } | null = null
  if (invite) {
    const adminSupabase = createAdminClient(env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await adminSupabase
      .from('invitations')
      .select('email, role, accounts(name)')
      .eq('id', invite)
      .is('accepted_at', null)
      .maybeSingle()
    if (data) {
      invitation = { email: data.email, role: data.role, teamName: (data.accounts as any)?.name || 'the team' }
    }
  }

  return (
    <div className="flex h-screen w-full items-center justify-center" style={{ background: 'var(--gradient-app)' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <Card padding={40} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Logo size={26} wordmark />
            <h2 style={{ fontSize: 'var(--text-h3)', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-primary)', margin: 0, textAlign: 'center' }}>
              {invitation ? `Join ${invitation.teamName}` : 'Create an account'}
            </h2>
          </div>
          <form action={signup} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{
                borderRadius: 'var(--radius-xs)', padding: '10px 12px', fontSize: 'var(--text-sm)',
                background: 'var(--status-caution-surface)', border: '1px solid var(--status-caution-border)', color: 'var(--status-caution-text)',
              }}>
                {error}
              </div>
            )}
            {invite && !invitation && (
              <div style={{
                borderRadius: 'var(--radius-xs)', padding: '10px 12px', fontSize: 'var(--text-sm)',
                background: 'var(--surface-sunken)', border: '1px solid var(--border-hairline)', color: 'var(--text-secondary)',
              }}>
                This invite link is no longer valid — you can still create a new account below.
              </div>
            )}
            {invitation && (
              <>
                <input type="hidden" name="invite_id" value={invite} />
                <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  You&apos;ve been invited to join <strong>{invitation.teamName}</strong> as a{' '}
                  {ROLE_LABEL[invitation.role] || invitation.role}.
                </p>
              </>
            )}
            <Input id="full_name" name="full_name" type="text" autoComplete="name" required label="Full name" placeholder="Jane Doe" />
            <Input
              id="email" name="email" type="email" autoComplete="email" required label="Email address" placeholder="you@company.com"
              defaultValue={invitation?.email} readOnly={!!invitation}
              hint={invitation ? 'This invite is for this address specifically.' : undefined}
            />
            <Input id="password" name="password" type="password" autoComplete="new-password" required label="Password" placeholder="••••••••" />
            <Button type="submit" variant="primary" fullWidth>{invitation ? 'Join team' : 'Sign up'}</Button>
          </form>
          <div style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Already have an account?{' '}
            <Link href="/login" style={{ color: 'var(--brand-deep)', fontWeight: 'var(--weight-medium)' }}>
              Log in
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
