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

  // Every call site passes an inline arrow (`onClose={() => setOpen(false)}`), so `onClose` gets a
  // new identity on every parent render. Kept in a ref and OUT of the effect's dep array below:
  // with it in the deps, typing one character into a field inside the modal re-rendered the
  // parent, tore the effect down (restoring focus to the trigger) and re-ran it (focusing the
  // first control) — which yanked focus out of the field on every keystroke. That made the
  // signature modal on the public proposal page impossible to fill in: the space in a typed name
  // landed on the focused Close button and dismissed the dialog.
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => { onCloseRef.current = onClose; });

  // Hooks must run every render regardless of `open` — the `if (!open) return null` below has
  // to come after every hook call, not before, or React loses track of hook order across
  // renders the moment `open` flips.
  React.useEffect(() => {
    if (!open) return;
    previouslyFocusedRef.current = document.activeElement as HTMLElement | null;
    const dialog = dialogRef.current;
    // Prefer the first real field over the header's Close button (which is rendered before
    // `children` and would otherwise always win) — a modal that exists to collect a name or an
    // email should open with the cursor already in it.
    const firstField = dialog?.querySelector<HTMLElement>(
      'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])'
    );
    const focusable = dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    (firstField ?? (focusable && focusable[0] ? focusable[0] : dialog))?.focus();

    // Without this the page behind the scrim keeps scrolling under the wheel/trackpad. Applied to
    // <html> as well as <body> because the actual scrolling element here is documentElement —
    // locking body alone left the page still scrolling behind an open dialog.
    const scroller = document.documentElement;
    const previousBodyOverflow = document.body.style.overflow;
    const previousScrollerOverflow = scroller.style.overflow;
    document.body.style.overflow = 'hidden';
    scroller.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCloseRef.current?.();
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
      document.body.style.overflow = previousBodyOverflow;
      scroller.style.overflow = previousScrollerOverflow;
      previouslyFocusedRef.current?.focus();
    };
  }, [open]);

  if(!open) return null;
  // `fixed`, not `absolute`: an absolutely-positioned scrim sizes itself to the nearest
  // positioned ancestor rather than the viewport, so callers had to wrap this in their own
  // `position:fixed` div to make it cover the screen — and the three that didn't (ConfirmDialog,
  // TemplatesClient, NewProposalClient) got a scrim anchored to a container instead of the
  // window. Those wrappers are now redundant but harmless.
  return (
    <div style={{position:'fixed',inset:0,zIndex:60,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:24,
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
