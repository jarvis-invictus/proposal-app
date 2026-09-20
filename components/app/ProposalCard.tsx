'use client';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { Badge } from '../ui/Badge';
import { IconButton } from '../ui/IconButton';

/**
 * Thumbnail-first proposal tile for the dashboard list. Title + "Updated Xm ago" sit below the preview as secondary text.
 */
export interface ProposalCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  client?: string;
  /** Relative time string, e.g. "Updated 4m ago". */
  updated?: string;
  status?: 'draft' | 'sent' | 'viewed' | 'accepted';
  /** Overrides the default Title-Case(status) label, e.g. "Pending approval" while status stays 'sent' for its tone. */
  statusLabel?: string;
  /** Headline figure shown in the thumbnail, e.g. "$50,000". */
  value?: string;
  onOpen?: () => void;
  /** Fires when the overflow button is pressed. The card owns the button; you own the menu. */
  onMenu?: (e: React.MouseEvent) => void;
  /** Your menu element, rendered anchored under the overflow button. Passing it also pins the button visible. */
  menu?: React.ReactNode;
}

interface MenuAnchor { top:number; right:number; phase:'measuring'|'ready'; flip:boolean; menuHeight:number }

// Gap between the trigger's top edge and the menu, matching this app's own convention
// (components/ui/SelectMenu.tsx uses the identical 8px clearance) — needed to compute the
// flipped (upward-opening) offset from the real measured menu height.
const FLIP_GAP=8;

export function ProposalCard({title,client,updated,status='draft',statusLabel,value,onOpen,onMenu,menu,style,...rest}:ProposalCardProps){
  const [hover,setHover]=React.useState(false);
  const active=hover||!!menu;
  const isOpen=!!menu;
  const wrapperRef=React.useRef<HTMLDivElement>(null);
  const portalRef=React.useRef<HTMLDivElement>(null);
  const [menuAnchor,setMenuAnchor]=React.useState<MenuAnchor|null>(null);

  // Fresh open/close only — keyed on the stable `isOpen` boolean rather than `menu` itself,
  // since `menu` is a new JSX reference on every unrelated parent re-render; keying on it
  // directly would re-enter the 'measuring' (invisible) phase below on e.g. every keystroke
  // in the dashboard search box while a menu is open, a new flicker this fix must not add.
  React.useLayoutEffect(()=>{
    if(isOpen&&wrapperRef.current){
      const rect=wrapperRef.current.getBoundingClientRect();
      setMenuAnchor({top:rect.top,right:window.innerWidth-rect.right,phase:'measuring',flip:false,menuHeight:0});
    } else {
      setMenuAnchor(null);
    }
  },[isOpen]);

  // Second pass: now that the menu is mounted (invisible), measure its real height and decide
  // whether it needs to flip upward. Runs once per open — the phase guard makes any later
  // re-entry (from this same effect's own state update) a no-op, not an infinite loop.
  React.useLayoutEffect(()=>{
    if(!menuAnchor||menuAnchor.phase!=='measuring'||!portalRef.current)return;
    const menuEl=portalRef.current.querySelector<HTMLElement>('[role="menu"]');
    const menuHeight=menuEl?.getBoundingClientRect().height??0;
    const flip=menuAnchor.top+menuHeight+FLIP_GAP>window.innerHeight;
    setMenuAnchor({...menuAnchor,phase:'ready',flip,menuHeight});
  },[menuAnchor]);

  return (
    <div {...rest} onClick={onOpen} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{display:'flex',flexDirection:'column',gap:12,cursor:'pointer',fontFamily:'var(--font-sans)',...style}}>
      <div style={{position:'relative',aspectRatio:'4 / 3',borderRadius:'var(--radius-card)',overflow:'hidden',
        background:'var(--surface-card)',border:'1px solid '+(active?'var(--brand)':'var(--border-hairline)'),
        boxShadow:active?'var(--shadow-brand)':'none',transform:active?'var(--hover-lift)':'none',
        transition:'transform var(--duration-base) var(--ease-spring),box-shadow var(--duration-base) var(--ease-standard),border-color var(--duration-base) var(--ease-standard)'}}>
        <Thumb title={title} client={client} value={value}/>
        <div ref={wrapperRef} style={{position:'absolute',top:10,right:10,zIndex:5}}>
          <IconButton icon="ellipsis" variant="outline" size="sm" label="Proposal options"
            active={!!menu} onClick={e=>{e.stopPropagation();onMenu&&onMenu(e);}}/>
        </div>
        {menuAnchor&&menu&&createPortal(
          <div ref={portalRef} style={{position:'fixed',top:menuAnchor.top,right:menuAnchor.right,zIndex:30,
            opacity:menuAnchor.phase==='measuring'?0:1,pointerEvents:menuAnchor.phase==='measuring'?'none':'auto'}}>
            {React.isValidElement(menu)
              ?React.cloneElement(menu as React.ReactElement<{top?:number;triggerRef?:React.RefObject<HTMLElement|null>}>,
                  menuAnchor.flip?{top:-(menuAnchor.menuHeight+FLIP_GAP),triggerRef:wrapperRef}:{triggerRef:wrapperRef})
              :menu}
          </div>,
          document.body
        )}
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:5}}>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span style={{fontSize:'var(--text-body)',fontWeight:'var(--weight-medium)',letterSpacing:'var(--tracking-tight)'}}>{title}</span>
          <Badge tone={status}>{statusLabel || status[0].toUpperCase()+status.slice(1)}</Badge>
        </div>
        <span style={{fontSize:'var(--text-sm)',color:'var(--text-muted)'}}>{client}{client&&updated?' · ':''}{updated}</span>
      </div>
    </div>
  );
}

interface ThumbProps { title?:string; client?:string; value?:string }

function Thumb({title,client,value}:ThumbProps){
  return (
    <div style={{position:'absolute',inset:0,padding:'16px 16px',display:'flex',flexDirection:'column',gap:8,transform:'scale(1)',transformOrigin:'top left'}}>
      <div style={{fontSize:9,letterSpacing:'var(--tracking-caps)',textTransform:'uppercase',color:'var(--text-muted)'}}>{client||'Proposal'}</div>
      <div style={{fontFamily:'var(--font-serif)',fontStyle:'italic',fontSize:19,lineHeight:1.1,color:'var(--text-primary)'}}>{title}</div>
      <div style={{display:'flex',flexDirection:'column',gap:5,marginTop:2}}>
        {[100,86,72].map((w,i)=><div key={i} style={{height:4,width:`${w}%`,borderRadius:2,background:'var(--ink-06)'}}/>)}
      </div>
      <div style={{marginTop:'auto',display:'flex',gap:6}}>
        <div style={{flex:1,padding:'7px 8px',borderRadius:6,background:'var(--surface-sunken)'}}>
          <div style={{fontSize:7,letterSpacing:'var(--tracking-caps)',textTransform:'uppercase',color:'var(--text-muted)'}}>Investment</div>
          <div style={{fontSize:11,fontWeight:'var(--weight-medium)'}}>{value||'—'}</div>
        </div>
        <div style={{flex:1,padding:'7px 8px',borderRadius:6,background:'var(--surface-sunken)'}}>
          <div style={{fontSize:7,letterSpacing:'var(--tracking-caps)',textTransform:'uppercase',color:'var(--text-muted)'}}>Timeline</div>
          <div style={{fontSize:11,fontWeight:'var(--weight-medium)'}}>12 weeks</div>
        </div>
      </div>
    </div>
  );
}
