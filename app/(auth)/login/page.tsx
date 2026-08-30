import { login } from '../actions'
import Link from 'next/link'
import { Card } from '@/components/ui/Card'
import { Logo } from '@/components/ui/Logo'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'

export default async function LoginPage({
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
              Log in to your account
            </h2>
          </div>
          <form action={login} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && (
              <div style={{
                borderRadius: 'var(--radius-xs)', padding: '10px 12px', fontSize: 'var(--text-sm)',
                background: 'var(--status-caution-surface)', border: '1px solid var(--status-caution-border)', color: 'var(--status-caution-text)',
              }}>
                {error}
              </div>
            )}
            <Input id="email" name="email" type="email" autoComplete="email" required label="Email address" placeholder="you@company.com" />
            <Input id="password" name="password" type="password" autoComplete="current-password" required label="Password" placeholder="••••••••" />
            <Button type="submit" variant="primary" fullWidth>Log in</Button>
          </form>
          <div style={{ textAlign: 'center', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
            Don&apos;t have an account?{' '}
            <Link href="/signup" style={{ color: 'var(--brand-deep)', fontWeight: 'var(--weight-medium)' }}>
              Sign up
            </Link>
          </div>
        </Card>
      </div>
    </div>
  )
}
