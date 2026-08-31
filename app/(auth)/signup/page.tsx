import { signup } from '../actions'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams

  return (
    <div className="flex h-screen w-full items-center justify-center" style={{ background: 'var(--gradient-app)' }}>
      <div style={{ width: '100%', maxWidth: 420 }}>
        <Card padding={40} style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Logo size={26} wordmark />
            <h2 style={{ fontSize: 'var(--text-h3)', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-primary)', margin: 0 }}>
              Create an account
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
            <Input id="full_name" name="full_name" type="text" autoComplete="name" required label="Full name" placeholder="Jane Doe" />
            <Input id="email" name="email" type="email" autoComplete="email" required label="Email address" placeholder="you@company.com" />
            <Input id="password" name="password" type="password" autoComplete="new-password" required label="Password" placeholder="••••••••" />
            <Button type="submit" variant="primary" fullWidth>Sign up</Button>
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
