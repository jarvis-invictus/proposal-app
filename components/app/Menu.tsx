'use client';
import * as React from 'react';
import { Icon } from '../ui/Icon';

/**
 * Icon-anchored action menu. Distinct from `SelectMenu`, which picks a persistent value.
 * @startingPoint section="App" subtitle="Action dropdown with a destructive row" viewport="700x300"
 */
export interface MenuProps extends React.HTMLAttributes<HTMLDivElement> {
  open?: boolean;
  /** Called on outside click or Escape. */
  onClose?: () => void;
  align?: 'left' | 'right';
  width?: number;
  /** Offset below the anchor. */
  top?: number;
}

const MENUITEM_SELECTOR = '[role="menuitem"]:not([disabled])';

export function Menu({
  open=true,onClose,align='right',width=210,top=36,children,style,...rest
}:MenuProps){
  const ref=React.useRef<HTMLDivElement>(null);
  React.useEffect(()=>{
    if(!open)return;
    // Lands keyboard focus inside the menu on open — without this, arrow-key navigation below
    // has nothing to move focus relative to, since opening a menu doesn't move focus anywhere
    // by itself.
    ref.current?.querySelector<HTMLElement>(MENUITEM_SELECTOR)?.focus();
    const away=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))onClose&&onClose();};
    const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose&&onClose();};
    document.addEventListener('mousedown',away);document.addEventListener('keydown',esc);
    return()=>{document.removeEventListener('mousedown',away);document.removeEventListener('keydown',esc);};
  },[open,onClose]);
  if(!open)return null;
  const handleKeyDown=(e:React.KeyboardEvent)=>{
    if(e.key!=='ArrowDown'&&e.key!=='ArrowUp')return;
    e.preventDefault();
    const items=Array.from(ref.current?.querySelectorAll<HTMLElement>(MENUITEM_SELECTOR)??[]);
    if(items.length===0)return;
    const current=items.indexOf(document.activeElement as HTMLElement);
    const next=e.key==='ArrowDown'?(current+1)%items.length:(current-1+items.length)%items.length;
    items[next]?.focus();
  };
  return (
    <div ref={ref} role="menu" {...rest}
      onClick={e=>e.stopPropagation()} onKeyDown={handleKeyDown}
      style={{position:'absolute',top,[align==='left'?'left':'right']:0,width,padding:6,zIndex:30,
        background:'var(--glass-panel)',backdropFilter:'var(--blur-glass)',WebkitBackdropFilter:'var(--blur-glass)',
        border:'1px solid var(--border-hairline)',borderRadius:'var(--radius-card)',boxShadow:'var(--shadow-raised)',
        animation:'fade-up var(--duration-base) var(--ease-out-soft) both',...style}}>
      {children}
    </div>
  );
}

/** Hairline divider. Put destructive rows below one. */
export function MenuDivider({style,...rest}:React.HTMLAttributes<HTMLSpanElement>){
  return <span role="separator" {...rest}
    style={{display:'block',height:1,margin:'5px 4px',background:'var(--border-hairline)',...style}}/>;
}

export interface MenuRowProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string;
  /** Trailing hint, e.g. a keyboard shortcut. */
  hint?: string;
  /** Delete and friends — hovers on the caution ramp, never brand sky. */
  destructive?: boolean;
}

/**
 * One action. `destructive` shifts the whole row to the caution ramp on hover,
 * so Delete never sits in brand sky.
 */
export function MenuRow({
  icon,children,hint,destructive,disabled,onClick,style,...rest
}:MenuRowProps){
  const [hover,setHover]=React.useState(false);
  const live=hover&&!disabled;
  const danger=destructive&&live;
  const fg=disabled?'var(--text-muted)':danger?'var(--status-caution-on-solid)':'var(--text-primary)';
  return (
    <button type="button" role="menuitem" disabled={disabled} onClick={onClick}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} {...rest}
      style={{display:'flex',alignItems:'center',gap:9,width:'100%',padding:'8px 10px',border:'none',
        borderRadius:'var(--radius-sm)',cursor:disabled?'not-allowed':'pointer',textAlign:'left',
        background:!live?'transparent':danger?'var(--status-caution-solid)':'var(--brand-12)',
        color:fg,opacity:disabled?0.5:1,
        boxShadow:danger?'inset 0 1px 0 var(--glass-specular-soft)':'none',
        fontFamily:'var(--font-sans)',fontSize:'var(--text-sm)',
        transition:'background var(--duration-fast) var(--ease-standard),color var(--duration-fast) var(--ease-standard)',...style}}>
      {icon&&<Icon name={icon} size={15}
        color={disabled?'var(--text-muted)':danger?'var(--status-caution-on-solid)':live?'var(--brand-deep)':'var(--text-secondary)'}/>}
      <span style={{flex:1,minWidth:0}}>{children}</span>
      {hint&&<span style={{flex:'none',fontFamily:'var(--font-mono)',fontSize:'var(--text-micro)',
        color:'var(--text-muted)'}}>{hint}</span>}
    </button>
  );
}
