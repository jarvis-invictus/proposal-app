import Image from 'next/image';
import * as React from 'react';

export interface LogoProps {
  size?: number;
  wordmark?: boolean;
  variant?: 'default' | 'glass' | 'ink';
  label?: string;
  style?: React.CSSProperties;
  className?: string;
}

/** The Marg mark — an angular arrow. Always the image asset; never redrawn. */
export function Logo({ size = 26, wordmark = false, variant = 'default', label = 'Marg', style, className }: LogoProps) {
  const mark = (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      width: variant === 'default' ? size : size * 1.42, height: variant === 'default' ? size : size * 1.42, flex: 'none',
      borderRadius: variant === 'default' ? 0 : 'var(--radius-sm)',
      background: variant === 'glass' ? 'var(--surface-glass)' : variant === 'ink' ? 'var(--ink)' : 'transparent',
      backdropFilter: variant === 'glass' ? 'var(--blur-glass)' : 'none',
      WebkitBackdropFilter: variant === 'glass' ? 'var(--blur-glass)' : 'none',
      border: variant === 'glass' ? '1px solid var(--border-glass)' : '1px solid transparent',
    }}>
      <Image src="/logo.png" alt={wordmark ? '' : label} width={size} height={size}
        style={{ width: size, height: size, objectFit: 'contain', display: 'block', filter: variant === 'ink' ? 'brightness(0) invert(1)' : 'none' }} />
    </span>
  );
  if (!wordmark) return <span className={className} style={{ display: 'inline-flex', ...style }}>{mark}</span>;
  return (
    <span className={className} style={{ display: 'inline-flex', alignItems: 'center', gap: 9, ...style }}>
      {mark}
      <span style={{ fontFamily: 'var(--font-sans)', fontSize: size * 0.78, fontWeight: 'var(--weight-semibold)', letterSpacing: '-0.03em', color: variant === 'ink' ? 'var(--text-inverse)' : 'var(--text-primary)' }}>{label}</span>
    </span>
  );
}
