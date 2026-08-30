'use client';
import * as React from 'react';
import { Icon } from './Icon';

const SIZES = { sm: 28, md: 34, lg: 40 } as const;

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string;
  size?: keyof typeof SIZES;
  variant?: 'ghost' | 'outline' | 'solid';
  active?: boolean;
  label?: string;
}

export function IconButton({ icon = 'more-horizontal', size = 'md', variant = 'ghost', active, label, disabled, style, ...rest }: IconButtonProps) {
  const [hover, setHover] = React.useState(false);
  const [press, setPress] = React.useState(false);
  const d = SIZES[size];
  const solid = variant === 'solid';
  const bgRest = solid ? 'var(--brand)' : variant === 'outline' ? 'var(--surface-card)' : 'transparent';
  const fg = solid ? 'var(--text-inverse)' : active ? 'var(--brand-deep)' : 'var(--text-secondary)';
  return (
    <button type="button" aria-label={label} disabled={disabled} {...rest}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setPress(false); }}
      onMouseDown={() => setPress(true)} onMouseUp={() => setPress(false)}
      style={{
        width: d, height: d, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--radius-pill)',
        border: variant === 'outline' ? '1px solid var(--border-strong)' : solid ? '1px solid var(--brand)' : '1px solid transparent',
        background: active && !solid ? 'var(--brand-22)' : hover && !disabled ? (solid ? 'var(--brand-deep)' : 'var(--brand-12)') : bgRest,
        color: fg, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.4 : 1,
        boxShadow: solid && hover && !disabled ? 'var(--shadow-brand)' : 'none',
        transform: press ? 'scale(0.94)' : hover && !disabled ? 'translateY(-1px)' : 'none',
        transition: 'background var(--duration-base) var(--ease-standard),transform var(--duration-base) var(--ease-spring),color var(--duration-base) var(--ease-standard),box-shadow var(--duration-base) var(--ease-standard)',
        ...style,
      }}>
      <Icon name={icon} size={size === 'sm' ? 15 : size === 'lg' ? 19 : 17} />
    </button>
  );
}
