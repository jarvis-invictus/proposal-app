'use client';
import * as React from 'react';
import { Icon } from '../ui/Icon';

export interface DealWonProps {
  show: boolean;
  onDone?: () => void;
}

/** The deal-won moment: expanding sky rings, a check that springs in, one line of copy. No confetti. */
export function DealWon({ show, onDone }: DealWonProps) {
  React.useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => onDone && onDone(), 2600);
    return () => clearTimeout(t);
  }, [show]);

  if (!show) return null;
  return (
    <div aria-live="polite" style={{
      position: 'absolute', inset: 0, zIndex: 90, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', gap: 20, pointerEvents: 'none',
      background: 'var(--scrim)', backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)',
      animation: 'fade-in var(--duration-base) var(--ease-standard) both',
    }}>
      <span style={{
        position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: 88, height: 88,
        borderRadius: '50%', background: 'var(--brand-deep)', color: 'var(--text-inverse)', boxShadow: 'var(--shadow-brand-lg)',
        animation: 'pop-in 620ms var(--ease-spring) both',
      }}>
        <Icon name="check" size={38} color="var(--text-inverse)" />
        {[0, 1, 2].map((i) => (
          <span key={i} style={{
            position: 'absolute', inset: -10, borderRadius: '50%', border: '2px solid var(--brand)',
            animation: 'ripple-out 1.6s ' + (i * 280 + 320) + 'ms var(--ease-out-soft) forwards',
          }} />
        ))}
      </span>
      <span style={{ textAlign: 'center', animation: 'fade-up 520ms 280ms var(--ease-out-soft) both' }}>
        <span style={{ display: 'block', fontSize: 26, fontWeight: 600, letterSpacing: 'var(--tracking-tight)', color: 'var(--pure-white)' }}>
          Proposal <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400 }}>accepted</em>
        </span>
        <span style={{ display: 'block', marginTop: 6, fontSize: 'var(--text-body)', color: 'rgba(255,255,255,0.78)' }}>
          Your signature has been recorded.
        </span>
      </span>
    </div>
  );
}
