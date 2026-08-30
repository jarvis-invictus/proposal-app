import * as React from 'react';
import { IconButton } from '../ui/IconButton';
import { Icon } from '../ui/Icon';

/** Contextual formatting bar. Renders ONLY while a selection exists — never a permanent panel. */
export interface FormatToolbarProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Set false when nothing is selected; the component renders nothing. */
  visible?: boolean;
  /** Absolute position above the selection, in px relative to the canvas. */
  x?: number;
  y?: number;
  /** Fires the inline AI rewrite for the current selection. */
  onAsk?: () => void;
}

export function FormatToolbar({visible=true,x,y,onAsk,style,...rest}:FormatToolbarProps){
  if(!visible) return null;
  const positioned=x!=null||y!=null;
  return (
    <div {...rest} className="liquid liquid-strong" style={{position:positioned?'absolute':'relative',left:x,top:y,
      display:'inline-flex',alignItems:'center',gap:2,
      padding:5,borderRadius:'var(--radius-pill)',boxShadow:'var(--shadow-raised)',zIndex:30,
      animation:'fade-up var(--duration-base) var(--ease-out-soft) both',...style}}>
      <IconButton icon="bold" size="sm" label="Bold"/>
      <IconButton icon="italic" size="sm" label="Italic"/>
      <IconButton icon="link" size="sm" label="Link"/>
      <span style={{width:1,height:18,background:'var(--border-hairline)',margin:'0 4px'}}/>
      <IconButton icon="list" size="sm" label="Bulleted list"/>
      <IconButton icon="heading-2" size="sm" label="Heading"/>
      <span style={{width:1,height:18,background:'var(--border-hairline)',margin:'0 4px'}}/>
      <button type="button" onClick={onAsk} style={{display:'inline-flex',alignItems:'center',gap:6,height:28,padding:'0 12px',
        borderRadius:'var(--radius-pill)',border:'none',background:'var(--ink)',color:'var(--text-inverse)',
        fontFamily:'var(--font-sans)',fontSize:'var(--text-xs)',fontWeight:'var(--weight-medium)',cursor:'pointer'}}>
        <Icon name="sparkles" size={13}/> Rewrite
      </button>
    </div>
  );
}
