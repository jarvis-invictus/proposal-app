import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Pill } from './ui/Pill';

export function HeroContent() {
  return (
    <div
      className="flex flex-col items-center justify-center px-4 w-full"
      style={{ minHeight: 'calc(100vh - 120px)' }}
    >
      {/* Badge */}
      <div className="animate-pop" style={{ marginBottom: '24px' }}>
        <Pill dot>Now with AI-guided brand kits</Pill>
      </div>

      {/* Headline */}
      <h1
        className="text-center animate-pop delay-100"
        style={{
          fontSize: 'clamp(36px, 6vw, 62px)',
          lineHeight: 1.08,
          fontWeight: 500,
          letterSpacing: 'var(--tracking-tight)',
          color: 'var(--ink)',
          maxWidth: '860px',
          margin: 0
        }}
      >
        Win more deals with proposals that practically write{' '}
        <span
          style={{
            fontFamily: 'var(--font-serif)',
            fontStyle: 'italic',
            fontWeight: 400
          }}
        >
          themselves.
        </span>
      </h1>

      {/* Subtitle */}
      <p
        className="text-center animate-pop delay-200"
        style={{
          marginTop: '18px',
          fontSize: 'var(--text-body)',
          lineHeight: 'var(--leading-body)',
          color: 'var(--slate)',
          maxWidth: '480px'
        }}
      >
        Transform scattered notes into stunning, brand-aligned proposal packages in minutes, not hours.
      </p>

      {/* CTA Row */}
      <div
        className="animate-pop delay-300"
        style={{
          marginTop: '30px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexWrap: 'wrap',
          justifyContent: 'center'
        }}
      >
        <Link
          href="/dashboard"
          style={{
            background: 'var(--ink)',
            color: 'var(--text-inverse)',
            borderRadius: 'var(--radius-pill)',
            padding: '13px 24px',
            fontSize: 'var(--text-sm)',
            fontWeight: 'var(--weight-medium)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}
        >
          Start closing deals
          <div
            style={{
              background: 'rgba(255,255,255,0.15)',
              width: '22px',
              height: '22px',
              borderRadius: 'var(--radius-pill)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <ArrowRight style={{ width: '12px', height: '12px' }} />
          </div>
        </Link>
        <Link
          href="#demo"
          style={{
            fontSize: 'var(--text-sm)',
            color: 'var(--ink)',
            fontWeight: 'var(--weight-medium)'
          }}
        >
          See how it works
        </Link>
      </div>
    </div>
  );
}
