'use client';
import * as React from 'react';

export interface SignaturePadProps {
  name: string;
}

/** The signature draws itself, letter by letter, on a ruled sky line. */
export function SignaturePad({ name }: SignaturePadProps) {
  /* The COMPLETE signature is the default state: a signed document must never render an empty
     signature line. The reveal only plays when frames are actually available, is driven by
     setInterval (which keeps firing in hidden tabs, unlike rAF), and is time-derived so
     re-renders mid-typing cannot reset it. */
  const [shown, setShown] = React.useState(name ? name.length : 0);
  const startRef = React.useRef<number | null>(null);

  React.useEffect(() => {
    if (!name) { startRef.current = null; setShown(0); return; }

    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const hidden = typeof document !== 'undefined' && document.hidden;
    if (reduce || hidden) { startRef.current = null; setShown(name.length); return; }

    if (startRef.current == null) startRef.current = Date.now();
    const finish = () => { startRef.current = null; setShown(name.length); };

    const id = setInterval(() => {
      if (document.hidden) { clearInterval(id); finish(); return; }
      const chars = Math.floor((Date.now() - startRef.current!) / 58);
      if (chars >= name.length) { clearInterval(id); finish(); return; }
      setShown(chars);
    }, 58);

    /* Belt and braces: however the ticks behave, the signature is whole by this point. */
    const guard = setTimeout(finish, name.length * 58 + 400);
    const onVisible = () => { if (document.hidden) { clearInterval(id); finish(); } };
    document.addEventListener('visibilitychange', onVisible);

    return () => { clearInterval(id); clearTimeout(guard); document.removeEventListener('visibilitychange', onVisible); };
  }, [name]);

  const shownClamped = name ? Math.min(shown, name.length) : 0;
  const writing = !!name && shownClamped < name.length;
  return (
    <div style={{
      position: 'relative', padding: '26px 18px 20px', borderRadius: 'var(--radius-sm)',
      border: '1px dashed ' + (name ? 'var(--brand)' : 'var(--border-strong)'), background: 'var(--surface-sunken)',
      transition: 'border-color var(--duration-base) var(--ease-standard)',
    }}>
      <div style={{ position: 'relative', minHeight: 38, display: 'flex', alignItems: 'flex-end' }}>
        <span style={{
          fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 30, lineHeight: 1.1,
          color: name ? 'var(--brand-ink)' : 'var(--text-muted)', whiteSpace: 'pre',
        }}>
          {name ? name.slice(0, shownClamped) : 'Your signature appears here'}
        </span>
        {writing && <span style={{
          display: 'inline-block', width: 2, height: 26, marginLeft: 2, background: 'var(--brand-deep)',
          animation: 'caret 700ms steps(2,start) infinite',
        }} />}
      </div>
      <span style={{ display: 'block', marginTop: 8, height: 1, background: 'var(--brand-38)' }} />
      <span style={{ display: 'block', marginTop: 7, fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>
        {name ? `Signed ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}` : 'Type your name above'}
      </span>
    </div>
  );
}
