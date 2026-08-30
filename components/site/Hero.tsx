import * as React from 'react';
import { Pill } from '../ui/Pill';
import { Button } from '../ui/Button';
import { SectionHeading } from './SectionHeading';

/**
 * The marketing hero band — the ONLY surface allowed to use the Sky gradient.
 * @startingPoint section="Site" subtitle="Sky-gradient hero with pill CTA" viewport="1280x720"
 */
export interface HeroProps extends React.HTMLAttributes<HTMLElement> {
  /** Glass announcement pill above the headline. */
  announcement?: string;
  heading?: string;
  /** The single word in the heading set in serif italic. */
  accent?: string;
  subhead?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  /** Product visual anchored to the bottom of the band, e.g. the notes to package card. */
  media?: React.ReactNode;
  /** Optional photographic sky plate behind the gradient. */
  image?: string;
  onPrimary?: () => void;
  onSecondary?: () => void;
}

/** The one place the sky gradient is allowed. Everything below the hero is Page White. */
export function Hero({announcement,heading,accent,subhead,primaryLabel='Start closing deals',secondaryLabel='See how it works',media,image,onPrimary,onSecondary,style,...rest}:HeroProps){
  const bg=image
    ? 'linear-gradient(180deg,rgba(207,228,242,0.55),rgba(124,188,220,0.15)),url('+image+') center/cover no-repeat'
    : 'var(--gradient-hero)';
  return (
    <section {...rest} style={{position:'relative',overflow:'hidden',padding:'56px 32px 0',textAlign:'center',
      background:bg,borderRadius:'var(--radius-card-lg)',fontFamily:'var(--font-sans)',...style}}>
      <div style={{maxWidth:900,margin:'0 auto',display:'flex',flexDirection:'column',alignItems:'center',gap:22}}>
        {announcement&&<Pill dot className="fade-up">{announcement}</Pill>}
        <SectionHeading as="h1" size="display" accent={accent} className="fade-up">{heading}</SectionHeading>
        {subhead&&<p className="fade-up" style={{maxWidth:560,fontSize:'var(--text-body-lg)',lineHeight:'var(--leading-body)',color:'var(--text-secondary)',textWrap:'pretty'} as React.CSSProperties}>{subhead}</p>}
        <div className="fade-up" style={{display:'flex',alignItems:'center',gap:18,marginTop:4}}>
          <Button variant="primary" size="lg" iconRight="arrow-right" onClick={onPrimary}>{primaryLabel}</Button>
          <Button variant="ghost" size="lg" onClick={onSecondary}>{secondaryLabel}</Button>
        </div>
        {media&&<div className="fade-up" style={{width:'100%',marginTop:26}}>{media}</div>}
      </div>
    </section>
  );
}
