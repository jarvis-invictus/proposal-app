'use client';
import * as React from 'react';
import { Icon } from '../ui/Icon';

/**
 * "Start here" tile sitting directly under the dashboard title — Create with AI, Start from template, Import.
 */
export interface EntryCardProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  title?: string;
  description?: string;
  icon?: string;
  /** Ink-filled treatment. Exactly one of the row may be primary. */
  primary?: boolean;
}

export function EntryCard({title,description,icon='sparkles',primary=false,onClick,className='',style,...rest}:EntryCardProps){
  const [hover,setHover]=React.useState(false);
  const [press,setPress]=React.useState(false);
  return (
    <button type="button" onClick={onClick} {...rest} className={('liquid liquid-hover '+className).trim()}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>{setHover(false);setPress(false);}}
      onMouseDown={()=>setPress(true)} onMouseUp={()=>setPress(false)}
      style={{position:'relative',overflow:'hidden',display:'flex',flexDirection:'column',alignItems:'flex-start',gap:10,
        padding:'18px 18px 20px',textAlign:'left',borderRadius:'var(--radius-card)',cursor:'pointer',fontFamily:'var(--font-sans)',
        ...(primary?{background:'var(--gradient-feature)'}:{}),
        borderColor:primary?'var(--brand)':undefined,
        color:primary?'var(--brand-ink)':'var(--text-primary)',
        boxShadow:hover?(primary?'var(--shadow-brand-lg)':'var(--shadow-brand)'):'none',
        transform:press?'scale(var(--press-scale))':hover?'translateY(-3px)':'none',
        transition:'transform var(--duration-base) var(--ease-spring),box-shadow var(--duration-base) var(--ease-standard),border-color var(--duration-base) var(--ease-standard)',
        ...style}}>
      {primary&&<span aria-hidden="true" style={{position:'absolute',right:-30,top:-40,width:150,height:150,borderRadius:'50%',
        background:'radial-gradient(circle,rgba(255,255,255,0.75) 0%,rgba(255,255,255,0) 70%)',pointerEvents:'none',
        opacity:hover?1:0.6,transition:'opacity var(--duration-slow) var(--ease-standard)'}}/>}
      <span style={{position:'relative',display:'flex',alignItems:'center',justifyContent:'center',width:34,height:34,
        borderRadius:'var(--radius-pill)',background:primary?'var(--brand-22)':'var(--brand-12)',
        color:primary?'var(--brand-deep)':'var(--brand-deep)'}}>
        <Icon name={icon} size={17}/>
      </span>
      <span style={{position:'relative',fontSize:'var(--text-body-lg)',fontWeight:'var(--weight-medium)',letterSpacing:'var(--tracking-tight)'}}>{title}</span>
      {description&&<span style={{position:'relative',fontSize:'var(--text-sm)',lineHeight:'var(--leading-snug)',
        color:primary?'var(--accent-text-soft)':'var(--text-muted)'}}>{description}</span>}
    </button>
  );
}
