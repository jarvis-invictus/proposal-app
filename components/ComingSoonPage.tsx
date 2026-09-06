import Link from 'next/link'
import { Logo } from './ui/Logo'

/** Shared shell for footer links that don't have real content behind them yet (About, Contact,
 * Privacy Policy, Terms of Service) — a plain, honestly-labeled placeholder rather than fabricated
 * copy, so the link works without pretending to be something it isn't. */
export function ComingSoonPage({ title, note }: { title: string; note?: string }) {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6" style={{ background: 'var(--gradient-app)' }}>
      <div style={{
        maxWidth: 480, width: '100%', textAlign: 'center', padding: '48px 32px',
        borderRadius: 'var(--radius-card-lg)', background: 'var(--surface-card)',
        border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-modal)',
        fontFamily: 'var(--font-sans)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
          <Logo size={28} />
        </div>
        <h1 style={{ fontSize: 'var(--text-h3)', fontWeight: 700, marginBottom: 10, color: 'var(--text-primary)' }}>{title}</h1>
        <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-body)' }}>
          {note || "This page isn't ready yet — check back soon."}
        </p>
        <Link href="/" style={{ display: 'inline-block', marginTop: 24, fontSize: 'var(--text-sm)', color: 'var(--brand-deep)', fontWeight: 500 }}>
          Back to home
        </Link>
      </div>
    </div>
  )
}
