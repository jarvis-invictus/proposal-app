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

export function Modal({open=true,title,eyebrow,children,footer,onClose,width=520,style,...rest}:ModalProps){
  if(!open) return null;
  return (
    <div style={{position:'absolute',inset:0,zIndex:60,display:'flex',alignItems:'flex-start',justifyContent:'center',padding:24,
      overflowY:'auto',overscrollBehavior:'contain',
      background:'var(--scrim)',backdropFilter:'blur(6px)',WebkitBackdropFilter:'blur(6px)',
      animation:'fade-in var(--duration-base) var(--ease-standard) both'}} onClick={onClose}>
      <div {...rest} onClick={e=>e.stopPropagation()} className="liquid liquid-strong"
        style={{width,maxWidth:'100%',flex:'none',margin:'auto',padding:24,borderRadius:'var(--radius-modal)',
          boxShadow:'var(--shadow-modal)',fontFamily:'var(--font-sans)',
          animation:'fade-up var(--duration-slow) var(--ease-out-soft) both',...style}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:16,marginBottom:16}}>
          <div style={{flex:1,display:'flex',flexDirection:'column',gap:4}}>
            {eyebrow&&<span style={{fontSize:'var(--text-micro)',letterSpacing:'var(--tracking-caps)',textTransform:'uppercase',color:'var(--text-muted)',fontWeight:'var(--weight-medium)'}}>{eyebrow}</span>}
            {title&&<h3 style={{fontSize:'var(--text-h3)',letterSpacing:'var(--tracking-tight)'}}>{title}</h3>}
          </div>
          {onClose&&<IconButton icon="x" label="Close" size="sm" onClick={onClose}/>}
        </div>
        {children}
        {footer&&<div style={{display:'flex',alignItems:'center',gap:10,marginTop:22}}>{footer}</div>}
      </div>
    </div>
  );
}
