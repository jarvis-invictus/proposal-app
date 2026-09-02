'use client'

import * as React from 'react'
import { SkyBackdrop } from '@/components/app/AppShell'
import { Icon } from '@/components/ui/Icon'
import { Logo } from '@/components/ui/Logo'
import { prefersReducedMotion } from '@/lib/reducedMotion'
import type { BrandKitPreview } from './NewProposalClient'

export type Preview = {
  clientName: string
  packageCount: number
  priceRange: string
  timeline: string
  terms: string
  paymentSchedule: string
}

type GenResult = { ok: true; id: string } | { ok: false; error: string; partial?: unknown }

type Block =
  | { id: string; label: string; kind: 'header'; title: string; meta: [string, string] }
  | { id: string; label: string; kind: 'prose'; heading: string; body: string }
  | { id: string; label: string; kind: 'cards'; heading: string; cards: string[]; caption: string }
  | { id: string; label: string; kind: 'brand'; colors: string[]; font: string }

const reduced = prefersReducedMotion

function buildSteps(preview: Preview, brandKit: BrandKitPreview | null): Block[] {
  const today = new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })
  const colors = (brandKit?.colors && [brandKit.colors.primary, brandKit.colors.secondary, brandKit.colors.accent].filter(Boolean) as string[]) || ['#7cbcdc', '#cfe4f2', '#17384f']
  return [
    { id: 'header', label: 'Reading your notes', kind: 'header', title: 'Building your proposal', meta: [`Prepared for ${preview.clientName}`, today] },
    { id: 'summary', label: 'Writing your summary', kind: 'prose', heading: 'Executive Summary', body: `Turning your notes into a clear, persuasive summary for ${preview.clientName}.` },
    { id: 'packages', label: 'Structuring the packages', kind: 'cards', heading: 'Packages', cards: Array.from({ length: preview.packageCount }, (_, i) => `Package ${i + 1}`), caption: preview.priceRange },
    { id: 'terms', label: 'Adding terms and payment', kind: 'prose', heading: 'Terms & Payment', body: `${preview.terms} ${preview.paymentSchedule}` },
    { id: 'brand', label: 'Applying your brand style', kind: 'brand', colors, font: brandKit?.headingFont || 'Instrument Serif' },
  ]
}

export function GeneratingScreen({
  preview, brandKit, onGenerate, onDone, onError,
}: {
  preview: Preview
  brandKit: BrandKitPreview | null
  onGenerate: () => Promise<GenResult>
  onDone: (result: { id: string }) => void
  onError: (message: string, partial?: unknown) => void
}) {
  const BUILD = React.useMemo(() => buildSteps(preview, brandKit), [preview, brandKit])
  const [step, setStep] = React.useState(0)
  const [result, setResult] = React.useState<GenResult | null>(null)
  const startedRef = React.useRef(false)
  const scroller = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    onGenerate().then(setResult)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  React.useEffect(() => {
    if (step >= BUILD.length) return
    const kind = BUILD[step].kind
    const dwell = reduced() ? 260 : kind === 'prose' ? 1900 : kind === 'brand' ? 900 : 1250
    const t = setTimeout(() => setStep((s) => s + 1), dwell)
    return () => clearTimeout(t)
  }, [step, BUILD])

  const done = step >= BUILD.length && !!result
  React.useEffect(() => {
    if (step < BUILD.length || !result) return
    if (result.ok) {
      const t = setTimeout(() => onDone({ id: result.id }), 900)
      return () => clearTimeout(t)
    }
    onError(result.error, result.partial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, result])

  React.useEffect(() => {
    const box = scroller.current
    if (box) box.scrollTo({ top: box.scrollHeight, behavior: reduced() ? 'auto' : 'smooth' })
  }, [step])

  const current = BUILD[Math.min(step, BUILD.length - 1)]
  const pct = Math.round((Math.min(step, BUILD.length) / BUILD.length) * 100)

  return (
    <div style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gradient-app)', overflow: 'hidden' }}>
      <SkyBackdrop />
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'center', padding: '26px 24px 14px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '9px 18px 9px 13px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-glass-sky)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)', border: '1px solid var(--brand-38)', boxShadow: 'var(--shadow-brand)' }}>
          {done ? <Icon name="check" size={18} color="var(--brand-deep)" /> : <Logo size={19} />}
          <span style={{ fontSize: 'var(--text-body)', color: 'var(--brand-ink)', fontWeight: 'var(--weight-medium)' }}>
            {done ? 'Your proposal is ready' : current.label}
          </span>
          {!done && (
            <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
              {[0, 1, 2].map((i) => <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--brand-deep)', animation: 'dot-bounce 1.2s ' + (i * 160) + 'ms infinite ease-in-out' }} />)}
            </span>
          )}
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', marginLeft: 2 }}>{pct}%</span>
        </div>
      </div>

      <div ref={scroller} style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 24px 40px' }}>
        <div style={{
          maxWidth: 760, margin: '0 auto', borderRadius: 'var(--radius-card-lg)', background: 'var(--surface-card)',
          border: '1px solid ' + (done ? 'var(--brand)' : 'var(--border-hairline)'),
          boxShadow: done ? 'var(--shadow-brand-lg)' : 'var(--shadow-hover)',
          transition: 'border-color var(--duration-slow) var(--ease-standard),box-shadow var(--duration-slow) var(--ease-standard)',
          overflow: 'hidden',
        }}>
          {BUILD.map((b, i) => i <= step && <BuildBlock key={b.id} block={b} streaming={i === step} />)}
          {step < BUILD.length && <PendingLines />}
        </div>
      </div>

      <div style={{ position: 'relative', zIndex: 2, height: 3, background: 'var(--brand-12)' }}>
        <div style={{ height: '100%', width: pct + '%', background: 'linear-gradient(90deg,var(--brand) 0%,var(--brand-deep) 100%)', transition: 'width var(--duration-slow) var(--ease-out-soft)' }} />
      </div>
    </div>
  )
}

