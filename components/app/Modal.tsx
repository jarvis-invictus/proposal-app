import * as React from 'react';
import { IconButton } from '../ui/IconButton';

/**
 * Glass confirm dialog. Used for confirm-before-generate: show what is about to be built,
 * a destination indicator, and exactly one primary action.
 */
export interface ModalProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  title?: string;
  /** Small uppercase line above the title. */
  eyebrow?: string;
  /** Action row — put the single primary button last. */
  footer?: React.ReactNode;
  onClose?: () => void;
  width?: number;
}

const FOCUSABLE_SELECTOR = 'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({open=true,title,eyebrow,children,footer,onClose,width=520,style,...rest}:ModalProps){
  const titleId = React.useId();
  const dialogRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocusedRef = React.useRef<HTMLElement | null>(null);

  // Hooks must run every render regardless of `open` — the `if (!open) return null` below has
  // to come after every hook call, not before, or React loses track of hook order across
  // renders the moment `open` flips.
  React.useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    const focusable = dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusable && focusable[0] ? focusable[0] : dialog)?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onClose) onClose();
        return;
      }
      if (e.key !== 'Tab' || !dialog) return;
      const nodes = dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedRef.current?.focus();
    };
  }, [open, onClose]);

  if(!open) return null;
  return (
    <div style={{position:'absolute',inset:0,zIndex:60,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:24,
      overflowY:'auto',overscrollBehavior:'contain',
      background:'var(--scrim)',backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)',
      animation:'fade-in var(--duration-base) var(--ease-standard) both'}} onClick={onClose}>
      <div {...rest} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby={title ? titleId : undefined} tabIndex={-1}
        onClick={e=>e.stopPropagation()} className="liquid liquid-strong"
        style={{width,maxWidth:'100%',flex:'none',margin:'auto',padding:24,borderRadius:'var(--radius-modal)',
          boxShadow:'var(--shadow-modal)',fontFamily:'var(--font-sans)',
          animation:'fade-up var(--duration-slow) var(--ease-out-soft) both',...style}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:16,marginBottom:16}}>
          <div style={{flex:1,display:'flex',flexDirection:'column',gap:4}}>
            {eyebrow&&<span style={{fontSize:'var(--text-micro)',letterSpacing:'var(--tracking-caps)',textTransform:'uppercase',color:'var(--text-muted)',fontWeight:'var(--weight-medium)'}}>{eyebrow}</span>}
            {title&&<h3 id={titleId} style={{fontSize:'var(--text-h3)',letterSpacing:'var(--tracking-tight)'}}>{title}</h3>}
          </div>
          {onClose&&<IconButton icon="x" label="Close" size="sm" onClick={onClose}/>}
        </div>
        {children}
        {footer&&<div style={{display:'flex',alignItems:'center',gap:10,marginTop:22}}>{footer}</div>}
      </div>
    </div>
  );
}
