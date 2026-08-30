import * as React from 'react';
import { IconButton } from '../ui/IconButton';
import { Button } from '../ui/Button';
import { Icon } from '../ui/Icon';

/** Thin editor chrome: edit controls left, document title + save state center, Share/Publish right. */
export interface EditorToolbarProps extends React.HTMLAttributes<HTMLElement> {
  title?: string;
  /** Lifecycle label, e.g. "Draft". */
  status?: string;
  /** Autosave line, e.g. "Saved 2m ago" — quiet, always-visible feedback. */
  saved?: string;
  onShare?: () => void;
  onPublish?: () => void;
  /** Extra controls appended to the left cluster. */
  left?: React.ReactNode;
}

export function EditorToolbar({title='Untitled proposal',status='Draft',saved='Saved',onShare,onPublish,left,style,...rest}:EditorToolbarProps){
  return (
    <header {...rest} style={{position:'relative',zIndex:30,display:'flex',alignItems:'center',gap:16,height:58,padding:'0 16px 0 14px',
      borderBottom:'1px solid var(--border-hairline)',background:'var(--glass-quiet)',
      backdropFilter:'var(--blur-glass)',WebkitBackdropFilter:'var(--blur-glass)',fontFamily:'var(--font-sans)',...style}}>
      <div style={{display:'flex',alignItems:'center',gap:4}}>
        <IconButton icon="arrow-left" label="Back to proposals"/>
        <IconButton icon="undo-2" label="Undo"/>
        <IconButton icon="redo-2" label="Redo"/>
        <span style={{width:1,height:20,background:'var(--border-hairline)',margin:'0 6px'}}/>
        <IconButton icon="plus" label="Add section"/>
        <IconButton icon="palette" label="Brand style"/>
        {left}
      </div>
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',gap:10,minWidth:0}}>
        <span style={{fontSize:'var(--text-body)',fontWeight:'var(--weight-medium)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{title}</span>
        <span style={{display:'inline-flex',alignItems:'center',gap:6,fontSize:'var(--text-xs)',color:'var(--text-muted)',whiteSpace:'nowrap'}}>
          <Icon name="check" size={12}/>{saved}
        </span>
      </div>
      <div style={{display:'flex',alignItems:'center',gap:8}}>
        <Button variant="ghost" size="sm" icon="eye">Preview</Button>
        <Button variant="secondary" size="sm" icon="link" onClick={onShare}>Share</Button>
        <Button variant="primary" size="sm" onClick={onPublish}>Publish</Button>
      </div>
    </header>
  );
}
