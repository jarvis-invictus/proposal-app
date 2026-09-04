'use client';

import * as React from 'react';
import Link from 'next/link';
import { Logo } from './ui/Logo';
import { Icon } from './ui/Icon';

const NAV_LINKS = [
  { href: '#product', label: 'Product' },
  { href: '#solutions', label: 'Solutions' },
  { href: '#pricing', label: 'Pricing' },
];

export function MarketingNavbar() {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex justify-center pt-5 sm:pt-6 px-3 sm:px-4 w-full relative z-10">
      <div className="w-full max-w-[720px]">
      <nav
        className="flex items-center justify-between w-full"
        style={{
          background: 'var(--surface-glass)',
          backdropFilter: 'var(--blur-glass)',
          WebkitBackdropFilter: 'var(--blur-glass)',
          border: '1px solid var(--border-glass)',
          boxShadow: 'inset 0 1px 0 var(--glass-specular-soft)',
          borderRadius: 'var(--radius-pill)',
          padding: '10px 12px 10px 22px'
        }}
      >
        <Logo size={22} wordmark label="Marg" />

        {/* Desktop Links */}
        <div className="hidden md:flex items-center" style={{ gap: '22px' }}>
          {NAV_LINKS.map((link) => (
            <Link key={link.href} href={link.href} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{link.label}</Link>
          ))}
        </div>

        {/* Right Cluster / CTA */}
        <div className="hidden md:block">
          <Link
            href="/signup"
            style={{
              display: 'inline-block',
              background: 'var(--ink)',
              color: 'var(--text-inverse)',
              borderRadius: 'var(--radius-pill)',
              padding: '9px 18px',
              fontSize: 'var(--text-xs)',
              fontWeight: 'var(--weight-medium)'
            }}
          >
            Start Free
          </Link>
        </div>

        {/* Mobile Hamburger — was previously decorative (no onClick at all), leaving the entire
            nav and the "Start Free" CTA above unreachable under the md breakpoint. Sized to a
            44px hit target (Apple HIG / comfortably past WCAG 2.5.8's 24px minimum) even though
            the icon itself stays 20px, via padding rather than growing the icon. */}
        <button
          type="button"
          onClick={() => setMobileOpen((v) => !v)}
          aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav-panel"
          className="md:hidden flex items-center justify-center"
          style={{ color: 'var(--ink)', width: 44, height: 44, marginRight: -10, background: 'none', border: 'none', cursor: 'pointer' }}
        >
          <Icon name={mobileOpen ? 'x' : 'menu'} size={20} />
        </button>
      </nav>

      {/* Mobile panel */}
      {mobileOpen && (
        <div
          id="mobile-nav-panel"
          className="md:hidden flex flex-col"
          style={{
            marginTop: 8,
            background: 'var(--surface-glass)',
            backdropFilter: 'var(--blur-glass)',
            WebkitBackdropFilter: 'var(--blur-glass)',
            border: '1px solid var(--border-glass)',
            boxShadow: 'inset 0 1px 0 var(--glass-specular-soft)',
            borderRadius: 'var(--radius-lg, 20px)',
            padding: '10px 22px',
            gap: 4,
          }}
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              style={{ fontSize: 'var(--text-body)', color: 'var(--text-secondary)', padding: '12px 0' }}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/signup"
            onClick={() => setMobileOpen(false)}
            style={{
              display: 'block', textAlign: 'center',
              background: 'var(--ink)', color: 'var(--text-inverse)',
              borderRadius: 'var(--radius-pill)', padding: '11px 18px',
              fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)',
              margin: '8px 0 6px',
            }}
          >
            Start Free
          </Link>
        </div>
      )}
      </div>
    </div>
  );
}
