'use client';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';
import { useDismissOnOutsideOrInvalidate } from '../../hooks/useDismissOnOutsideOrInvalidate';

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

// Matches this component's own real gap convention (previously `top: 'calc(100% + 8px)'`) —
// not reused from Menu.tsx's unrelated offset.
const GAP = 8;

interface ListboxAnchor {
  containerTop: number;
  containerBottom: number;
  containerLeft: number;
  containerRight: number;
  phase: 'measuring' | 'ready';
  flip: boolean;
}

export function SelectMenu({ label, value, options = [], onSelect, icon, align = 'left', style, ...rest }: SelectMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [hover, setHover] = React.useState(false);
  const listboxId = React.useId();
  const containerRef = React.useRef<HTMLDivElement>(null);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const listboxRef = React.useRef<HTMLDivElement>(null);
  const [anchor, setAnchor] = React.useState<ListboxAnchor | null>(null);

  // Fresh open/close only. Captures the trigger's real screen position so the portaled listbox
  // below can escape any clipping ancestor (overflow:hidden/auto) it would otherwise sit inside.
  React.useLayoutEffect(() => {
    if (open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setAnchor({ containerTop: rect.top, containerBottom: rect.bottom, containerLeft: rect.left, containerRight: rect.right, phase: 'measuring', flip: false });
    } else {
      setAnchor(null);
    }
  }, [open]);

  // Second pass: now that the listbox is mounted (invisible), measure its real height and decide
  // whether it needs to flip upward to stay within the viewport. Runs once per open — the phase
  // guard makes any later re-entry (from this same effect's own state update) a no-op.
  React.useLayoutEffect(() => {
    if (!anchor || anchor.phase !== 'measuring' || !listboxRef.current) return;
    const listboxHeight = listboxRef.current.getBoundingClientRect().height;
    const flip = anchor.containerBottom + GAP + listboxHeight > window.innerHeight;
    setAnchor({ ...anchor, phase: 'ready', flip });
  }, [anchor]);

  // Land on the current selection (or the first option) the way a native <select> does, rather
  // than leaving focus on the trigger with no indication where keyboard nav starts. Deliberately
  // keyed on `anchor?.phase` rather than `open`: the listbox only actually exists in the DOM once
  // `anchor` is set, and empirically (verified directly, not assumed from React's general
  // effect-ordering docs) a `[open]`-keyed passive effect can still run before the portaled node
  // is mounted — `listboxRef.current` measured `null` at that point in real testing.
  React.useEffect(() => {
    if (anchor?.phase !== 'ready' || !listboxRef.current) return;
    const selectedButton = listboxRef.current.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    (selectedButton ?? listboxRef.current.querySelector<HTMLButtonElement>('button'))?.focus();
  }, [anchor?.phase]);

  // Outside-click (containerRef covers the trigger, listboxRef covers the portaled listbox —
  // now that it portals to document.body, it's no longer a DOM descendant of containerRef) and
  // scroll/resize-close — shared with Menu.tsx's identical logic via this hook. Escape/Tab stay
  // in handleListboxKeyDown below, untouched: they differ for a real reason (listbox-scoped,
  // bundled with arrow-nav, and refocus the trigger on close).
  useDismissOnOutsideOrInvalidate(open, () => setOpen(false), [containerRef, listboxRef]);

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
      // leaving an open panel behind while focus moves elsewhere on the page. Now load-bearing,
      // not just tidy: once portaled, the listbox's options are no longer DOM descendants of any
      // wrapping Modal, so an un-prevented Tab's native default could jump focus straight out of
      // the modal's own focus trap instead of merely landing somewhere odd on the page.
      e.preventDefault();
      setOpen(false);
      triggerRef.current?.focus();
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
      {anchor && createPortal(
        <div ref={listboxRef} role="listbox" id={listboxId} aria-label={label} onKeyDown={handleListboxKeyDown} style={{
          position: 'fixed',
          ...(align === 'left' ? { left: anchor.containerLeft } : { right: window.innerWidth - anchor.containerRight }),
          ...(anchor.flip ? { bottom: window.innerHeight - anchor.containerTop + GAP } : { top: anchor.containerBottom + GAP }),
          minWidth: 200, padding: 6, zIndex: 70,
          opacity: anchor.phase === 'measuring' ? 0 : 1, pointerEvents: anchor.phase === 'measuring' ? 'none' : 'auto',
          background: 'var(--glass-panel)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
          border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-raised)',
          animation: 'fade-up var(--duration-base) var(--ease-out-soft) both',
        }}>
          {options.map((o) => {
            const v = typeof o === 'string' ? o : o.value;
            return <Option key={v} selected={v === value} onClick={() => { onSelect?.(v); setOpen(false); triggerRef.current?.focus(); }}>{typeof o === 'string' ? o : o.label}</Option>;
          })}
        </div>,
        document.body
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
