'use client';
import * as React from 'react';
import { Icon } from './Icon';

type Variant = 'primary' | 'ink' | 'secondary' | 'glass' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

const SIZES: Record<Size, { h: string; px: number; fs: string; gap: number; icon: number }> = {
  sm: { h: 'var(--control-h-sm)', px: 14, fs: 'var(--text-sm)', gap: 6, icon: 14 },
  md: { h: 'var(--control-h)', px: 20, fs: 'var(--text-body)', gap: 8, icon: 16 },
  lg: { h: 'var(--control-h-lg)', px: 26, fs: 'var(--text-body-lg)', gap: 10, icon: 18 },
};

const VARIANTS: Record<Variant, { bg: string; fg: string; bd: string; hoverBg: string; shadow: string; ripple: string }> = {
  primary: { bg: 'var(--brand-tint)', fg: 'var(--brand-ink)', bd: '1px solid var(--brand)', hoverBg: '#dcecf7', shadow: 'var(--shadow-brand)', ripple: 'rgba(47,127,191,0.30)' },
  ink: { bg: 'var(--ink)', fg: 'var(--text-inverse)', bd: '1px solid var(--ink)', hoverBg: '#2b2b2b', shadow: 'var(--shadow-hover)', ripple: 'rgba(255,255,255,0.32)' },
  secondary: { bg: 'var(--surface-card)', fg: 'var(--text-primary)', bd: '1px solid var(--border-strong)', hoverBg: 'var(--surface-raised)', shadow: 'var(--shadow-hover)', ripple: 'rgba(47,127,191,0.20)' },
  glass: { bg: 'var(--surface-glass)', fg: 'var(--brand-ink)', bd: '1px solid var(--border-glass)', hoverBg: 'var(--glass-panel)', shadow: 'var(--shadow-hover)', ripple: 'rgba(47,127,191,0.20)' },
  ghost: { bg: 'transparent', fg: 'var(--text-secondary)', bd: '1px solid transparent', hoverBg: 'var(--brand-12)', shadow: 'none', ripple: 'rgba(47,127,191,0.16)' },
};

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = pale Sky fill (the single main action). ink = destructive/inverse. secondary = white + hairline. glass = over hero/imagery. ghost = bare. */
  variant?: Variant;
  size?: Size;
  /** Lucide slug rendered before the label. */
  icon?: string;
  /** Lucide slug rendered after the label. */
  iconRight?: string;
  loading?: boolean;
  fullWidth?: boolean;
}

/** Pill-shaped action button. One primary per screen — everything else is secondary, glass or ghost. */
export function Button({ variant = 'primary', size = 'md', icon, iconRight, disabled, loading, fullWidth, children, style, onClick, ...rest }: ButtonProps) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const [ripples, setRipples] = React.useState<{ id: number; x: number; y: number; d: number }[]>([]);
  const s = SIZES[size];
  const v = VARIANTS[variant];
  const inert = disabled || loading;

  const spawn = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (inert) return;
    const r = e.currentTarget.getBoundingClientRect();
    const d = Math.max(r.width, r.height);
    const id = Date.now() + Math.random();
    setRipples((rs) => [...rs, { id, x: e.clientX - r.left - d / 2, y: e.clientY - r.top - d / 2, d }]);
    setTimeout(() => setRipples((rs) => rs.filter((x) => x.id !== id)), 520);
  };

  return (
    <button type="button" disabled={inert} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={(e) => { setPress(true); spawn(e); }} onMouseUp={() => setPress(false)}
      {...rest}
      style={{
        position: 'relative', overflow: 'hidden', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: s.gap,
        height: s.h, padding: `0 ${s.px}px`, width: fullWidth ? '100%' : 'auto',
        borderRadius: 'var(--radius-pill)', border: v.bd, background: hover && !inert ? v.hoverBg : v.bg, color: v.fg,
        fontFamily: 'var(--font-sans)', fontSize: s.fs, fontWeight: 'var(--weight-medium)', letterSpacing: 'var(--tracking-normal)',
        // `overflow: hidden` above (needed to clip the ripple) combined with `nowrap` meant any
        // label wider than its button was silently chopped mid-word with no ellipsis — on a 375px
        // phone the public proposal's primary "Accept proposal" CTA rendered as "Accept proposa".
        // flex-shrink:0 stops a flex parent squeezing the button below its content width.
        cursor: inert ? 'not-allowed' : 'pointer', opacity: inert ? 0.42 : 1, whiteSpace: 'nowrap', flexShrink: 0,
        boxShadow: hover && !inert ? v.shadow : 'none',
        transform: inert ? 'none' : press ? 'scale(var(--press-scale))' : hover ? 'translateY(-2px)' : 'none',
        transition: 'transform var(--duration-base) var(--ease-spring),background var(--duration-base) var(--ease-standard),box-shadow var(--duration-base) var(--ease-standard),opacity var(--duration-base) var(--ease-standard)',
        ...style,
      }}>
      {ripples.map((r) => (
        <span key={r.id} style={{ position: 'absolute', left: r.x, top: r.y, width: r.d, height: r.d, borderRadius: '50%', background: v.ripple, pointerEvents: 'none', animation: 'ripple-out 520ms var(--ease-out-soft) forwards' }} />
      ))}
      {loading && <Icon name="loader-circle" size={s.icon} style={{ animation: 'spin 900ms linear infinite' }} />}
      {!loading && icon && <Icon name={icon} size={s.icon} />}
      <span style={{ position: 'relative' }}>{children}</span>
      {iconRight && <Icon name={iconRight} size={s.icon} />}
    </button>
  );
}
