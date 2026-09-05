'use client'

import { useEffect } from 'react'
import { logError } from '@/lib/logging'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function AuthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logError('Auth page error boundary triggered', error)
  }, [error])

  return (
    <div className="flex h-screen w-full items-center justify-center" style={{ background: 'var(--gradient-app)' }}>
      <Card padding={40} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 420, textAlign: 'center' }}>
        <h2 style={{ fontSize: 'var(--text-h3)', color: 'var(--text-primary)', margin: 0 }}>Something went wrong</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
          We couldn&apos;t load this page. Try again, or head back to login.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Button variant="secondary" onClick={() => (window.location.href = '/login')}>Back to login</Button>
          <Button variant="primary" onClick={() => reset()}>Try again</Button>
        </div>
      </Card>
    </div>
  )
}
