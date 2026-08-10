import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { SignatureCard } from './SignatureCard';

export function HeroContent() {
  return (
    <div 
      className="flex flex-col items-center justify-center px-4 w-full"
      style={{ minHeight: 'calc(100vh - 80px)' }} // roughly viewport minus navbar
    >
      {/* Badge */}
      <div 
        style={{
          background: 'rgba(255, 255, 255, 0.55)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderRadius: '999px',
          padding: '6px 14px 6px 8px',
          fontSize: '13px',
          color: '#171717',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          marginBottom: '24px'
        }}
      >
        <div style={{ width: '7px', height: '7px', borderRadius: '50%', backgroundColor: '#171717' }} />
        <span style={{ fontWeight: 500 }}>Now with AI-guided brand kits</span>
      </div>

      {/* Headline */}
      <h1 
        className="text-center"
        style={{
          fontSize: 'clamp(36px, 6vw, 62px)',
          lineHeight: 1.08,
          fontWeight: 500,
          letterSpacing: '-0.02em',
          color: '#171717',
          maxWidth: '860px',
          margin: 0
        }}
      >
        Win more deals with proposals that practically write{' '}
        <span 
          style={{
            fontFamily: "'Instrument Serif', serif",
            fontStyle: 'italic',
            fontWeight: 400
          }}
        >
          themselves.
        </span>
      </h1>

      {/* Subtitle */}
      <p 
        className="text-center"
        style={{
          marginTop: '18px',
          fontSize: '16px',
          lineHeight: 1.6,
          color: '#3d4451',
          maxWidth: '480px'
        }}
      >
        Transform scattered notes into stunning, brand-aligned proposal packages in minutes, not hours.
      </p>

      {/* CTA Row */}
      <div 
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
            background: '#171717',
            color: 'white',
            borderRadius: '999px',
            padding: '13px 24px',
            fontSize: '14px',
            fontWeight: 500,
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
              borderRadius: '50%',
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
            fontSize: '14px',
            color: '#171717',
            fontWeight: 500
          }}
        >
          See how it works
        </Link>
      </div>

      <SignatureCard />
    </div>
  );
}
