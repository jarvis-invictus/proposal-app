'use client';
import * as React from 'react';
import { Icon } from '../ui/Icon';

/**
 * Counts a number up when it first appears. Bundled here so StatStrip is self-contained.
 * Returns `target` immediately under `prefers-reduced-motion`, in a hidden tab, or wherever
 * `requestAnimationFrame` cannot run — correctness beats the animation.
 */
export function useCountUp(target:number,duration=900):number{
  const reduce=typeof window!=='undefined'&&window.matchMedia
    &&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const skip=reduce||(typeof document!=='undefined'&&document.hidden);
  const [n,setN]=React.useState(skip?target:0);
  React.useEffect(()=>{
    // A tile showing the wrong figure is worse than one that doesn't animate: when motion is
    // unwanted or rAF won't run (hidden tab, print capture), land on the real number immediately.
    if(skip||typeof requestAnimationFrame!=='function'){setN(target);return;}
    let raf:number,start:number,settled=false;
    const step=(t:number)=>{
      if(!start)start=t;
      const p=Math.min((t-start)/duration,1);
      setN(Math.round(target*(1-Math.pow(1-p,3))));
      if(p<1)raf=requestAnimationFrame(step);else settled=true;
    };
    raf=requestAnimationFrame(step);
    // Safety net: if rAF is throttled and never delivers a frame, don't sit on a partial value.
    const failsafe=setTimeout(()=>{if(!settled)setN(target);},duration+400);
    return()=>{cancelAnimationFrame(raf);clearTimeout(failsafe);};
  },[target,duration,skip]);
  return n;
}

/** Capital-initial handle for the hook, reachable from consuming projects. */
export const CountUp={useCountUp};

const DEFAULT=[
  {key:'total',label:'Proposals',icon:'file-text'},
  {key:'open',label:'Waiting on a client',icon:'clock'},
  {key:'won',label:'Accepted this quarter',icon:'circle-check-big'}
];

interface TileProps { label:string; value:number; icon:string }

function Tile({label,value,icon}:TileProps){
  const n=useCountUp(value);
  return (
    <div style={{display:'flex',alignItems:'center',gap:12,padding:'14px 18px',borderRadius:'var(--radius-card)',
      background:'var(--glass-card)',backdropFilter:'var(--blur-glass)',WebkitBackdropFilter:'var(--blur-glass)',
      border:'1px solid var(--border-glass)'}}>
      <span style={{display:'flex',alignItems:'center',justifyContent:'center',width:32,height:32,flex:'none',
        borderRadius:'var(--radius-pill)',background:'var(--brand-12)',color:'var(--brand-deep)'}}>
        <Icon name={icon} size={16}/></span>
      <span style={{fontSize:26,fontWeight:600,letterSpacing:'-0.02em',fontVariantNumeric:'tabular-nums',
        color:'var(--brand-ink)'}}>{n}</span>
      <span style={{minWidth:0,fontSize:'var(--text-sm)',color:'var(--text-muted)'}}>{label}</span>
    </div>
  );
}

/**
 * Dashboard quick figures. Not generic — three fixed tiles for this screen.
 * @startingPoint section="App" subtitle="Dashboard quick stats, count-up on first paint" viewport="760x120"
 */
export interface StatStripProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Values keyed by item key, e.g. { total: 6, open: 3, won: 2 }. */
  counts?: Record<string, number>;
  /** Override the three defaults if a screen needs different figures. */
  items?: Array<{ key: string; label: string; icon: string }>;
}

export function StatStrip({counts={},items=DEFAULT,style,...rest}:StatStripProps){
  return (
    <div className="stagger" {...rest}
      style={{display:'grid',gridTemplateColumns:'repeat('+items.length+',minmax(0,1fr))',gap:14,marginBottom:16,...style}}>
      {items.map(it=><Tile key={it.key} label={it.label} icon={it.icon} value={counts[it.key]||0}/>)}
    </div>
  );
}
