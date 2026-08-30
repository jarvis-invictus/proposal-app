'use client';
import * as React from 'react';
import { Button } from '../ui/Button';
import { Logo } from '../ui/Logo';

/** Marketing top bar. Transparent — it floats over the sky hero, with glass hover states. */
export interface SiteHeaderProps extends Omit<React.HTMLAttributes<HTMLElement>,'onSelect'> {
  brand?: string;
  links?: string[];
  active?: string;
  onSelect?: (link: string) => void;
  onStart?: () => void;
}

export function SiteHeader({brand='Marg',links=['Product','Templates','Pricing'],onStart,onSelect,active,style,...rest}:SiteHeaderProps){
  return (
    <header {...rest} style={{position:'relative',zIndex:5,display:'flex',alignItems:'center',gap:28,
      padding:'20px 32px',fontFamily:'var(--font-sans)',...style}}>
      <Logo size={24} wordmark label={brand}/>
      <nav style={{display:'flex',gap:6}}>
        {links.map(l=><HeaderLink key={l} active={active===l} onClick={()=>onSelect&&onSelect(l)}>{l}</HeaderLink>)}
      </nav>
      <span style={{flex:1}}/>
      <Button variant="glass" size="sm" onClick={onStart}>Sign in</Button>
      <Button variant="primary" size="sm" iconRight="arrow-right" onClick={onStart}>Start free</Button>
    </header>
  );
}

interface HeaderLinkProps { children:React.ReactNode; active?:boolean; onClick?:()=>void }

function HeaderLink({children,active,onClick}:HeaderLinkProps){
  const [hover,setHover]=React.useState(false);
  return (
    <button type="button" onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{padding:'7px 12px',border:'none',borderRadius:'var(--radius-pill)',cursor:'pointer',
        background:hover||active?'var(--glass-nav-hover)':'transparent',color:'var(--text-primary)',
        fontFamily:'var(--font-sans)',fontSize:'var(--text-body)',
        transition:'background var(--duration-base) var(--ease-standard)'}}>{children}</button>
  );
}
