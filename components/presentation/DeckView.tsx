'use client'

import * as React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'
import { formatCurrency } from '@/lib/formatCurrency'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import { buildDeckSlides, type DeckSlide, type DeckBrand } from '@/lib/presentation/buildDeck'
import { DURATION_BASE, DURATION_SLOW, EASE_OUT_SOFT, EASE_SPRING } from '@/lib/presentation/motionTokens'

const SLIDE_VARIANTS = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 48 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -48 }),
}

export function DeckView({
  content, brand, currency = 'USD', onExit,
}: {
  content: any
  brand: DeckBrand
  currency?: string
  onExit: () => void
}) {
  const slides = React.useMemo(() => buildDeckSlides(content), [content])
  const [[index, direction], setIndexState] = React.useState<[number, number]>([0, 0])
  const reduced = React.useMemo(() => prefersReducedMotion(), [])
  const accent = brand?.primary || '#4F46E5'

  const go = React.useCallback((next: number) => {
    setIndexState(([current]) => {
      const clamped = Math.max(0, Math.min(slides.length - 1, next))
      return [clamped, clamped > current ? 1 : -1]
    })
  }, [slides.length])

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') go(index + 1)
      else if (e.key === 'ArrowLeft') go(index - 1)
      else if (e.key === 'Escape') onExit()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, go, onExit])

  const slide = slides[index]
  const isFirst = index === 0
  const isLast = index === slides.length - 1

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 55, display: 'flex', flexDirection: 'column',
      background: 'var(--surface-page)', fontFamily: 'var(--font-sans)', overflow: 'hidden',
    }}>
      <div aria-hidden style={{
        position: 'absolute', top: '-30%', left: '50%', transform: 'translateX(-50%)', width: '140%', height: '70%',
        background: `radial-gradient(closest-side, ${accent}22, transparent 70%)`, pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 28px' }}>
        <button type="button" onClick={onExit} style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, border: 'none', background: 'none', cursor: 'pointer',
          fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', padding: '6px 10px',
        }}>
          <Icon name="arrow-left" size={15} /> Document view
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {slides.map((s, i) => (
            <button key={s.id} type="button" aria-label={`Go to slide ${i + 1}`} onClick={() => go(i)}
              style={{
                width: i === index ? 20 : 6, height: 6, borderRadius: 'var(--radius-pill)', border: 'none', cursor: 'pointer', padding: 0,
                background: i === index ? accent : 'var(--border-hairline)',
                transition: `width ${DURATION_BASE}s ${EASE_OUT_SOFT.join(',')}`,
              }} />
          ))}
        </div>
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', minWidth: 40, textAlign: 'right' }}>
          {index + 1} / {slides.length}
        </span>
      </div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 24px', minHeight: 0 }}>
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.div
            key={slide.id}
            custom={direction}
            variants={SLIDE_VARIANTS}
            initial={reduced ? undefined : 'enter'}
            animate="center"
            exit={reduced ? undefined : 'exit'}
            transition={{ duration: reduced ? 0 : DURATION_SLOW, ease: EASE_OUT_SOFT }}
            style={{ width: 'min(760px, 100%)', maxHeight: '100%', overflowY: 'auto' }}
          >
            <SlideContent slide={slide} accent={accent} currency={currency} reduced={reduced} onExit={onExit} />
          </motion.div>
        </AnimatePresence>
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '20px 28px 28px' }}>
        <Button variant="ghost" size="sm" icon="arrow-left" onClick={() => go(index - 1)} disabled={isFirst}>Back</Button>
        {isLast ? (
          <Button variant="primary" size="sm" iconRight="arrow-right" onClick={onExit}>Review &amp; sign</Button>
        ) : (
          <Button variant="primary" size="sm" iconRight="arrow-right" onClick={() => go(index + 1)}>Next</Button>
        )}
      </div>
    </div>
  )
}

