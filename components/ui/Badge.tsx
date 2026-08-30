import * as React from 'react';

type Tone = 'draft' | 'sent' | 'viewed' | 'accepted' | 'new';

const TONES: Record<Tone, { fg: string; bd: string; bg: string; dot: string | null }> = {
  draft: { fg: 'var(--text-muted)', bd: 'var(--border-hairline)', bg: 'transparent', dot: 'var(--status-draft)' },
  sent: { fg: 'var(--brand-deep)', bd: 'var(--brand-38)', bg: 'var(--brand-12)', dot: 'var(--status-sent)' },
  viewed: { fg: 'var(--brand-deep)', bd: 'var(--brand)', bg: 'var(--brand-22)', dot: 'var(--status-viewed)' },
  accepted: { fg: 'var(--text-inverse)', bd: 'var(--brand-deep)', bg: 'var(--brand-deep)', dot: null },
  new: { fg: 'var(--brand-ink)', bd: 'var(--brand)', bg: 'var(--brand-tint)', dot: null },
};

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
}

/** Status pill. Monochrome-plus-brand only — never green/red/amber. */
export function Badge({ children, tone = 'draft', style, ...rest }: BadgeProps) {
  const t = TONES[tone] || TONES.draft;
  return (
    <span {...rest} style={{
      display: 'inline-flex', alignItems: 'center', gap: 6, padding: '3px 9px', borderRadius: 'var(--radius-pill)',
      border: `1px solid ${t.bd}`, background: t.bg, color: t.fg,
      fontSize: 'var(--text-micro)', fontWeight: 'var(--weight-medium)', letterSpacing: '0.02em', lineHeight: 1.4, ...style,
    }}>
      {t.dot && <span style={{ width: 5, height: 5, borderRadius: 'var(--radius-pill)', background: t.dot, flex: 'none' }} />}
      {children}
    </span>
  );
}
