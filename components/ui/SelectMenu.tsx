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
  const listboxId = React.useId();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listboxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    // Land on the current selection (or the first option) the way a native <select> does,
    // rather than leaving focus on the trigger with no indication where keyboard nav starts.
    const selectedButton = listboxRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    (selectedButton ?? listboxRef.current?.querySelector<HTMLButtonElement>('button'))?.focus();

    const handleOutside = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const handleListboxKeyDown = (e: React.KeyboardEvent) => {
    const buttons = Array.from(listboxRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? []);
    const currentIndex = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      buttons[(currentIndex + 1) % buttons.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      buttons[(currentIndex - 1 + buttons.length) % buttons.length]?.focus();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
    } else if (e.key === 'Tab') {
      // A listbox is a closed little world while open — Tab exiting it without an explicit
      // choice reads as abandoning the picker, so treat it the same as Escape instead of
      // leaving an open panel behind while focus moves elsewhere on the page.
      setOpen(false);
    }
  };

  return (
    <div {...rest} ref={containerRef} style={{ position: 'relative', display: 'inline-block', fontFamily: 'var(--font-sans)', ...style }}>
      <button type="button" ref={triggerRef} onClick={() => setOpen((o) => !o)} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
        aria-haspopup="listbox" aria-expanded={open} aria-controls={listboxId}
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
        <div ref={listboxRef} role="listbox" id={listboxId} aria-label={label} onKeyDown={handleListboxKeyDown} style={{
          position: 'absolute', top: 'calc(100% + 8px)', [align]: 0, minWidth: 200, padding: 6, zIndex: 40,
          background: 'var(--glass-panel)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
          border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-raised)',
          animation: 'fade-up var(--duration-base) var(--ease-out-soft) both',
        }}>
          {options.map((o) => {
            const v = typeof o === 'string' ? o : o.value;
            return <Option key={v} selected={v === value} onClick={() => { onSelect?.(v); setOpen(false); triggerRef.current?.focus(); }}>{typeof o === 'string' ? o : o.label}</Option>;
          })}
        </div>
      )}
    </div>
  );
}

function Option({ children, selected, onClick }: { children: React.ReactNode; selected: boolean; onClick: () => void }) {
  const [hover, setHover] = React.useState(false);
  return (
    <button type="button" role="option" aria-selected={selected} onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
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
