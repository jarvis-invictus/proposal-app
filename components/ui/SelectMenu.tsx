'use client';
import * as React from 'react';
import { Icon } from './Icon';

export type SelectOption = string | { value: string; label: React.ReactNode };

export interface SelectMenuProps {
  label?: string;
  value?: string;
  options?: SelectOption[];
  onSelect?: (value: string) => void;
  icon?: string;
  align?: 'left' | 'right';
  style?: React.CSSProperties;
}

export function SelectMenu({ label, value, options = [], onSelect, icon, align = 'left', style, ...rest }: SelectMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  return (
    <div {...rest} style={{ position: 'relative', display: 'inline-block', fontFamily: 'var(--font-sans)', ...style }}>
      <button type="button" onClick={() => setOpen((o) => !o)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, height: 'var(--control-h)', padding: '0 14px',
          borderRadius: 'var(--radius-pill)', border: '1px solid var(--border-hairline)',
          background: hover || open ? 'var(--surface-card)' : 'transparent', color: 'var(--text-primary)',
          fontSize: 'var(--text-body)', fontWeight: 'var(--weight-medium)', cursor: 'pointer',
          boxShadow: hover ? 'var(--shadow-hover)' : 'none', transition: 'all var(--duration-base) var(--ease-standard)',
        }}>
        {icon && <Icon name={icon} size={16} color="var(--text-muted)" />}
        {label && <span style={{ color: 'var(--text-muted)', fontWeight: 'var(--weight-regular)' }}>{label}</span>}
        {value}
        <Icon name="chevron-down" size={15} color="var(--text-muted)" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--duration-base) var(--ease-standard)' }} />
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 8px)', [align]: 0, minWidth: 200, padding: 6, zIndex: 40,
          background: 'var(--glass-panel)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
          border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-raised)',
          animation: 'fade-up var(--duration-base) var(--ease-out-soft) both',
        }}>
          {options.map((o) => {
            const v = typeof o === 'string' ? o : o.value;
            return <Option key={v} selected={v === value} onClick={() => { onSelect?.(v); setOpen(false); }}>{typeof o === 'string' ? o : o.label}</Option>;
          })}
        </div>
      )}
    </div>
  );
}

function Option({ children, selected, onClick }: { children: React.ReactNode; selected: boolean; onClick: () => void }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, width: '100%', padding: '9px 12px',
        border: 'none', borderRadius: 'var(--radius-sm)', background: hover ? 'var(--ink-06)' : 'transparent', cursor: 'pointer',
        fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)', color: 'var(--text-primary)', textAlign: 'left',
        transition: 'background var(--duration-fast) var(--ease-standard)',
      }}>
      {children}
      {selected && <Icon name="check" size={15} />}
    </button>
  );
}