function SlideContent({ slide, accent, currency, reduced, onExit }: { slide: DeckSlide; accent: string; currency: string; reduced: boolean; onExit: () => void }) {
  const stagger = () => (reduced ? undefined : { opacity: 0, y: 14 })
  const staggerTransition = (i: number) => ({ duration: DURATION_BASE, delay: reduced ? 0 : 0.08 * i, ease: EASE_SPRING })

  if (slide.kind === 'cover') {
    return (
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 18 }}>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 'var(--tracking-caps)' }}>
          Prepared for {slide.clientName}
        </span>
        <h1 style={{ fontSize: 44, lineHeight: 1.1, letterSpacing: 'var(--tracking-tight)', maxWidth: 640, margin: 0 }}>{slide.title}</h1>
        <div style={{ display: 'flex', gap: 24, marginTop: 8, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', flexWrap: 'wrap', justifyContent: 'center' }}>
          {slide.preparedBy && <span>Prepared by {slide.preparedBy}</span>}
          {slide.dateIssued && <span>&middot; {slide.dateIssued}</span>}
          {slide.validUntil && <span>&middot; Valid until {slide.validUntil}</span>}
        </div>
        <span style={{ width: 48, height: 3, borderRadius: 2, background: accent, marginTop: 8 }} />
      </div>
    )
  }

  if (slide.kind === 'packages') {
    return (
      <div>
        <h2 style={{ textAlign: 'center', fontSize: 28, marginBottom: 28 }}>Investment Options</h2>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(slide.packages.length, 3)}, minmax(0, 1fr))`, gap: 16 }}>
          {slide.packages.map((pkg: any, i: number) => (
            <motion.div key={i} initial={stagger()} animate={{ opacity: 1, y: 0 }} transition={staggerTransition(i)}
              style={{
                borderRadius: 'var(--radius-card-lg)', padding: 22, background: 'var(--surface-card)',
                border: pkg.popular ? `2px solid ${accent}` : '1px solid var(--border-hairline)',
                boxShadow: pkg.popular ? 'var(--shadow-brand)' : 'none',
              }}>
              {pkg.popular && <span style={{ display: 'inline-block', marginBottom: 10, padding: '3px 10px', borderRadius: 'var(--radius-pill)', background: accent, color: '#fff', fontSize: 'var(--text-micro)', fontWeight: 600, textTransform: 'uppercase' }}>Most popular</span>}
              <h3 style={{ fontSize: 'var(--text-h4)', marginBottom: 6 }}>{pkg.name}</h3>
              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', minHeight: 36 }}>{pkg.description}</p>
              <div style={{ margin: '14px 0', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: 26, fontWeight: 700 }}>{formatCurrency(pkg.discountedPrice, currency)}</span>
                {pkg.originalPrice > pkg.discountedPrice && (
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', textDecoration: 'line-through' }}>{formatCurrency(pkg.originalPrice, currency)}</span>
                )}
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(pkg.deliverables || []).map((d: string, di: number) => (
                  <li key={di} style={{ display: 'flex', gap: 8, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    <Icon name="check" size={14} color={accent} style={{ marginTop: 2, flex: 'none' }} /><span>{d}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  if (slide.kind === 'addOns') {
    return (
      <div>
        <h2 style={{ textAlign: 'center', fontSize: 28, marginBottom: 28 }}>Optional Add-ons</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {slide.addOns.map((a: any, i: number) => (
            <motion.div key={i} initial={stagger()} animate={{ opacity: 1, y: 0 }} transition={staggerTransition(i)}
              style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '16px 18px', borderRadius: 'var(--radius-card)', background: 'var(--surface-card)', border: '1px solid var(--border-hairline)' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{a.name}</div>
                <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>{a.description}</div>
              </div>
              <div style={{ fontWeight: 700, flex: 'none' }}>+{formatCurrency(a.price, currency)}</div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  if (slide.kind === 'timeline') {
    return (
      <div>
        <h2 style={{ textAlign: 'center', fontSize: 28, marginBottom: 28 }}>Project Timeline</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {slide.timeline.map((phase: any, i: number) => (
            <motion.div key={i} initial={stagger()} animate={{ opacity: 1, y: 0 }} transition={staggerTransition(i)}
              style={{ display: 'flex', gap: 18, padding: '14px 4px', borderBottom: i < slide.timeline.length - 1 ? '1px solid var(--border-hairline)' : 'none' }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: accent, marginTop: 6, flex: 'none' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                  <span style={{ fontWeight: 600 }}>{phase.phase}</span>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{phase.duration}</span>
                </div>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginTop: 4 }}>{phase.description}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  if (slide.kind === 'attachments') {
    return (
      <div>
        <h2 style={{ textAlign: 'center', fontSize: 28, marginBottom: 28 }}>Attachments</h2>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(slide.attachments.length, 2)}, minmax(0, 1fr))`, gap: 16 }}>
          {slide.attachments.map((a: any, i: number) => (
            <motion.div key={i} initial={stagger()} animate={{ opacity: 1, y: 0 }} transition={staggerTransition(i)}
              style={{ borderRadius: 'var(--radius-card-lg)', overflow: 'hidden', border: '1px solid var(--border-hairline)', background: 'var(--surface-card)' }}>
              {a.type === 'video' ? (
                <video src={a.url} controls preload="none" style={{ width: '100%', display: 'block' }} />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.url} alt={a.caption || 'Attachment'} loading="lazy" style={{ width: '100%', display: 'block' }} />
              )}
              {a.caption && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', padding: '10px 14px' }}>{a.caption}</p>}
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  if (slide.kind === 'terms') {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: slide.terms.length ? 'minmax(0, 1fr) minmax(0, 1fr)' : 'minmax(0, 1fr)', gap: 32 }}>
        {slide.paymentSection && (
          <div>
            <h2 style={{ fontSize: 22, marginBottom: 14 }}>Payment Schedule</h2>
            <p style={{ fontWeight: 600, marginBottom: 6 }}>{slide.paymentSection.schedule}</p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{slide.paymentSection.terms}</p>
          </div>
        )}
        {slide.terms.length > 0 && (
          <div>
            <h2 style={{ fontSize: 22, marginBottom: 14 }}>Terms &amp; Conditions</h2>
            <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {slide.terms.map((t, i) => <li key={i} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>{t}</li>)}
            </ul>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: '50%', background: accent }}>
        <Icon name="check" size={24} color="#fff" />
      </span>
      <h2 style={{ fontSize: 26, margin: 0 }}>Ready to move forward, {slide.clientName}?</h2>
      <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-secondary)', maxWidth: 420 }}>
        Head back to the full proposal to review the details and add your signature.
      </p>
    </div>
  )
}
