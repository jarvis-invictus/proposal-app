'use client';
import * as React from 'react';
import { Icon } from '../ui/Icon';
import { Logo } from '../ui/Logo';

export interface NavItem { id: string; label: string; icon: string; count?: number }

/** Thin app sidebar: three core destinations at the top, utility links demoted below a divider at the bottom. */
export interface SidebarNavProps extends Omit<React.HTMLAttributes<HTMLElement>,'onSelect'> {
  /** Wordmark text beside the mark. */
  brand?: string;
  /** Core destinations. Keep to three. */
  items?: NavItem[];
  /** Settings/help/account — rendered smaller and muted under a hairline. */
  utility?: NavItem[];
  active?: string;
  onSelect?: (id: string) => void;
  footer?: React.ReactNode;
  /** Icon-only rail at 72px. Labels become tooltips; the active pill keeps sliding. */
  collapsed?: boolean;
  /** Supplying this renders the collapse chevron. */
  onToggleCollapse?: () => void;
}

export function SidebarNav({brand='Marg',items=[],utility=[],active,onSelect,footer,collapsed=false,onToggleCollapse,style,...rest}:SidebarNavProps){
  const listRef=React.useRef<HTMLDivElement>(null);
  const rowRefs=React.useRef<Record<string,HTMLButtonElement|null>>({});
  const [ind,setInd]=React.useState<{top:number;height:number}|null>(null);

  React.useLayoutEffect(()=>{
    const el=active?rowRefs.current[active]:null,box=listRef.current;
    if(el&&box){const r=el.getBoundingClientRect(),b=box.getBoundingClientRect();setInd({top:r.top-b.top,height:r.height});}
    else setInd(null);
  },[active,items]);

  return (
    <nav {...rest} style={{position:'relative',width:collapsed?'72px':'var(--sidebar-w)',flex:'none',display:'flex',flexDirection:'column',
      padding:collapsed?'22px 10px 18px':'22px 14px 18px',borderRight:'1px solid var(--brand-38)',background:'var(--surface-sidebar)',
      fontFamily:'var(--font-sans)',overflow:'hidden',
      transition:'width var(--duration-slow) var(--ease-out-soft),padding var(--duration-slow) var(--ease-out-soft)',...style}}>
      <div style={{padding:collapsed?'0 0 22px':'0 10px 22px',display:'flex',justifyContent:collapsed?'center':'flex-start'}}>
        <Logo size={22} wordmark={!collapsed} label={brand}/>
      </div>
      {onToggleCollapse&&(
        <button type="button" onClick={onToggleCollapse} aria-label={collapsed?'Expand sidebar':'Collapse sidebar'}
          style={{position:'absolute',top:24,right:collapsed?'50%':10,transform:collapsed?'translateX(50%) translateY(30px)':'none',
            width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',borderRadius:'var(--radius-pill)',
            border:'1px solid var(--brand-38)',background:'var(--glass-nav-active)',color:'var(--brand-deep)',cursor:'pointer',
            transition:'all var(--duration-slow) var(--ease-out-soft)'}}>
          <Icon name={collapsed?'chevrons-right':'chevrons-left'} size={13}/>
        </button>
      )}
      <div ref={listRef} style={{position:'relative',display:'flex',flexDirection:'column',gap:2}}>
        {ind&&<span aria-hidden="true" style={{position:'absolute',left:0,right:0,top:ind.top,height:ind.height,
          borderRadius:'var(--radius-sm)',background:'var(--glass-nav-active)',border:'1px solid var(--brand-38)',
          boxShadow:'var(--shadow-hover)',
          transition:'top var(--duration-slow) var(--ease-spring),height var(--duration-base) var(--ease-standard)'}}/>}
        {items.map(it=><NavRow key={it.id} item={it} active={active===it.id} onSelect={onSelect} collapsed={collapsed}
          innerRef={el=>{rowRefs.current[it.id]=el;}}/>)}
      </div>
      <div style={{flex:1}}/>
      {utility.length>0&&(
        <div style={{position:'relative',display:'flex',flexDirection:'column',gap:2,paddingTop:14,borderTop:'1px solid var(--brand-38)'}}>
          {utility.map(it=><NavRow key={it.id} item={it} muted active={active===it.id} onSelect={onSelect} collapsed={collapsed}
            innerRef={el=>{rowRefs.current[it.id]=el;}}/>)}
        </div>
      )}
      {footer}
    </nav>
  );
}

interface NavRowProps {
  item:NavItem;
  active?:boolean;
  muted?:boolean;
  onSelect?:(id:string)=>void;
  innerRef:(el:HTMLButtonElement|null)=>void;
  collapsed?:boolean;
}

function NavRow({item,active,muted,onSelect,innerRef,collapsed}:NavRowProps){
  const [hover,setHover]=React.useState(false);
  return (
    <button type="button" ref={innerRef} onClick={()=>onSelect&&onSelect(item.id)} title={collapsed?item.label:undefined}
      onMouseEnter={()=>setHover(true)} onMouseLeave={()=>setHover(false)}
      style={{position:'relative',display:'flex',alignItems:'center',justifyContent:collapsed?'center':'flex-start',
        gap:10,width:'100%',padding:collapsed?'11px 0':'9px 10px',border:'none',
        borderRadius:'var(--radius-sm)',cursor:'pointer',textAlign:'left',fontFamily:'var(--font-sans)',
        background:!active&&hover?'var(--glass-nav-hover)':'transparent',
        color:active?'var(--brand-ink)':muted?'var(--text-muted)':'var(--text-secondary)',
        fontSize:muted?'var(--text-sm)':'var(--text-body)',fontWeight:active?'var(--weight-medium)':'var(--weight-regular)',
        transition:'background var(--duration-fast) var(--ease-standard),color var(--duration-base) var(--ease-standard)'}}>
      <Icon name={item.icon} size={muted?15:17} color={active?'var(--brand-deep)':'currentColor'}
        style={{transition:'color var(--duration-base) var(--ease-standard)'}}/>
      {!collapsed&&<span style={{flex:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{item.label}</span>}
      {!collapsed&&item.count!=null&&<span style={{fontSize:'var(--text-xs)',color:active?'var(--brand-deep)':'var(--text-muted)'}}>{item.count}</span>}
    </button>
  );
}
