import * as React from 'react';

/**
 * Marketing heading with the one-word serif accent that defines the brand's voice.
 * @startingPoint section="Site" subtitle="Heading with serif italic accent word" viewport="700x160"
 */
export interface SectionHeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  /** Full heading text. */
  children?: React.ReactNode;
  /** The single word inside the heading text to set in Instrument Serif italic. Exactly one per heading. */
  accent?: string;
  align?: 'left' | 'center';
  size?: 'display' | 'h1' | 'h2' | 'h3';
  as?: 'h1' | 'h2' | 'h3';
}

/** Renders a heading where exactly one word is set in Instrument Serif italic. */
export function SectionHeading({children,accent,align='center',size='h2',as='h2',style,...rest}:SectionHeadingProps){
  const Tag=as;
  const fs=size==='display'?'var(--text-display)':size==='h1'?'var(--text-h1)':size==='h3'?'var(--text-h3)':'var(--text-h2)';
  const parts=typeof children==='string'&&accent?splitAccent(children,accent):null;
  return (
    <Tag {...rest} style={{fontFamily:'var(--font-sans)',fontSize:fs,fontWeight:'var(--weight-semibold)',
      letterSpacing:size==='display'?'var(--tracking-display)':'var(--tracking-tight)',
      lineHeight:size==='display'?'var(--leading-display)':'var(--leading-tight)',
      textAlign:align,color:'var(--text-primary)',textWrap:'balance',margin:0,...style} as React.CSSProperties}>
      {parts?<>{parts[0]}<em style={{fontFamily:'var(--font-serif)',fontStyle:'italic',fontWeight:400,letterSpacing:0}}>{accent}</em>{parts[1]}</>:children}
    </Tag>
  );
}

function splitAccent(text:string,accent:string):[string,string]{
  const i=text.indexOf(accent);
  return i<0?[text,'']:[text.slice(0,i),text.slice(i+accent.length)];
}
