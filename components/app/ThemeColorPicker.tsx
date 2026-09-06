'use client';
import * as React from 'react';
import { Icon } from '../ui/Icon';
import { normalise, deriveRoles, textOn, paperContrast, shadesOf, type ThemeRoles } from '@/lib/color';

export type { ThemeRoles };
export { deriveRoles, textOn, paperContrast };

const KIT=[{hex:'#171717',label:'Ink'},{hex:'#3d4451',label:'Slate'},{hex:'#7cbcdc',label:'Sky'},{hex:'#2f7fbf',label:'Sky deep'}];

/**
 * Per-proposal accent override, opened from a colour chip in the editor toolbar.
 * This is NOT how brand colour is set — the Brand Kit owns that. This is the fine-tune
 * for one document, and its job is to make the override legible and reversible.
 * @startingPoint section="App" subtitle="Toolbar chip + glass override popover" viewport="700x520"
 */
export interface ThemeColorPickerProps extends Omit<React.HTMLAttributes<HTMLDivElement>,'onChange'> {
  /** Controlled accent hex. Omit to let the component hold its own. */
  value?: string;
  /** The brand kit's accent. Anything else reads as an override. */
  brandColor?: string;
  /** Swatches from the active brand kit. */
  kit?: Array<{ hex: string; label: string }>;
  /** Recently used hexes across proposals. */
  recent?: string[];
  /** Which edge the popover aligns to. */
  align?: 'left' | 'right';
  /** Fires on commit only — hover previews stay inside the popover. */
  onChange?: (roles: ThemeRoles) => void;
  /** Back to the brand kit colour. Falls back to onChange when omitted. */
  onReset?: () => void;
  /** Promote a good override into the saved kit. Only offered once overridden. */
  onSaveToKit?: (roles: ThemeRoles) => void;
}

type CustomRoles = { deep?: string; tint?: string } | null;

