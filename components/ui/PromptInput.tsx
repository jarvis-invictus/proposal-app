'use client';
import * as React from 'react';
import { Logo } from './Logo';
import { IconButton } from './IconButton';
import { MicButton } from './MicButton';

export interface PromptInputProps {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLTextAreaElement> | { target: { value: string } }) => void;
  onSubmit?: () => void;
  placeholder?: string;
  examples?: string[];
  footer?: React.ReactNode;
  size?: 'sm' | 'lg';
  listening?: boolean;
  onToggleMic?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  style?: React.CSSProperties;
}

export function PromptInput({ value, onChange, onSubmit, placeholder = 'Describe the deal you just closed…', examples = [], footer, size = 'lg', listening, onToggleMic, style, ...rest }: PromptInputProps) {
  const [focus, setFocus] = React.useState(false);
  const big = size === 'lg';
  return (
    <div {...rest} style={{ display: 'flex', flexDirection: 'column', gap: 14, width: '100%', ...style }}>
      {/* ring-owner (see globals.css): this div draws the focus ring itself via `focus` state
          below — without the class, the textarea's own :focus-visible fallback ring stacked a
          second, smaller, square-cornered box inside this one. */}
      <div className="liquid liquid-strong ring-owner" style={{
        display: 'flex', alignItems: big ? 'flex-end' : 'center', gap: 10, padding: big ? '16px 14px 14px 18px' : '8px 8px 8px 14px',
        borderColor: focus ? 'var(--brand)' : 'var(--glass-rim)',
        borderRadius: big ? 'var(--radius-card-lg)' : 'var(--radius-pill)',
        boxShadow: focus ? 'var(--ring-focus)' : 'var(--shadow-hover)',
      }}>
        <Logo size={big ? 22 : 18} style={{ marginBottom: big ? 5 : 0, opacity: 0.92 }} />
        <textarea rows={big ? 3 : 1} value={value} onChange={onChange as React.ChangeEventHandler<HTMLTextAreaElement>} placeholder={placeholder}
          onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && onSubmit) { e.preventDefault(); onSubmit(); } }}
          style={{
            flex: 1, minWidth: 0, border: 'none', outline: 'none', resize: 'none', background: 'transparent', fontFamily: 'var(--font-sans)',
            fontSize: big ? 'var(--text-body-lg)' : 'var(--text-body)', lineHeight: 'var(--leading-body)', color: 'var(--text-primary)',
          }} />
        <MicButton on={listening} onClick={onToggleMic} size={big ? 36 : 32} style={{ marginBottom: big ? 2 : 0 }} />
        <IconButton icon="arrow-up" variant="solid" size={big ? 'lg' : 'md'} label="Send" onClick={onSubmit} style={{ marginBottom: big ? 2 : 0 }} />
      </div>
      {examples.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
          {examples.map((x) => <ExampleChip key={x} onClick={() => onChange?.({ target: { value: x } })}>{x}</ExampleChip>)}
        </div>
      )}
      {footer}
    </div>
  );
}

function ExampleChip({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        padding: '7px 14px', borderRadius: 'var(--radius-pill)', border: `1px solid ${hover ? 'var(--brand)' : 'var(--border-hairline)'}`,
        background: hover ? 'var(--skeleton-sheen)' : 'var(--glass-quiet)', color: hover ? 'var(--brand-ink)' : 'var(--text-secondary)',
        fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', cursor: 'pointer', transform: hover ? 'var(--hover-lift)' : 'none',
        boxShadow: hover ? 'var(--shadow-brand)' : 'none', transition: 'all var(--duration-base) var(--ease-standard)',
      }}>{children}</button>
  );
}
