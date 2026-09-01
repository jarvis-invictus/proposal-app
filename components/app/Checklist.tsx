'use client';
import * as React from 'react';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';

export interface ChecklistItem {
  id: string;
  label: string;
  icon: string;
  hint?: string;
}

export interface ChecklistRowProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  item: ChecklistItem;
  done?: boolean;
}

/** One task. Dims and strikes through when done, and stays clickable so it can be revisited. */
export function ChecklistRow({item,done,onClick,style,...rest}:ChecklistRowProps){
  const [hover,setHover]=React.useState(false);
  return (
    <button type="button" onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)} {...rest}
      style={{display:'flex',alignItems:'center',gap:11,padding:'13px 15px',textAlign:'left',
        borderRadius:'var(--radius-card)',cursor:'pointer',fontFamily:'var(--font-sans)',
        border:'1px solid '+(hover?'var(--brand)':'var(--border-hairline)'),
        background:hover?'var(--glass-card-hover)':'transparent',
        opacity:done?0.6:1,transform:hover?'translateY(-2px)':'none',
        boxShadow:hover?'var(--shadow-brand)':'none',
        transition:'all var(--duration-base) var(--ease-spring)',...style}}>
      <span style={{display:'flex',alignItems:'center',justifyContent:'center',width:28,height:28,flex:'none',
        borderRadius:'var(--radius-pill)',background:done?'var(--brand-deep)':'var(--brand-12)',
        color:done?'var(--text-inverse)':'var(--brand-deep)',
        transition:'background var(--duration-base) var(--ease-standard)'}}>
        <Icon name={done?'check':item.icon} size={15}/>
      </span>
      <span style={{minWidth:0}}>
        <span style={{display:'block',fontSize:'var(--text-body)',fontWeight:500,
          textDecoration:done?'line-through':'none'}}>{item.label}</span>
        {item.hint&&<span style={{display:'block',fontSize:'var(--text-xs)',color:'var(--text-muted)'}}>{item.hint}</span>}
      </span>
    </button>
  );
}

/**
 * The onboarding "Finish setting up" checklist on a new account.
 * @startingPoint section="App" subtitle="Onboarding setup checklist with progress" viewport="820x200"
 */
export interface ChecklistProps extends Omit<React.HTMLAttributes<HTMLElement>,'onSelect'> {
  title?: string;
  items?: ChecklistItem[];
  /** Ids of completed tasks. */
  done?: string[];
  onSelect?: (item: ChecklistItem) => void;
  /** Supply to render the dismiss button. */
  onDismiss?: () => void;
}

export function Checklist({
  title='Finish setting up',items=[],done=[],onSelect,onDismiss,style,...rest
}:ChecklistProps){
  const complete=items.filter(i=>done.includes(i.id)).length;
  return (
    <section className="fade-up" {...rest}
      style={{marginBottom:26,padding:'22px 24px',borderRadius:'var(--radius-card-lg)',
        background:'var(--glass-card)',backdropFilter:'var(--blur-glass)',WebkitBackdropFilter:'var(--blur-glass)',
        border:'1px solid var(--border-glass)',...style}}>
      <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:16}}>
        <h3 style={{fontSize:'var(--text-h4)'}}>{title}</h3>
        <span style={{fontSize:'var(--text-sm)',color:'var(--text-muted)',fontVariantNumeric:'tabular-nums',
          whiteSpace:'nowrap'}}>{complete} of {items.length} done</span>
        <span style={{flex:1}}/>
        <span style={{width:120,height:4,flex:'none',borderRadius:2,background:'var(--brand-12)',overflow:'hidden'}}>
          <span style={{display:'block',height:'100%',width:(items.length?complete/items.length*100:0)+'%',
            background:'linear-gradient(90deg,var(--brand) 0%,var(--brand-deep) 100%)',
            transition:'width var(--duration-slow) var(--ease-out-soft)'}}/>
        </span>
        {onDismiss&&<IconButton icon="x" size="sm" label="Dismiss setup checklist" onClick={onDismiss}/>}
      </div>
      <div className="stagger" style={{display:'grid',
        gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))',gap:10}}>
        {items.map(it=>(
          <ChecklistRow key={it.id} item={it} done={done.includes(it.id)}
            onClick={()=>onSelect&&onSelect(it)}/>
        ))}
      </div>
    </section>
  );
}
