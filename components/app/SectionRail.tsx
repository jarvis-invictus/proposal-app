'use client';
import * as React from 'react';
import { Icon } from '../ui/Icon';

export interface RailSection { id: string; label: string; hidden?: boolean }

/**
 * Editor left rail. These are anchors into ONE continuous scrolling document — never separate pages or slides.
 * Selecting a row scrolls the canvas to that section; it does not swap the canvas.
 */
export interface SectionRailProps extends Omit<React.HTMLAttributes<HTMLElement>,'onSelect'> {
  sections?: RailSection[];
  active?: string;
  onSelect?: (id: string) => void;
  /** Shows the dashed "Add section" row at the bottom. */
  onAdd?: () => void;
  title?: string;
}

export function SectionRail({sections=[],active,onSelect,onAdd,title='Sections',style,...rest}:SectionRailProps){
  return (
    <aside {...rest} style={{width:'var(--rail-w)',flex:'none',display:'flex',flexDirection:'column',gap:4,
      padding:'18px 12px',borderRight:'1px solid var(--border-hairline)',background:'transparent',
      fontFamily:'var(--font-sans)',overflowY:'auto',...style}}>
      <div style={{padding:'0 10px 10px',fontSize:'var(--text-micro)',letterSpacing:'var(--tracking-caps)',
        textTransform:'uppercase',color:'var(--text-muted)',fontWeight:'var(--weight-medium)'}}>{title}</div>
      {sections.map((s,i)=><RailRow key={s.id} index={i+1} section={s} active={active===s.id} onSelect={onSelect}/>)}
      {onAdd&&<AddRow onClick={onAdd}/>}
    </aside>
  );
}

interface RailRowProps { section:RailSection; index:number; active?:boolean; onSelect?:(id:string)=>void }

function RailRow({section,index,active,onSelect}:RailRowProps){
  const [hover,setHover]=React.useState(false);
  return (
    <button type="button" onClick={()=>onSelect&&onSelect(section.id)}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{position:'relative',display:'flex',alignItems:'center',gap:10,width:'100%',padding:'10px 10px',border:'none',
        borderRadius:'var(--radius-sm)',cursor:'pointer',textAlign:'left',fontFamily:'var(--font-sans)',
        background:active?'var(--ink-06)':hover?'var(--ink-04)':'transparent',
        color:active?'var(--text-primary)':'var(--text-secondary)',fontSize:'var(--text-body)',
        fontWeight:active?'var(--weight-medium)':'var(--weight-regular)',
        transition:'background var(--duration-fast) var(--ease-standard)'}}>
      <span style={{width:18,fontSize:'var(--text-xs)',color:'var(--text-muted)',fontVariantNumeric:'tabular-nums'}}>{String(index).padStart(2,'0')}</span>
      <span style={{flex:1}}>{section.label}</span>
      {section.hidden&&<Icon name="eye-off" size={14} color="var(--text-muted)"/>}
    </button>
  );
}

interface AddRowProps { onClick:()=>void }

function AddRow({onClick}:AddRowProps){
  const [hover,setHover]=React.useState(false);
  return (
    <button type="button" onClick={onClick} onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{display:'flex',alignItems:'center',gap:10,width:'100%',marginTop:6,padding:'10px',border:'1px dashed var(--border-strong)',
        borderRadius:'var(--radius-sm)',background:hover?'var(--ink-04)':'transparent',color:'var(--text-muted)',
        fontFamily:'var(--font-sans)',fontSize:'var(--text-sm)',cursor:'pointer',
        transition:'background var(--duration-fast) var(--ease-standard)'}}>
      <Icon name="plus" size={15}/> Add section
    </button>
  );
}
