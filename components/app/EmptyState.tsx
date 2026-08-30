import * as React from 'react';
import { Icon } from '../ui/Icon';

/** Empty list placeholder. Copy must tell the user exactly what to do first, and carry one action. */
export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({icon='file-plus-2',title,description,action,style,...rest}:EmptyStateProps){
  return (
    <div {...rest} style={{display:'flex',flexDirection:'column',alignItems:'center',textAlign:'center',gap:10,
      padding:'56px 24px',borderRadius:'var(--radius-card-lg)',border:'1px dashed var(--border-strong)',
      background:'var(--surface-card)',fontFamily:'var(--font-sans)',...style}}>
      <span style={{display:'flex',alignItems:'center',justifyContent:'center',width:44,height:44,borderRadius:'var(--radius-pill)',background:'var(--ink-06)'}}>
        <Icon name={icon} size={20}/>
      </span>
      <h3 style={{fontSize:'var(--text-h4)'}}>{title}</h3>
      {description&&<p style={{maxWidth:380,fontSize:'var(--text-body)',color:'var(--text-muted)',lineHeight:'var(--leading-snug)'}}>{description}</p>}
      {action&&<div style={{marginTop:8}}>{action}</div>}
    </div>
  );
}
