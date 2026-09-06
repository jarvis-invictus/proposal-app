'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

export function PasswordGate({ slug }: { slug: string }) {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/proposals/${slug}/unlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) {
        // The cookie is now set — re-run the Server Component so it can verify the token itself.
        router.refresh()
      } else {
        const data = await res.json().catch(() => ({}))
        setError(data.error || 'Incorrect password')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 24, background: 'var(--surface-page)' }}>
      <form onSubmit={onSubmit} style={{
        width: '100%', maxWidth: 380, padding: '36px 32px', display: 'flex', flexDirection: 'column', gap: 16,
        borderRadius: 'var(--radius-card-lg)', background: 'var(--surface-card)', border: '1px solid var(--border-hairline)',
        boxShadow: 'var(--shadow-modal)', textAlign: 'center', fontFamily: 'var(--font-sans)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, borderRadius: '50%', background: 'var(--brand-12)' }}>
            <Icon name="lock" size={20} color="var(--brand-deep)" />
          </span>
        </div>
        <div>
          <h1 style={{ fontSize: 'var(--text-h4)', fontWeight: 700, margin: '0 0 6px', color: 'var(--text-primary)' }}>This proposal is password protected</h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', margin: 0 }}>Enter the password the sender gave you to view it.</p>
        </div>
        <Input
          type="password"
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />
        {error && <p role="alert" style={{ fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)', margin: 0 }}>{error}</p>}
        <Button type="submit" variant="primary" loading={loading} disabled={!password.trim()}>Unlock</Button>
      </form>
    </div>
  )
}
