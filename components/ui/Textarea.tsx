'use client';
import * as React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  wrapperStyle?: React.CSSProperties;
}

export function Textarea({ label, hint, rows = 4, value, onChange, placeholder, wrapperStyle, ...rest }: TextareaProps) {
  const [focus, setFocus] = React.useState(false);
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontFamily: 'var(--font-sans)', ...wrapperStyle }}>
      {label && <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)' }}>{label}</span>}
      <textarea {...rest} rows={rows} value={value} onChange={onChange} placeholder={placeholder}
        onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
        style={{
          resize: 'vertical', padding: '14px 16px', borderRadius: 'var(--radius-card)', background: 'var(--surface-card)',
          border: `1px solid ${focus ? 'var(--border-focus)' : 'var(--border-hairline)'}`, boxShadow: focus ? 'var(--ring-focus)' : 'none', outline: 'none',
          fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', lineHeight: 'var(--leading-body)', color: 'var(--text-primary)',
          transition: 'border-color var(--duration-base) var(--ease-standard),box-shadow var(--duration-base) var(--ease-standard)',
        }} />
      {hint && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{hint}</span>}
    </label>
  );
}
