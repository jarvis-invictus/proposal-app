'use client';
import * as React from 'react';
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

export function ProposalCard({title,client,updated,status='draft',statusLabel,value,onOpen,onMenu,menu,style,...rest}:ProposalCardProps){
  const [hover,setHover]=React.useState(false);
  return (
    <div {...rest} onClick={onOpen} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{display:'flex',flexDirection:'column',gap:12,cursor:'pointer',fontFamily:'var(--font-sans)',...style}}>
      <div style={{position:'relative',aspectRatio:'4 / 3',borderRadius:'var(--radius-card)',overflow:'hidden',
        background:'var(--surface-card)',border:'1px solid '+(hover?'var(--brand)':'var(--border-hairline)'),
        boxShadow:hover?'var(--shadow-brand)':'none',transform:hover?'var(--hover-lift)':'none',
        transition:'transform var(--duration-base) var(--ease-spring),box-shadow var(--duration-base) var(--ease-standard),border-color var(--duration-base) var(--ease-standard)'}}>
        <Thumb title={title} client={client} value={value}/>
        <div style={{position:'absolute',top:10,right:10,zIndex:5,opacity:hover||menu?1:0,transition:'opacity var(--duration-base) var(--ease-standard)'}}>
          <IconButton icon="ellipsis" variant="outline" size="sm" label="Proposal options"
            active={!!menu} onClick={e=>{e.stopPropagation();onMenu&&onMenu(e);}}/>
          {menu}
        </div>
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
