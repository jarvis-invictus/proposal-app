'use client';
import * as React from 'react';
import { Logo } from '../ui/Logo';
import { Icon } from '../ui/Icon';
import { IconButton } from '../ui/IconButton';
import { MicButton } from '../ui/MicButton';

/**
 * The always-available AI assistant, docked near the bottom of the editor canvas.
 * It edits the live document in place — it never generates a new page or slide.
 */
export interface AIDockProps extends Omit<React.HTMLAttributes<HTMLDivElement>,'onChange'> {
  value?: string;
  onChange?: (e: { target: { value: string } }) => void;
  onSubmit?: () => void;
  /** Chips above the dock; clicking one fills the field. */
  suggestions?: string[];
  /** Swaps the field for a spinner + plain-language progress line with typing dots. */
  busy?: boolean;
  /** What is happening right now, e.g. "Rewriting the Packages section…". Never a bare spinner. */
  busyLabel?: string;
  /** Scope chip inside the field, e.g. "Packages" when a section is selected. */
  context?: string;
  /** Dictation state for the inline mic. */
  listening?: boolean;
  onToggleMic?: () => void;
  placeholder?: string;
}

export function AIDock({value,onChange,onSubmit,suggestions=[],busy=false,busyLabel='Rewriting the Packages section…',context,listening,onToggleMic,placeholder="Ask for a change — “make this package sound more premium”",style,...rest}:AIDockProps){
  const [focus,setFocus]=React.useState(false);
  return (
    <div {...rest} style={{position:'absolute',left:'50%',bottom:24,transform:'translateX(-50%)',width:'min(720px,calc(100% - 48px))',
      display:'flex',flexDirection:'column',gap:10,zIndex:25,fontFamily:'var(--font-sans)',...style}}>
      {suggestions.length>0&&!busy&&(
        <div className="stagger" style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap'}}>
          {suggestions.map(s=><Suggestion key={s} onClick={()=>onChange&&onChange({target:{value:s}})}>{s}</Suggestion>)}
        </div>
      )}
      <div className="liquid liquid-strong" style={{display:'flex',alignItems:'center',gap:10,padding:'8px 8px 8px 14px',
        borderRadius:'var(--radius-pill)',
        borderColor:focus?'var(--brand)':'var(--brand-38)',
        boxShadow:focus?'var(--shadow-brand-lg)':'var(--shadow-brand)'}}>
        {busy?<Icon name="loader-circle" size={20} color="var(--brand-deep)" style={{animation:'spin 900ms linear infinite'}}/>
             :<Logo size={20} style={{opacity:0.92}}/>}
        {busy?(
          <span style={{flex:1,display:'flex',alignItems:'center',gap:8,fontSize:'var(--text-body)',color:'var(--brand-ink)'}}>
            {busyLabel}
            <span style={{display:'inline-flex',gap:3,alignItems:'center'}}>
              {[0,1,2].map(i=><span key={i} style={{width:4,height:4,borderRadius:'50%',background:'var(--brand-deep)',
                animation:'dot-bounce 1.2s '+(i*160)+'ms infinite ease-in-out'}}/>)}
            </span>
          </span>
        ):(
          <>
            {context&&<span style={{padding:'4px 10px',borderRadius:'var(--radius-pill)',background:'var(--brand-22)',
              border:'1px solid var(--brand-38)',fontSize:'var(--text-xs)',color:'var(--brand-ink)',whiteSpace:'nowrap'}}>{context}</span>}
            <input value={value} onChange={onChange} placeholder={placeholder}
              onFocus={()=>setFocus(true)} onBlur={()=>setFocus(false)}
              onKeyDown={e=>{if(e.key==='Enter'&&onSubmit)onSubmit();}}
              style={{flex:1,minWidth:0,border:'none',outline:'none',background:'transparent',fontFamily:'var(--font-sans)',
                fontSize:'var(--text-body)',color:'var(--text-primary)'}}/>
            <MicButton on={listening} onClick={onToggleMic} size={32}/>
            <IconButton icon="arrow-up" variant="solid" label="Send request" onClick={onSubmit}/>
          </>
        )}
      </div>
    </div>
  );
}

interface SuggestionProps { children:React.ReactNode; onClick?:()=>void }

function Suggestion({children,onClick}:SuggestionProps){
  const [hover,setHover]=React.useState(false);
  return (
    <button type="button" onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{padding:'7px 13px',borderRadius:'var(--radius-pill)',
        border:'1px solid '+(hover?'var(--brand)':'var(--brand-38)'),
        background:hover?'var(--glass-card-hover)':'var(--surface-glass-sky)',
        backdropFilter:'var(--blur-glass)',WebkitBackdropFilter:'var(--blur-glass)',
        color:hover?'var(--brand-ink)':'var(--text-secondary)',fontFamily:'var(--font-sans)',fontSize:'var(--text-sm)',cursor:'pointer',
        transform:hover?'var(--hover-lift)':'none',boxShadow:hover?'var(--shadow-brand)':'none',
        transition:'all var(--duration-base) var(--ease-standard)'}}>{children}</button>
  );
}
