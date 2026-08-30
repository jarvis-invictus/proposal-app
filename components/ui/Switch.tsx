'use client';
import * as React from 'react';

const SIZES = { sm: { w: 28, h: 17, knob: 13 }, md: { w: 32, h: 19, knob: 15 } } as const;

export interface SwitchProps {
  checked?: boolean;
  onChange?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  label?: string;
  hint?: string;
  size?: keyof typeof SIZES;
  disabled?: boolean;
  id?: string;
  style?: React.CSSProperties;
}

/** General-purpose on/off toggle. Bare by default; pass `label` for the full selectable row. */
export function Switch({ checked = false, onChange, label, hint, size = 'md', disabled, id, style, ...rest }: SwitchProps) {
  const s = SIZES[size];
  const track = (
    <span aria-hidden="true" style={{
      position: 'relative', width: s.w, height: s.h, flex: 'none', padding: 2, borderRadius: 'var(--radius-pill)',
      background: checked ? 'var(--brand-deep)' : 'var(--ink-16)',
      boxShadow: checked ? 'inset 0 1px 2px rgba(23,56,79,0.30)' : 'inset 0 1px 2px var(--glass-shade)',
      transition: 'background var(--duration-base) var(--ease-standard)',
    }}>
      <span style={{
        display: 'block', width: s.knob, height: s.knob, borderRadius: '50%', background: 'var(--pure-white)',
        boxShadow: '0 1px 2px rgba(23,23,23,0.28),inset 0 1px 0 var(--glass-specular)',
        transform: `translateX(${checked ? s.w - s.knob - 4 : 0}px)`,
        transition: 'transform var(--duration-base) var(--ease-spring)',
      }} />
    </span>
  );

  if (!label) {
    return (
      <button type="button" role="switch" aria-checked={checked} id={id} disabled={disabled} onClick={onChange} {...rest}
        style={{ display: 'inline-flex', padding: 0, border: 'none', background: 'none', lineHeight: 0, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.42 : 1, ...style }}>
        {track}
      </button>
    );
  }

  return (
    <button type="button" role="switch" aria-checked={checked} id={id} disabled={disabled} onClick={onChange} {...rest}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 11, width: '100%', padding: '9px 11px', textAlign: 'left',
        borderRadius: 'var(--radius-sm)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.42 : 1,
        border: `1px solid ${checked ? 'var(--brand-38)' : 'var(--border-hairline)'}`,
        background: checked ? 'var(--brand-12)' : 'transparent', fontFamily: 'var(--font-sans)',
        transition: 'background var(--duration-base) var(--ease-standard),border-color var(--duration-base) var(--ease-standard)',
        ...style,
      }}>
      <span style={{ marginTop: 1, display: 'inline-flex' }}>{track}</span>
      <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>{label}</span>
        {hint && <span style={{ fontSize: 'var(--text-micro)', color: 'var(--text-muted)', lineHeight: 'var(--leading-snug)' }}>{hint}</span>}
      </span>
    </button>
  );
}
