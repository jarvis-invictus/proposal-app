'use client'

import { useEffect } from 'react'
import { logError } from '@/lib/logging'

export default function PublicProposalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    logError('Public proposal page error boundary triggered', error)
  }, [error])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: 24, gap: 12 }}>
      <h1 style={{ fontSize: 'var(--text-h3)', color: 'var(--text-primary)', margin: 0 }}>This proposal couldn&apos;t be loaded</h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 420, margin: 0 }}>
        Something went wrong on our end. Try refreshing the page — if that link was sent to you, the sender can resend it.
      </p>
      <button
        onClick={() => reset()}
        style={{ marginTop: 8, padding: '10px 18px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-strong)', background: 'var(--surface-card)', color: 'var(--text-primary)', cursor: 'pointer', fontSize: 14 }}
      >
        Try again
      </button>
    </div>
  )
}