function BuildBlock({ block, streaming }: { block: Block; streaming: boolean }) {
  return (
    <section style={{ padding: '26px 36px', borderBottom: '1px solid var(--border-hairline)', animation: reduced() ? 'none' : 'block-in 520ms var(--ease-spring) both' }}>
      {block.kind === 'header' && (
        <>
          <div className="eyebrow" style={{ marginBottom: 10 }}>{block.meta[0]} · {block.meta[1]}</div>
          <h1 style={{ fontSize: 32, letterSpacing: 'var(--tracking-tight)', lineHeight: 1.12, maxWidth: 520 }}>
            <Stream text={block.title} run={streaming} />
          </h1>
        </>
      )}
      {block.kind === 'prose' && (
        <>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 25, letterSpacing: 0, marginBottom: 12 }}>{block.heading}</h2>
          <p style={{ fontSize: 15.5, lineHeight: 1.75, color: 'var(--text-secondary)', maxWidth: 'var(--prose-max)' }}>
            <Stream text={block.body} run={streaming} />
          </p>
        </>
      )}
      {block.kind === 'cards' && (
        <>
          <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 25, letterSpacing: 0, marginBottom: 14 }}>{block.heading}</h2>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(block.cards.length, 3)},1fr)`, gap: 12, maxWidth: 560 }}>
            {block.cards.map((n, i) => (
              <div key={n} style={{
                display: 'flex', justifyContent: 'center', alignItems: 'baseline', padding: '15px 17px',
                borderRadius: 'var(--radius-card)', border: '1px solid var(--border-hairline)', background: 'var(--surface-sunken)',
                animation: reduced() ? 'none' : 'block-in 480ms ' + (180 + i * 140) + 'ms var(--ease-spring) both',
              }}>
                <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: 'var(--tracking-tight)' }}>{n}</span>
              </div>
            ))}
          </div>
          {block.caption && <div style={{ marginTop: 10, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{block.caption}</div>}
        </>
      )}
      {block.kind === 'brand' && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span className="eyebrow">Brand style applied</span>
          {block.colors.map((c, i) => (
            <span key={c} style={{ width: 26, height: 26, borderRadius: 'var(--radius-pill)', background: c, border: '1px solid var(--border-hairline)', animation: reduced() ? 'none' : 'pop-in 420ms ' + (i * 110) + 'ms var(--ease-spring) both' }} />
          ))}
          <span style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 19, marginLeft: 4, animation: reduced() ? 'none' : 'fade-in 500ms 380ms both' }}>{block.font}</span>
        </div>
      )}
    </section>
  )
}

function Stream({ text, run }: { text: string; run: boolean }) {
  const words = React.useMemo(() => text.split(' '), [text])
  const [n, setN] = React.useState(() => (run && !reduced() ? 0 : words.length))
  React.useEffect(() => {
    if (!run || reduced()) { setN(words.length); return }
    setN(0)
    let i = 0
    const id = setInterval(() => {
      i += 1
      setN(i)
      if (i >= words.length) clearInterval(id)
    }, 42)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, run])
  const writing = run && n < words.length
  return (
    <>
      {words.slice(0, n).join(' ')}
      {writing && <span style={{ display: 'inline-block', width: 2, height: '0.95em', marginLeft: 3, verticalAlign: '-0.1em', background: 'var(--brand-deep)', animation: 'caret 900ms steps(2,start) infinite' }} />}
    </>
  )
}

function PendingLines() {
  return (
    <div style={{ padding: '26px 36px', display: 'flex', flexDirection: 'column', gap: 9 }}>
      {[92, 74, 58].map((w, i) => (
        <span key={i} style={{ height: 9, width: w + '%', borderRadius: 4, background: 'linear-gradient(90deg,var(--skeleton-base) 0%,var(--skeleton-sheen) 50%,var(--skeleton-base) 100%)', backgroundSize: '760px 100%', animation: 'shimmer 1.4s linear infinite' }} />
      ))}
    </div>
  )
}
