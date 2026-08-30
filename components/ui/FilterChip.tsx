'use client';
import * as React from 'react';
import { Icon } from './Icon';

const SIZES = { sm: { h: 28, px: 12, fs: 'var(--text-xs)' }, md: { h: 32, px: 14, fs: 'var(--text-sm)' } } as const;

export interface FilterChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  multi?: boolean;
  icon?: string;
  count?: number;
  size?: keyof typeof SIZES;
}

/** The product's selection chip — interactive; `Pill` is the non-interactive display badge. */
export function FilterChip({ active = false, multi = false, icon, count, size = 'md', disabled, onClick, children, style, ...rest }: FilterChipProps) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const s = SIZES[size];
  const live = !disabled;
  return (
    <button type="button" disabled={disabled} onClick={onClick}
      aria-pressed={multi ? active : undefined} aria-current={!multi && active ? 'true' : undefined}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      {...rest}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, height: s.h, padding: `0 ${s.px}px`,
        borderRadius: 'var(--radius-pill)', cursor: disabled ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap',
        border: `1px solid ${active ? 'var(--brand)' : hover && live ? 'var(--brand-38)' : 'var(--border-hairline)'}`,
        background: active ? 'var(--brand-tint)' : hover && live ? 'var(--glass-card-hover)' : 'transparent',
        color: active ? 'var(--brand-ink)' : 'var(--text-secondary)', opacity: disabled ? 0.42 : 1,
        fontFamily: 'var(--font-sans)', fontSize: s.fs, fontWeight: active ? 'var(--weight-medium)' : 'var(--weight-regular)',
        boxShadow: active ? 'inset 0 1px 0 var(--glass-specular-soft)' : 'none',
        transform: !live ? 'none' : press ? 'scale(var(--press-scale))' : hover ? 'var(--hover-lift)' : 'none',
        transition: 'background var(--duration-base) var(--ease-standard),border-color var(--duration-base) var(--ease-standard),color var(--duration-base) var(--ease-standard),transform var(--duration-base) var(--ease-spring)',
        ...style,
      }}>
      {multi && (
        <span aria-hidden="true" style={{
          display: 'inline-flex', alignItems: 'center', overflow: 'hidden', flex: 'none',
          width: active ? 14 : 0, marginLeft: active ? 0 : -6, opacity: active ? 1 : 0,
          transition: 'width var(--duration-base) var(--ease-out-soft),opacity var(--duration-fast) var(--ease-standard),margin var(--duration-base) var(--ease-out-soft)',
        }}>
          <Icon name="check" size={14} color="var(--brand-deep)" />
        </span>
      )}
      {icon && <Icon name={icon} size={size === 'sm' ? 13 : 14} color={active ? 'var(--brand-deep)' : 'var(--text-muted)'} />}
      {children}
      {count != null && <span style={{ fontVariantNumeric: 'tabular-nums', fontSize: 'var(--text-micro)', color: active ? 'var(--brand-deep)' : 'var(--text-muted)' }}>{count}</span>}
    </button>
  );
}
