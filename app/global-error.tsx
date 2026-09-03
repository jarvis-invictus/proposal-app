'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'

export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <html lang="en">
      <body style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', fontFamily: 'system-ui, sans-serif', textAlign: 'center', padding: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, marginBottom: 8 }}>Something went wrong</h1>
        <p style={{ color: '#6b7280', marginBottom: 20, maxWidth: 420 }}>
          We&apos;ve logged the error and will look into it. Try again, or head back to your dashboard.
        </p>
        <button
          onClick={() => window.location.assign('/dashboard')}
          style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#171717', color: '#fff', cursor: 'pointer', fontSize: 14 }}
        >
          Back to dashboard
        </button>
      </body>
    </html>
  )
}
