import Link from 'next/link'

// Distinct from not-found.tsx on purpose: this is an ARCHIVED (unpublished) proposal, not a bad
// or expired link — the sender deliberately took it down, and a visitor with the old link
// deserves to know that plainly rather than see the generic "not found" message.
export function ProposalUnavailable() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: 24, gap: 12 }}>
      <h1 style={{ fontSize: 'var(--text-h3)', color: 'var(--text-primary)', margin: 0 }}>This proposal is no longer available</h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 420, margin: 0 }}>
        The sender has taken this link down. Reach out to them if you still need access.
      </p>
      <Link
        href="/"
        style={{ marginTop: 8, padding: '10px 18px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-strong)', background: 'var(--surface-card)', color: 'var(--text-primary)', fontSize: 14, textDecoration: 'none' }}
      >
        Go to Marg
      </Link>
    </div>
  )
}
