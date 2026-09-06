import * as React from 'react';

export interface LogoProps {
  size?: number;
  wordmark?: boolean;
  variant?: 'default' | 'glass' | 'ink';
  label?: string;
  style?: React.CSSProperties;
  className?: string;
}

// logo.png's real intrinsic size (339x324, replacing the old 542x462 opaque-background version —
// see its own inline history for how it was produced) isn't square — forcing equal width/height
// distorts it and trips Next Image's aspect-ratio warning. Scale height from the real ratio instead.
const LOGO_ASPECT = 324 / 339

/** The Marg mark — an angular arrow. Always the image asset; never redrawn. */
export function Logo({ size = 26, wordmark = false, variant = 'default', label = 'Marg', style, className }: LogoProps) {
  const imgHeight = Math.round(size * LOGO_ASPECT)
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
      {/* Plain <img>, not next/image: this asset's own transparent background — its whole point,
          replacing an older opaque-square version — came back opaque again once Next's image
          optimizer served it as WebP/AVIF (its alpha channel decoded intact when read directly
          from the response bytes with PIL, so this is specific to that re-encode/negotiation
          path, not the file itself). The icon is a few KB either way; skipping the optimizer
          sidesteps whatever in that pipeline was flattening it, rather than chasing the exact
          cause further. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/logo.png" alt={wordmark ? '' : label} width={size} height={imgHeight}
        style={{ width: size, height: 'auto', objectFit: 'contain', display: 'block', filter: variant === 'ink' ? 'brightness(0) invert(1)' : 'none' }} />
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
