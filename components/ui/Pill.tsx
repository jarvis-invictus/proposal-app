import * as React from 'react';
import { Icon } from './Icon';

export interface PillProps extends React.HTMLAttributes<HTMLSpanElement> {
  icon?: string;
  dot?: boolean;
  tone?: 'glass' | 'solid' | 'ink';
  size?: 'sm' | 'md';
}

/** Non-interactive display badge — `FilterChip` is the interactive selection chip. */
export function Pill({ children, icon, dot, tone = 'glass', size = 'md', style, ...rest }: PillProps) {
  const pad = size === 'sm' ? '5px 12px' : '8px 16px';
  const tones = {
    glass: { bg: 'var(--surface-glass)', bd: '1px solid var(--border-glass)', fg: 'var(--text-primary)', blur: 'var(--blur-glass)' },
    solid: { bg: 'var(--surface-card)', bd: '1px solid var(--border-hairline)', fg: 'var(--text-primary)', blur: 'none' },
    ink: { bg: 'var(--ink)', bd: '1px solid var(--ink)', fg: 'var(--text-inverse)', blur: 'none' },
  };
  const t = tones[tone] || tones.glass;
  return (
    <span {...rest} style={{
      display: 'inline-flex', alignItems: 'center', gap: 8, padding: pad, borderRadius: 'var(--radius-pill)',
      background: t.bg, border: t.bd, color: t.fg, backdropFilter: t.blur, WebkitBackdropFilter: t.blur,
      fontSize: size === 'sm' ? 'var(--text-xs)' : 'var(--text-sm)', fontWeight: 'var(--weight-medium)', lineHeight: 1.2, ...style,
    }}>
      {dot && <span style={{ width: 6, height: 6, borderRadius: 'var(--radius-pill)', background: 'currentColor', flex: 'none' }} />}
      {icon && <Icon name={icon} size={14} />}
      {children}
    </span>
  );
}
