'use client';
import * as React from 'react';

/** Numbered how-it-works card. Three per row on the sky-wash band below the hero. */
export interface StepCardProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Zero-padded string, e.g. "01". */
  number?: string;
  title?: string;
  description?: string;
}

export function StepCard({number,title,description,style,...rest}:StepCardProps){
  const [hover,setHover]=React.useState(false);
  return (
    <div {...rest} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{display:'flex',flexDirection:'column',gap:14,padding:'26px 26px 30px',borderRadius:'var(--radius-card-lg)',
        background:'var(--surface-card)',border:'1px solid var(--border-hairline)',fontFamily:'var(--font-sans)',
        boxShadow:hover?'var(--shadow-hover)':'none',transform:hover?'var(--hover-lift)':'none',
        transition:'transform var(--duration-base) var(--ease-standard),box-shadow var(--duration-base) var(--ease-standard)',...style}}>
      <span style={{display:'flex',alignItems:'center',justifyContent:'center',width:38,height:38,borderRadius:'var(--radius-pill)',
        background:'var(--surface-sunken)',fontSize:'var(--text-sm)',fontWeight:'var(--weight-medium)',fontVariantNumeric:'tabular-nums'}}>{number}</span>
      <span style={{marginTop:14,fontSize:'var(--text-h4)',fontWeight:'var(--weight-semibold)',letterSpacing:'var(--tracking-tight)'}}>{title}</span>
      <span style={{fontSize:'var(--text-body)',lineHeight:'var(--leading-body)',color:'var(--text-secondary)'}}>{description}</span>
    </div>
  );
}
