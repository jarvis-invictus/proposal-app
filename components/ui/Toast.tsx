'use client';
import * as React from 'react';
import { Icon } from './Icon';

type Tone = 'success' | 'info' | 'error';

const TONES: Record<Tone, { icon: string; bg: string; fg: string; shadow: string; glyph: string }> = {
  success: { icon: 'check', bg: 'var(--brand-deep)', fg: 'var(--text-inverse)', shadow: 'var(--shadow-brand-lg)', glyph: 'var(--text-inverse)' },
  info: { icon: 'info', bg: 'var(--brand-deep)', fg: 'var(--text-inverse)', shadow: 'var(--shadow-brand-lg)', glyph: 'var(--text-inverse)' },
  error: { icon: 'triangle-alert', bg: 'var(--ink)', fg: 'var(--text-inverse)', shadow: 'var(--shadow-modal)', glyph: 'var(--text-inverse)' },
};

export interface ToastProps {
  tone?: Tone;
  children?: React.ReactNode;
  action?: () => void;
  actionLabel?: string;
  onDismiss?: () => void;
  icon?: string;
  style?: React.CSSProperties;
}

/** Transient confirmation. Errors persist until dismissed — a failed save must not vanish. */
export function Toast({ tone = 'success', children, action, actionLabel, onDismiss, icon, style, ...rest }: ToastProps) {
  const t = TONES[tone] || TONES.success;
  const dismissible = tone === 'error' || !!onDismiss;
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} aria-live={tone === 'error' ? 'assertive' : 'polite'} {...rest}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 10, maxWidth: 'min(520px,calc(100vw - 40px))',
        padding: action || dismissible ? '9px 9px 9px 16px' : '11px 18px', borderRadius: 'var(--radius-pill)',
        background: t.bg, color: t.fg, boxShadow: t.shadow, border: '1px solid var(--glass-specular-soft)',
        fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-snug)',
        animation: 'fade-up var(--duration-base) var(--ease-out-soft) both', ...style,
      }}>
      <Icon name={icon || t.icon} size={15} color={t.glyph} />
      <span style={{ flex: 1, minWidth: 0 }}>{children}</span>
      {action && (
        <button type="button" onClick={action} style={{
          flex: 'none', height: 28, padding: '0 12px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
          border: '1px solid rgba(255,255,255,0.28)', background: 'rgba(255,255,255,0.12)', color: t.fg,
          fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-medium)',
          transition: 'background var(--duration-fast) var(--ease-standard)',
        }}>{actionLabel || 'Undo'}</button>
      )}
      {dismissible && (
        <button type="button" aria-label="Dismiss" onClick={onDismiss} style={{
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, flex: 'none',
          borderRadius: 'var(--radius-pill)', border: 'none', background: 'transparent', cursor: 'pointer', color: t.fg, opacity: 0.7,
          transition: 'opacity var(--duration-fast) var(--ease-standard)',
        }}><Icon name="x" size={14} color={t.glyph} /></button>
      )}
    </div>
  );
}

export function ToastHost({ children, style, ...rest }: { children?: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div {...rest} style={{ position: 'fixed', left: '50%', bottom: 26, transform: 'translateX(-50%)', zIndex: 80, display: 'flex', flexDirection: 'column-reverse', alignItems: 'center', gap: 8, pointerEvents: 'none', ...style }}>
      {React.Children.map(children, (c) => c && <span style={{ pointerEvents: 'auto' }}>{c}</span>)}
    </div>
  );
}

export interface ToastItem { id: string; message: React.ReactNode; tone: Tone; duration?: number; action?: () => void; actionLabel?: string }

/** Queue + auto-dismiss so screens don't each re-implement the timer. */
export function useToasts(duration = 2600) {
  const [items, setItems] = React.useState<ToastItem[]>([]);
  const timers = React.useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const dismiss = React.useCallback((id: string) => {
    clearTimeout(timers.current[id]); delete timers.current[id];
    setItems((l) => l.filter((t) => t.id !== id));
  }, []);
  const push = React.useCallback((message: React.ReactNode, opts: Partial<Omit<ToastItem, 'id' | 'message'>> = {}) => {
    const id = Math.random().toString(36).slice(2);
    const tone = opts.tone || 'success';
    setItems((l) => [...l, { id, message, ...opts, tone }]);
    if (tone !== 'error') timers.current[id] = setTimeout(() => dismiss(id), opts.duration || duration);
    return id;
  }, [dismiss, duration]);
  React.useEffect(() => () => { Object.values(timers.current).forEach(clearTimeout); }, []);
  return { toasts: items, push, dismiss };
}
