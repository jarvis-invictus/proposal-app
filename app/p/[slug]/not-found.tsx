import Link from 'next/link'

export default function ProposalNotFound() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', textAlign: 'center', padding: 24, gap: 12 }}>
      <h1 style={{ fontSize: 'var(--text-h3)', color: 'var(--text-primary)', margin: 0 }}>Proposal not found</h1>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', maxWidth: 420, margin: 0 }}>
        This link may be out of date, or the proposal hasn&apos;t been published yet. Check the link the sender gave you, or ask them to resend it.
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
