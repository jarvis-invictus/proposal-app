import Link from 'next/link';
import { Logo } from './ui/Logo';
import { Icon } from './ui/Icon';

export function MarketingNavbar() {
  return (
    <div className="flex justify-center pt-5 sm:pt-6 px-3 sm:px-4 w-full relative z-10">
      <nav
        className="flex items-center justify-between w-full max-w-[720px]"
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
          <Link href="#product" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Product</Link>
          <Link href="#solutions" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Solutions</Link>
          <Link href="#pricing" style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Pricing</Link>
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

        {/* Mobile Hamburger */}
        <div className="md:hidden flex items-center pr-2">
          <button style={{ color: 'var(--ink)' }}>
            <Icon name="menu" size={20} />
          </button>
        </div>
      </nav>
    </div>
  );
}
