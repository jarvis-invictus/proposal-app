'use client';
import * as React from 'react';
import { Icon } from './Icon';

export interface MicButtonProps {
  on?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  size?: number;
  label?: string;
  style?: React.CSSProperties;
}

/** Dictation toggle. Lives inline in the composer, immediately left of the send button. */
export function MicButton({ on, onClick, size = 34, label = 'Dictate', style, ...rest }: MicButtonProps) {
  const [hover, setHover] = React.useState(false);
  return (
    <button type="button" aria-label={on ? 'Stop dictating' : label} aria-pressed={!!on} onClick={onClick} {...rest}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: size, height: size, flex: 'none', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 2,
        borderRadius: 'var(--radius-pill)', cursor: 'pointer',
        border: `1px solid ${on ? 'var(--brand)' : 'transparent'}`,
        background: on ? 'var(--brand-22)' : hover ? 'var(--brand-12)' : 'transparent',
        color: on ? 'var(--brand-deep)' : 'var(--text-muted)',
        animation: on ? 'ring-pulse 1.8s var(--ease-standard) infinite' : 'none',
        transition: 'background var(--duration-base) var(--ease-standard),color var(--duration-base) var(--ease-standard)',
        ...style,
      }}>
      {on ? (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, height: 14 }}>
          {[0, 1, 2].map((i) => <span key={i} style={{ width: 2.5, height: 14, borderRadius: 2, background: 'currentColor', animation: `pulse-bar 900ms ${i * 140}ms infinite ease-in-out` }} />)}
        </span>
      ) : <Icon name="mic" size={size >= 34 ? 17 : 15} />}
    </button>
  );
}