export function ThemeColorPicker({
  value,brandColor='#171717',kit=KIT,recent=['#2f7fbf','#7cbcdc','#4a5d3a'],
  align='left',onChange,onReset,onSaveToKit,style,...rest
}:ThemeColorPickerProps){
  const [open,setOpen]=React.useState(false);
  const [inner,setInner]=React.useState(value||brandColor);
  const accent=value||inner;
  const [custom,setCustom]=React.useState<CustomRoles>(null);
  const [adjust,setAdjust]=React.useState(false);
  const [draft,setDraft]=React.useState(accent);
  const [peek,setPeek]=React.useState<string|null>(null);
  const [saved,setSaved]=React.useState(false);
  const wrap=React.useRef<HTMLDivElement>(null);

  const roles={...deriveRoles(accent),...(custom||{})};
  const overridden=accent.toLowerCase()!==brandColor.toLowerCase()||!!custom;
  const shown=peek||accent;
  const shownRoles=peek?deriveRoles(peek):roles;
  const check=paperContrast(shown);

  const commit=(hex?:string,nextCustom?:CustomRoles)=>{
    const c=normalise(hex);if(!c)return;
    if(value===undefined)setInner(c);
    setDraft(c);setPeek(null);setSaved(false);
    if(nextCustom!==undefined)setCustom(nextCustom);
    onChange&&onChange({accent:c,...{...deriveRoles(c),...(nextCustom!==undefined?nextCustom||{}:custom||{})}});
  };
  const reset=()=>{setCustom(null);setAdjust(false);setSaved(false);
    if(value===undefined)setInner(brandColor);
    setDraft(brandColor);onReset?onReset():onChange&&onChange({accent:brandColor,...deriveRoles(brandColor)});};

  React.useEffect(()=>{if(!open)return;
    const away=(e:MouseEvent)=>{if(wrap.current&&!wrap.current.contains(e.target as Node))setOpen(false);};
    const esc=(e:KeyboardEvent)=>{if(e.key==='Escape')setOpen(false);};
    document.addEventListener('mousedown',away);document.addEventListener('keydown',esc);
    return()=>{document.removeEventListener('mousedown',away);document.removeEventListener('keydown',esc);};},[open]);
  React.useEffect(()=>{setDraft(accent);},[accent]);

  return (
    <div ref={wrap} {...rest} style={{position:'relative',display:'inline-flex',fontFamily:'var(--font-sans)',...style}}>
      <Trigger color={accent} overridden={overridden} open={open} onClick={()=>setOpen(o=>!o)}/>
      {open&&(
        <div className="liquid liquid-strong" style={{position:'absolute',top:'calc(100% + 8px)',zIndex:60,width:258,
          [align==='right'?'right':'left']:0,borderRadius:'var(--radius-card)',borderColor:'var(--brand-38)',
          background:'var(--glass-panel)',boxShadow:'var(--shadow-modal)',
          animation:'fade-up var(--duration-base) var(--ease-out-soft) both'}}>
          <div style={{position:'relative',zIndex:1,padding:12,display:'flex',flexDirection:'column',gap:9}}>

            <div style={{display:'flex',alignItems:'center',gap:8,height:18}}>
              <span className="eyebrow">Theme color</span>
              <span style={{flex:1}}/>
              {overridden
                ?<span style={{display:'inline-flex',alignItems:'center',gap:5,padding:'2px 7px',borderRadius:'var(--radius-pill)',
                    background:'var(--brand-12)',border:'1px solid var(--brand-38)',color:'var(--brand-ink)',
                    fontSize:'var(--text-micro)',fontWeight:'var(--weight-medium)',whiteSpace:'nowrap'}}>
                    <span style={{width:5,height:5,borderRadius:'50%',background:'var(--brand-deep)'}}/>Overridden</span>
                :<span style={{fontSize:'var(--text-micro)',color:'var(--text-muted)'}}>From brand kit</span>}
            </div>

            <Row label="Kit">
              {kit.map(k=><Swatch key={k.hex} hex={k.hex} title={k.label} on={accent===k.hex}
                onPeek={setPeek} onPick={()=>commit(k.hex,null)}/>)}
              {recent.length>0&&<span style={{width:1,height:18,alignSelf:'center',background:'var(--border-hairline)',margin:'0 1px'}}/>}
              {recent.slice(0,4).map(h=><Swatch key={h} hex={h} title={'Recent '+h} round on={accent===h}
                onPeek={setPeek} onPick={()=>commit(h,null)}/>)}
            </Row>

            <Row label="Shades">
              <Ramp colors={shadesOf(accent)} current={accent} onPeek={setPeek} onPick={h=>commit(h,null)}/>
            </Row>

            <HexField value={draft} onInput={setDraft} onCommit={()=>commit(draft,null)} check={check}/>
            <ContrastWarning check={check}/>

            <div style={{display:'flex',alignItems:'center',gap:7}}>
              <span style={{fontSize:'var(--text-micro)',letterSpacing:'var(--tracking-caps)',textTransform:'uppercase',
                color:'var(--text-muted)',width:46,flex:'none'}}>Roles</span>
              <div style={{flex:1,display:'flex',height:18,borderRadius:'var(--radius-xs)',overflow:'hidden',
                border:'1px solid var(--ink-16)'}}>
                {[shown,shownRoles.deep,shownRoles.tint].map((h,i)=>
                  <span key={i} title={['Accent','Deep','Surface'][i]+' '+h} style={{flex:1,background:h}}/>)}
              </div>
              <button type="button" onClick={()=>setAdjust(a=>!a)}
                style={{border:'none',background:'transparent',padding:0,cursor:'pointer',fontFamily:'var(--font-sans)',
                  fontSize:'var(--text-micro)',fontWeight:'var(--weight-medium)',color:'var(--brand-deep)',flex:'none'}}>
                {adjust?'Done':'Adjust'}</button>
            </div>

            {adjust&&(
              <div style={{display:'flex',gap:6,paddingLeft:53,animation:'fade-up var(--duration-fast) var(--ease-out-soft) both'}}>
                <RoleField label="Deep" hex={shownRoles.deep}
                  onCommit={v=>{const c=normalise(v);if(c)commit(accent,{...(custom||{}),deep:c});}}/>
                <RoleField label="Surface" hex={shownRoles.tint}
                  onCommit={v=>{const c=normalise(v);if(c)commit(accent,{...(custom||{}),tint:c});}}/>
              </div>
            )}

            <MiniPreview accent={shown} roles={shownRoles}/>

            {overridden
              ?<div style={{display:'flex',alignItems:'center',gap:6}}>
                 <button type="button" onClick={reset}
                   style={{display:'inline-flex',alignItems:'center',gap:5,height:28,padding:'0 10px',flex:'none',
                     borderRadius:'var(--radius-pill)',border:'1px solid transparent',background:'transparent',cursor:'pointer',
                     fontFamily:'var(--font-sans)',fontSize:'var(--text-xs)',color:'var(--text-secondary)'}}>
                   <Icon name="rotate-ccw" size={12}/>Reset</button>
                 <span style={{flex:1}}/>
                 <button type="button" onClick={()=>{setSaved(true);onSaveToKit&&onSaveToKit({accent,...roles});}}
                   style={{display:'inline-flex',alignItems:'center',gap:5,height:28,padding:'0 12px',flex:'none',
                     borderRadius:'var(--radius-pill)',border:'1px solid var(--brand)',background:'var(--brand-tint)',
                     color:'var(--brand-ink)',cursor:'pointer',fontFamily:'var(--font-sans)',fontSize:'var(--text-xs)',
                     fontWeight:'var(--weight-medium)'}}>
                   <Icon name={saved?'check':'palette'} size={12}/>{saved?'Saved to kit':'Save to kit'}</button>
               </div>
              :<div style={{fontSize:'var(--text-micro)',color:'var(--text-muted)'}}>Applies to this proposal only.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

interface TriggerProps { color:string; overridden:boolean; open:boolean; onClick:()=>void }

function Trigger({color,overridden,open,onClick}:TriggerProps){
  const [hover,setHover]=React.useState(false);
  return (
    <button type="button" aria-label="Theme color" aria-expanded={open} onClick={onClick}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{position:'relative',width:34,height:34,display:'inline-flex',alignItems:'center',justifyContent:'center',
        borderRadius:'var(--radius-pill)',border:'1px solid transparent',cursor:'pointer',
        background:open?'var(--brand-22)':hover?'var(--brand-12)':'transparent',
        transition:'background var(--duration-base) var(--ease-standard),transform var(--duration-base) var(--ease-spring)',
        transform:hover&&!open?'translateY(-1px)':'none'}}>
      <span style={{width:16,height:16,borderRadius:'50%',background:color,
        boxShadow:'inset 0 0 0 1px var(--ink-16),inset 0 1px 0 var(--glass-specular-soft)'}}/>
      {overridden&&<span aria-hidden="true" style={{position:'absolute',inset:2,borderRadius:'50%',
        border:'2px dotted var(--brand-deep)'}}/>}
    </button>
  );
}

interface RowProps { label:string; children:React.ReactNode }

/** Micro label on the left, controls on the right — keeps the popover four rows tall, not nine. */
function Row({label,children}:RowProps){
  return (
    <div style={{display:'flex',alignItems:'center',gap:7}}>
      <span style={{fontSize:'var(--text-micro)',letterSpacing:'var(--tracking-caps)',textTransform:'uppercase',
        color:'var(--text-muted)',width:46,flex:'none'}}>{label}</span>
      <div style={{flex:1,minWidth:0,display:'flex',alignItems:'center',gap:6}}>{children}</div>
    </div>
  );
}

interface SwatchProps { hex:string; title:string; round?:boolean; on:boolean; onPick:()=>void; onPeek:(hex:string|null)=>void }

function Swatch({hex,title,round,on,onPick,onPeek}:SwatchProps){
  const [hover,setHover]=React.useState(false);
  return (
    <button type="button" title={title} aria-label={title} onClick={onPick}
      onMouseEnter={()=>{setHover(true);onPeek&&onPeek(hex);}} onMouseLeave={()=>{setHover(false);onPeek&&onPeek(null);}}
      style={{width:20,height:20,padding:0,flex:'none',borderRadius:round?'50%':'var(--radius-xs)',background:hex,cursor:'pointer',
        border:'1px solid var(--ink-16)',
        boxShadow:on?'0 0 0 1.5px var(--surface-card),0 0 0 3px var(--brand-deep)':hover?'0 0 0 1.5px var(--surface-card),0 0 0 2.5px var(--brand-38)':'none',
        transition:'box-shadow var(--duration-fast) var(--ease-standard)'}}/>
  );
}

interface RampProps { colors:string[]; current:string; onPick:(h:string)=>void; onPeek:(hex:string|null)=>void }

/** The tint/shade ramp as one seamless bar — a scale, not six loose chips. */
function Ramp({colors,current,onPick,onPeek}:RampProps){
  return (
    <div style={{flex:1,display:'flex',height:20,borderRadius:'var(--radius-xs)',overflow:'hidden',border:'1px solid var(--ink-16)'}}>
      {colors.map(h=>(
        <button key={h} type="button" title={h} aria-label={h} onClick={()=>onPick(h)}
          onMouseEnter={()=>onPeek&&onPeek(h)} onMouseLeave={()=>onPeek&&onPeek(null)}
          style={{flex:1,padding:0,border:'none',background:h,cursor:'pointer',
            boxShadow:current===h?'inset 0 0 0 2px var(--surface-card)':'none',
            transition:'box-shadow var(--duration-fast) var(--ease-standard)'}}/>
      ))}
    </div>
  );
}

interface HexFieldProps { value:string; onInput:(v:string)=>void; onCommit:()=>void; check:{r:number;tone:'good'|'warn';icon:string;text:string} }

/** Hex entry and the white-paper contrast read, in one row. */
function HexField({value,onInput,onCommit,check}:HexFieldProps){
  const [focus,setFocus]=React.useState(false);
  const ok=!!normalise(value);
  const warn=check.tone==='warn';
  return (
    <div style={{display:'flex',alignItems:'center',gap:7}}>
      <span style={{fontSize:'var(--text-micro)',letterSpacing:'var(--tracking-caps)',textTransform:'uppercase',
        color:'var(--text-muted)',width:46,flex:'none'}}>Hex</span>
      {/* ring-owner (see globals.css): this label draws the ring itself from `focus` state below
          — without the class, the input's own :focus-visible fallback stacked a second box. */}
      <label className="ring-owner" style={{flex:1,minWidth:0,display:'flex',alignItems:'center',gap:6,height:28,padding:'0 9px',
        borderRadius:'var(--radius-sm)',background:'var(--surface-card)',cursor:'text',
        border:'1px solid '+(focus?'var(--brand)':ok?'var(--border-hairline)':'var(--status-caution-border)'),
        boxShadow:focus?'0 0 0 3px var(--brand-22)':'none',
        transition:'border-color var(--duration-base) var(--ease-standard),box-shadow var(--duration-base) var(--ease-standard)'}}>
        <span style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-xs)',color:'var(--text-muted)'}}>#</span>
        <input value={String(value||'').replace(/^#/,'')} spellCheck="false" maxLength={6}
          onChange={e=>onInput('#'+e.target.value)} onFocus={()=>setFocus(true)}
          onBlur={()=>{setFocus(false);onCommit();}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();e.currentTarget.blur();}}}
          style={{flex:1,minWidth:0,border:'none',outline:'none',background:'transparent',
            fontFamily:'var(--font-mono)',fontSize:'var(--text-xs)',letterSpacing:'0.04em',color:'var(--text-primary)'}}/>
        <span title={check.text} style={{display:'inline-flex',alignItems:'center',gap:4,flex:'none'}}>
          <Icon name={check.icon} size={12} color={warn?'var(--status-caution)':'var(--brand-deep)'}/>
          <span style={{fontFamily:'var(--font-mono)',fontSize:'var(--text-micro)',
            color:warn?'var(--status-caution-text)':'var(--text-muted)'}}>{check.r.toFixed(1)}</span>
        </span>
      </label>
    </div>
  );
}

interface ContrastWarningProps { check:{tone:'good'|'warn';text:string} }

/** The guardrail only speaks up when it has bad news. */
function ContrastWarning({check}:ContrastWarningProps){
  if(check.tone!=='warn')return null;
  return (
    <div style={{display:'flex',alignItems:'flex-start',gap:6,marginTop:-2,marginLeft:53,padding:'6px 8px',
      borderRadius:'var(--radius-xs)',background:'var(--status-caution-surface)',
      border:'1px solid var(--status-caution-border)',
      fontSize:'var(--text-micro)',lineHeight:'var(--leading-snug)',color:'var(--status-caution-text)',
      animation:'fade-up var(--duration-fast) var(--ease-out-soft) both'}}>
      <Icon name="triangle-alert" size={11} color="var(--status-caution)" style={{marginTop:1,flex:'none'}}/>
      <span>{check.text}</span>
    </div>
  );
}

interface RoleFieldProps { label:string; hex:string; onCommit:(v:string)=>void }

function RoleField({label,hex,onCommit}:RoleFieldProps){
  const [draft,setDraft]=React.useState(hex);
  React.useEffect(()=>{setDraft(hex);},[hex]);
  return (
    <label style={{flex:1,minWidth:0,display:'flex',alignItems:'center',gap:5,height:24,padding:'0 7px',
      borderRadius:'var(--radius-xs)',background:'var(--surface-card)',border:'1px solid var(--border-hairline)'}}>
      <span style={{fontSize:'var(--text-micro)',color:'var(--text-muted)',flex:'none'}}>{label}</span>
      <input value={draft} spellCheck="false" onChange={e=>setDraft(e.target.value)}
        onBlur={()=>onCommit&&onCommit(draft)} onKeyDown={e=>{if(e.key==='Enter')e.currentTarget.blur();}}
        style={{flex:1,minWidth:0,border:'none',outline:'none',background:'transparent',
          fontFamily:'var(--font-mono)',fontSize:'var(--text-micro)',color:'var(--text-primary)'}}/>
    </label>
  );
}

interface MiniPreviewProps { accent:string; roles:{deep:string;tint:string} }

/** A fragment of the proposal, opaque like the real canvas — never glass. */
function MiniPreview({accent,roles}:MiniPreviewProps){
  const fg=textOn(accent);
  return (
    <div style={{display:'flex',alignItems:'center',gap:9,padding:'8px 10px',borderRadius:'var(--radius-sm)',
      background:'#ffffff',border:'1px solid var(--border-hairline)'}}>
      <span style={{width:3,height:26,flex:'none',borderRadius:2,background:accent}}/>
      <span style={{flex:1,minWidth:0,display:'flex',flexDirection:'column',gap:3}}>
        <span style={{fontSize:'var(--text-micro)',letterSpacing:'var(--tracking-caps)',textTransform:'uppercase',
          color:roles.deep,fontWeight:'var(--weight-medium)'}}>Packages</span>
        <span style={{fontSize:11.5,color:'#171717',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>Design retainer — Q3</span>
      </span>
      <span style={{padding:'3px 10px',flex:'none',borderRadius:'var(--radius-pill)',background:accent,color:fg,
        fontSize:'var(--text-micro)',fontWeight:'var(--weight-medium)'}}>Accept</span>
    </div>
  );
}

/** Colour maths behind the picker, reachable from consuming projects. */
export const ThemeColor={deriveRoles,textOn,paperContrast};
