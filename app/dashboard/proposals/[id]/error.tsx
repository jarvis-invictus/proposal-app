'use client'

import { useEffect } from 'react'
import { logError } from '@/lib/logging'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'

export default function ProposalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logError('Proposal editor error boundary triggered', error)
  }, [error])

  return (
    <div style={{ display: 'flex', minHeight: '60vh', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card padding={40} style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 440, textAlign: 'center' }}>
        <h2 style={{ fontSize: 'var(--text-h3)', color: 'var(--text-primary)', margin: 0 }}>Something went wrong</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', margin: 0 }}>
          We couldn&apos;t load this proposal. We&apos;ve logged the error — try again, or head back to the dashboard.
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <Button variant="secondary" onClick={() => (window.location.href = '/dashboard')}>Back to dashboard</Button>
          <Button variant="primary" onClick={() => reset()}>Try again</Button>
        </div>
      </Card>
    </div>
  )
}
