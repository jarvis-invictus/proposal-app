'use client';
import * as React from 'react';
import { Icon } from './Icon';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  icon?: string;
  error?: string;
  size?: 'sm' | 'md' | 'lg';
  wrapperStyle?: React.CSSProperties;
}

export function Input({ label, hint, icon, error, size = 'md', value, onChange, placeholder, disabled, wrapperStyle, ...rest }: InputProps) {
  const h = size === 'lg' ? 'var(--control-h-lg)' : size === 'sm' ? 'var(--control-h-sm)' : 'var(--control-h)';
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-sans)', ...wrapperStyle }}>
      {label && <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>{label}</span>}
      {/* input-shell:has(input:focus-visible) in globals.css replaces what used to be JS
          onFocus/onBlur state — that showed the ring on every focus, mouse click included,
          duplicating (and drifting from) the app-wide :focus-visible convention instead of
          deferring to the browser's own keyboard-vs-pointer heuristic. */}
      <span className="input-shell" style={{
        display: 'flex', alignItems: 'center', gap: 8, height: h, padding: '0 14px', borderRadius: 'var(--radius-pill)',
        background: 'var(--glass-card)',
        border: `1px solid ${error ? 'var(--ink)' : 'var(--border-hairline)'}`,
        opacity: disabled ? 0.5 : 1,
        transition: 'border-color var(--duration-base) var(--ease-standard),box-shadow var(--duration-base) var(--ease-standard)',
      }}>
        {icon && <Icon name={icon} size={16} color="var(--text-muted)" />}
        <input {...rest} value={value} onChange={onChange} placeholder={placeholder} disabled={disabled}
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-sans)',
            fontSize: size === 'sm' ? 'var(--text-sm)' : 'var(--text-body)', color: 'var(--text-primary)', letterSpacing: 'var(--tracking-normal)',
          }} />
      </span>
      {(hint || error) && <span style={{ fontSize: 'var(--text-xs)', color: error ? 'var(--text-primary)' : 'var(--text-muted)' }}>{error || hint}</span>}
    </label>
  );
}
