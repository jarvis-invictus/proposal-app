'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Icon } from '@/components/ui/Icon'
import { Logo } from '@/components/ui/Logo'
import { Badge } from '@/components/ui/Badge'
import { Pill } from '@/components/ui/Pill'
import { FilterChip } from '@/components/ui/FilterChip'
import { extractFromUrl, extractFromImage, saveBrandKit } from './brand-kit/actions'
import { finishOnboarding } from './onboarding-actions'

const STEPS = [
  { id: 'business', n: '1', label: 'Your business' },
  { id: 'brand', n: '2', label: 'Brand kit' },
  { id: 'preview', n: '3', label: 'See it in action' },
  { id: 'first', n: '4', label: 'First proposal' },
] as const

const CATEGORIES = [
  { id: 'agency', label: 'Marketing agency', icon: 'megaphone' },
  { id: 'dev', label: 'Dev studio', icon: 'code' },
  { id: 'design', label: 'Design / creative', icon: 'palette' },
  { id: 'freelance', label: 'Freelancer', icon: 'user' },
  { id: 'other', label: 'Something else', icon: 'circle-ellipsis' },
] as const

function SkyBackdrop() {
  return (
    <div aria-hidden="true" style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none', zIndex: 0 }}>
      <span style={{
        position: 'absolute', top: '-28%', left: '8%', width: '60%', height: '85%', borderRadius: '50%',
        background: 'radial-gradient(circle,var(--bloom-1) 0%,rgba(124,188,220,0) 68%)', animation: 'sky-drift 26s var(--ease-standard) infinite',
      }} />
      <span style={{
        position: 'absolute', top: '12%', right: '-14%', width: '52%', height: '78%', borderRadius: '50%',
        background: 'radial-gradient(circle,var(--bloom-2) 0%,rgba(207,228,242,0) 70%)', animation: 'sky-drift 34s var(--ease-standard) infinite reverse',
      }} />
    </div>
  )
}

function WizardPanel({ children, className = '', style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={('liquid ' + className).trim()} style={{ padding: '34px 36px', borderRadius: 'var(--radius-card-lg)', ...style }}>
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  )
}

function Head({ title, accent, sub, align = 'left' as 'left' | 'center' }: { title: string; accent?: string; sub?: string; align?: 'left' | 'center' }) {
  const hasAccent = accent && title.includes(accent)
  const [a, b] = hasAccent ? [title.slice(0, title.indexOf(accent!)), title.slice(title.indexOf(accent!) + accent!.length)] : [title, '']
  return (
    <div style={{ marginBottom: 24, textAlign: align }}>
      <h1 style={{ fontSize: 30, letterSpacing: 'var(--tracking-tight)', lineHeight: 1.15 }}>
        {a}{hasAccent && <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, letterSpacing: 0 }}>{accent}</em>}{b}
      </h1>
      {sub && <p style={{ marginTop: 9, fontSize: 'var(--text-body-lg)', color: 'var(--text-muted)', maxWidth: 540, marginLeft: align === 'center' ? 'auto' : 0, marginRight: align === 'center' ? 'auto' : 0 }}>{sub}</p>}
    </div>
  )
}

function StepTrack({ step, onPick }: { step: number; onPick: (i: number) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {STEPS.map((s, i) => {
        const done = i < step
        const on = i === step
        return (
          <React.Fragment key={s.id}>
            {i > 0 && <span aria-hidden="true" style={{ width: 44, height: 2, background: done || on ? 'var(--brand)' : 'var(--brand-12)', transition: 'background var(--duration-slow) var(--ease-standard)' }} />}
            <button type="button" onClick={() => onPick(i)} aria-current={on ? 'step' : undefined} style={{
              display: 'flex', alignItems: 'center', gap: 9, padding: '4px 4px', border: 'none', background: 'transparent',
              cursor: i <= step ? 'pointer' : 'default', fontFamily: 'var(--font-sans)',
            }}>
              <span style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, flex: 'none',
                borderRadius: 'var(--radius-pill)', fontSize: 12, fontWeight: 600,
                background: done ? 'var(--brand-deep)' : on ? 'var(--brand-tint)' : 'transparent',
                border: '1px solid ' + (done ? 'var(--brand-deep)' : on ? 'var(--brand)' : 'var(--border-strong)'),
                color: done ? 'var(--text-inverse)' : on ? 'var(--brand-ink)' : 'var(--text-muted)',
                boxShadow: on ? 'var(--shadow-brand)' : 'none', transition: 'all var(--duration-slow) var(--ease-spring)',
              }}>
                {done ? <Icon name="check" size={13} /> : s.n}
              </span>
              <span style={{ fontSize: 'var(--text-sm)', whiteSpace: 'nowrap', color: on ? 'var(--brand-ink)' : done ? 'var(--brand-deep)' : 'var(--text-muted)', fontWeight: on ? 'var(--weight-medium)' : 'var(--weight-regular)' }}>{s.label}</span>
            </button>
          </React.Fragment>
        )
      })}
    </div>
  )
}

function Welcome({ firstName, onStart }: { firstName: string; onStart: () => void }) {
  return (
    <WizardPanel className="liquid-flat liquid-drift" style={{ padding: '52px 40px', textAlign: 'center' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 58, height: 58, borderRadius: 'var(--radius-pill)',
        background: 'var(--brand-22)', border: '1px solid var(--brand-38)', marginBottom: 20, animation: 'pop-in 560ms var(--ease-spring) both',
      }}>
        <Logo size={30} />
      </span>
      <Head align="center" title={`Welcome to Marg, ${firstName}.`} accent="Marg,"
        sub="Let's set you up — takes about 3 minutes. You'll have a proposal in your own branding by the end of it." />
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
        <Button variant="primary" size="lg" iconRight="arrow-right" onClick={onStart}>Let&apos;s set you up</Button>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Four short steps. You can skip any of them.</span>
      </div>
    </WizardPanel>
  )
}

function CategoryChip({ cat, active, onClick }: { cat: typeof CATEGORIES[number]; active: boolean; onClick: () => void }) {
  const [hover, setHover] = React.useState(false)
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)} style={{
      display: 'inline-flex', alignItems: 'center', gap: 9, padding: '10px 16px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
      fontFamily: 'var(--font-sans)', fontSize: 'var(--text-body)',
      border: '1px solid ' + (active ? 'var(--brand)' : hover ? 'var(--brand-38)' : 'var(--border-hairline)'),
      background: active ? 'var(--brand-tint)' : hover ? 'var(--glass-card-hover)' : 'var(--glass-quiet)',
      color: active ? 'var(--brand-ink)' : 'var(--text-secondary)', fontWeight: active ? 'var(--weight-medium)' : 'var(--weight-regular)',
      boxShadow: active ? 'var(--shadow-brand)' : 'none', transform: hover && !active ? 'translateY(-1px)' : 'none',
      transition: 'all var(--duration-base) var(--ease-spring)',
    }}>
      <Icon name={cat.icon} size={15} color={active ? 'var(--brand-deep)' : 'currentColor'} />{cat.label}
    </button>
  )
}

function BusinessStep({ business, setBusiness, category, setCategory, onNext }: {
  business: string; setBusiness: (v: string) => void; category: string | null; setCategory: (v: string) => void; onNext: () => void
}) {
  return (
    <WizardPanel className="liquid-flat">
      <Head title="First, who are you?" accent="you?" sub="This goes on the cover of every proposal, and it decides which templates we put in front of you." />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Input label="Business name" icon="building-2" placeholder="Marg Studio" value={business} onChange={(e) => setBusiness(e.target.value)} wrapperStyle={{ maxWidth: 400 }} />
        <div>
          <span style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: 4 }}>What kind of work do you do?</span>
          <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 12 }}>We&apos;ll recommend templates that match.</span>
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            {CATEGORIES.map((c) => <CategoryChip key={c.id} cat={c} active={category === c.id} onClick={() => setCategory(c.id)} />)}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button variant="primary" iconRight="arrow-right" onClick={onNext}>Continue</Button>
          <button type="button" onClick={onNext} style={{ border: 'none', background: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', textDecoration: 'underline' }}>
            Skip for now
          </button>
        </div>
      </div>
    </WizardPanel>
  )
}

/** Reuses the existing 2-source extraction + review step. Will be upgraded to the full 5-source
 * BrandExtract flow (with mandatory manual logo upload) in the next correction — this is the
 * extraction capability that exists today, embedded inline instead of skipped. */
function BrandStep({ onNext }: { onNext: () => void }) {
  const [sourceType, setSourceType] = React.useState<'url' | 'image' | 'manual'>('url')
  const [sourceRef, setSourceRef] = React.useState('')
  const [isExtracting, setIsExtracting] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [error, setError] = React.useState('')
  const [hasExtracted, setHasExtracted] = React.useState(false)
  const [brandData, setBrandData] = React.useState<any>({
    colors: { primary: '#000000', secondary: '#ffffff', accent: '#000000', background: '#ffffff', text: '#000000' },
    fonts: { heading: 'sans-serif', body: 'sans-serif' },
    logoUrl: '',
  })

  const handleUrlExtraction = async () => {
    try {
      setIsExtracting(true)
      setError('')
      const data = await extractFromUrl(sourceRef)
      setBrandData(data)
      setHasExtracted(true)
    } catch (err: any) {
      setError(err.message || 'Failed to extract from URL')
    } finally {
      setIsExtracting(false)
    }
  }

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = async (event) => {
      const base64 = event.target?.result as string
      setSourceRef(file.name)
      try {
        setIsExtracting(true)
        setError('')
        const data = await extractFromImage(base64)
        setBrandData(data)
        setHasExtracted(true)
      } catch (err: any) {
        setError(err.message || 'Failed to extract from image')
      } finally {
        setIsExtracting(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSaveAndContinue = async () => {
    try {
      setIsSaving(true)
      await saveBrandKit({ source_type: sourceType, source_reference: sourceRef, ...brandData })
      onNext()
    } catch (err: any) {
      setError(err.message || 'Failed to save')
      setIsSaving(false)
    }
  }

  return (
    <WizardPanel className="liquid-flat">
      <Head title="Set up your brand kit" accent="brand kit" sub="Pull your colours, fonts and logo from something you already have — or skip and add it later." />
      {!hasExtracted ? (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
            <FilterChip active={sourceType === 'url'} onClick={() => setSourceType('url')} icon="link">From website URL</FilterChip>
            <FilterChip active={sourceType === 'image'} onClick={() => setSourceType('image')} icon="upload">From image</FilterChip>
            <FilterChip active={sourceType === 'manual'} onClick={() => { setSourceType('manual'); setHasExtracted(true) }} icon="signature">Enter manually</FilterChip>
          </div>
          {sourceType === 'url' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxWidth: 460 }}>
              <Input type="url" value={sourceRef} onChange={(e) => setSourceRef(e.target.value)} placeholder="https://yourwebsite.com" icon="link" />
              <div><Button variant="primary" icon="sparkles" loading={isExtracting} disabled={!sourceRef} onClick={handleUrlExtraction}>{isExtracting ? 'Extracting…' : 'Extract brand kit'}</Button></div>
            </div>
          )}
          {sourceType === 'image' && (
            <label style={{
              display: 'flex', alignItems: 'center', gap: 10, height: 'var(--control-h)', padding: '0 14px', maxWidth: 460,
              borderRadius: 'var(--radius-pill)', border: '1px dashed var(--border-strong)', cursor: isExtracting ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', opacity: isExtracting ? 0.5 : 1,
            }}>
              <Icon name="upload" size={16} color="var(--text-muted)" />
              {sourceRef || 'Choose an image or PDF…'}
              <input type="file" accept="image/*,.pdf" onChange={handleImageUpload} disabled={isExtracting} style={{ display: 'none' }} />
            </label>
          )}
          {error && <p style={{ marginTop: 12, fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)' }}>{error}</p>}
          <div style={{ marginTop: 20 }}>
            <button type="button" onClick={onNext} style={{ border: 'none', background: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', textDecoration: 'underline' }}>
              Skip for now
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 28, marginBottom: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', margin: 0 }}>Colors</h3>
              {Object.entries(brandData.colors).map(([key, val]: [string, any]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 28, height: 28, flex: 'none', borderRadius: '50%', backgroundColor: val, border: '1px solid var(--border-hairline)' }} />
                  <input type="text" value={val} onChange={(e) => setBrandData({ ...brandData, colors: { ...brandData.colors, [key]: e.target.value } })}
                    style={{ flex: 1, border: 'none', borderBottom: '1px solid var(--border-hairline)', outline: 'none', padding: '4px 0', background: 'transparent', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)' }} />
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', margin: 0 }}>Logo</h3>
              <input type="url" value={brandData.logoUrl} onChange={(e) => setBrandData({ ...brandData, logoUrl: e.target.value })} placeholder="https://…"
                style={{ border: 'none', borderBottom: '1px solid var(--border-hairline)', outline: 'none', padding: '4px 0', background: 'transparent', fontSize: 'var(--text-sm)' }} />
            </div>
          </div>
          {error && <p style={{ marginBottom: 12, fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)' }}>{error}</p>}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Button variant="primary" iconRight="arrow-right" loading={isSaving} onClick={handleSaveAndContinue}>Save &amp; continue</Button>
          </div>
        </div>
      )}
    </WizardPanel>
  )
}

function SampleFrame({ business }: { business: string }) {
  return (
    <div style={{ borderRadius: 'var(--radius-card)', overflow: 'hidden', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-raised)', background: 'var(--surface-card)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid var(--border-hairline)', background: 'var(--glass-quiet)' }}>
        <span style={{ display: 'flex', gap: 5 }}>
          {['#e5554e', '#e5b34e', '#4eb56a'].map((c) => <span key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.75 }} />)}
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, padding: '5px 11px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-card)', border: '1px solid var(--border-hairline)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
          <Icon name="lock" size={10} color="var(--text-muted)" />marg.app/p/sample-website-redesign
        </span>
        <Pill tone="solid" size="sm">Sample</Pill>
      </div>
      <div className="force-light" style={{ height: 330, overflowY: 'auto', background: '#fff' }}>
        <div style={{ padding: '30px 38px 40px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, marginBottom: 26 }}>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 10 }}>Sample · Prepared for Northwind Co</div>
              <div style={{ fontSize: 30, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, color: '#171717', maxWidth: 400 }}>
                Website redesign for <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, letterSpacing: 0 }}>Northwind</em>
              </div>
            </div>
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 13px', borderRadius: 999, background: '#cfe4f2', border: '1px solid #7cbcdc', fontSize: 12, fontWeight: 500, color: '#17384f', whiteSpace: 'nowrap' }}>
              <Logo size={14} /> {business}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 32, marginBottom: 28, flexWrap: 'wrap' }}>
            {[['Prepared by', business], ['Date', '13 August 2026'], ['Valid until', '13 September 2026']].map(([k, v]) => (
              <div key={k}>
                <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 5 }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#171717' }}>{v}</div>
              </div>
            ))}
          </div>
          <div style={{ height: 1, background: 'rgba(23,23,23,0.10)', marginBottom: 24 }} />
          <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 24, color: '#171717', marginBottom: 12 }}>Executive Summary</div>
          <p style={{ fontSize: 15, lineHeight: 1.75, color: '#3d4451', maxWidth: 560, marginBottom: 28 }}>
            Northwind Co needs a website that converts as well as it looks. Over eight weeks {business} will rebuild the marketing site on a design system your team can extend, with copy and structure aimed squarely at booking more qualified calls.
          </p>
          <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 24, color: '#171717', marginBottom: 14 }}>Packages</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12, maxWidth: 560, marginBottom: 28 }}>
            {[['Essential', '$14,000', 'Five core pages, design and build.'], ['Complete', '$24,000', 'Everything in Essential, plus CMS and copywriting.']].map(([n, p, d], i) => (
              <div key={n} style={{ padding: 16, borderRadius: 14, border: '1px solid ' + (i === 1 ? '#7cbcdc' : 'rgba(23,23,23,0.10)'), background: i === 1 ? '#f2f8fc' : '#fff' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 7 }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#171717' }}>{n}</span>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#171717', fontVariantNumeric: 'tabular-nums' }}>{p}</span>
                </div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: '#6b7280' }}>{d}</div>
              </div>
            ))}
          </div>
          <div style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontSize: 24, color: '#171717', marginBottom: 12 }}>Payment</div>
          <div style={{ display: 'flex', gap: 10, maxWidth: 560 }}>
            {[['Deposit', '50% · $12,000'], ['On delivery', '50% · $12,000']].map(([k, v]) => (
              <div key={k} style={{ flex: 1, padding: '12px 14px', borderRadius: 10, background: '#f1f1f1' }}>
                <div style={{ fontSize: 10, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#6b7280', marginBottom: 5 }}>{k}</div>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#171717' }}>{v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function PreviewStep({ business, onNext }: { business: string; onNext: () => void }) {
  const name = business || 'Marg Studio'
  return (
    <WizardPanel className="liquid-flat">
      <div style={{ marginBottom: 22 }}>
        <Badge tone="new" style={{ marginBottom: 10 }}>Nothing to do here — just look</Badge>
        <h1 style={{ fontSize: 30, letterSpacing: 'var(--tracking-tight)', lineHeight: 1.15 }}>
          Here&apos;s what a proposal looks like in <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, letterSpacing: 0 }}>your</em> brand
        </h1>
        <p style={{ marginTop: 9, fontSize: 'var(--text-body-lg)', color: 'var(--text-muted)', maxWidth: 460 }}>Your colours, fonts and logo, already applied. Scroll it — this is a real page, not a picture.</p>
      </div>
      <SampleFrame business={name} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 22, flexWrap: 'wrap' }}>
        <Button variant="primary" iconRight="arrow-right" onClick={onNext}>Looks good — what&apos;s next?</Button>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Sample content. Your real proposals use your words.</span>
      </div>
    </WizardPanel>
  )
}

function ChoiceTile({ icon, title, body, onClick, lead }: { icon: string; title: string; body: string; onClick: () => void; lead?: boolean }) {
  return (
    <button type="button" onClick={onClick} className="liquid liquid-hover" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 9, padding: '22px 22px 24px',
      textAlign: 'left', borderRadius: 'var(--radius-card)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
    }}>
      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: 'var(--radius-pill)', background: 'var(--brand-22)', color: 'var(--brand-deep)' }}>
        <Icon name={icon} size={17} />
      </span>
      <span style={{ position: 'relative', zIndex: 1, fontSize: 'var(--text-body-lg)', fontWeight: 500, color: 'var(--brand-ink)' }}>{title}</span>
      <span style={{ position: 'relative', zIndex: 1, fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-snug)', color: 'var(--text-muted)' }}>{body}</span>
      <span style={{ position: 'relative', zIndex: 1, display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--brand-deep)' }}>
        {lead ? 'Start writing' : 'Go to dashboard'} <Icon name="arrow-right" size={14} />
      </span>
    </button>
  )
}

function FirstProposalStep({ onCreate, onLater }: { onCreate: () => void; onLater: () => void }) {
  return (
    <WizardPanel className="liquid-flat">
      <Head title="Ready to write a real one?" accent="real" sub="Either way works. Nothing here expires, and you can come back to it whenever." />
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
        <ChoiceTile icon="sparkles" title="Create my first proposal now" body="Describe a deal you've already closed. About two minutes." onClick={onCreate} lead />
        <ChoiceTile icon="layout-dashboard" title="I'll do this later" body="Head to your dashboard. Your brand kit is saved either way." onClick={onLater} />
      </div>
    </WizardPanel>
  )
}

export function OnboardingWizard({ firstName }: { firstName: string }) {
  const router = useRouter()
  const [phase, setPhase] = React.useState<'welcome' | 0 | 1 | 2 | 3>('welcome')
  const [business, setBusiness] = React.useState('')
  const [category, setCategory] = React.useState<string | null>(null)

  const step = phase === 'welcome' ? -1 : phase
  const next = () => setPhase((p) => (p === 'welcome' ? 0 : Math.min((p as number) + 1, STEPS.length - 1) as 0 | 1 | 2 | 3))

  const finish = async (dest: 'proposals' | 'new') => {
    await finishOnboarding({ business: business || 'Marg Studio', category })
    router.push(dest === 'new' ? '/dashboard/proposals/new' : '/dashboard')
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflowY: 'auto', background: 'var(--gradient-app)' }}>
      <SkyBackdrop />
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', gap: 14, padding: '20px 28px' }}>
        <Logo size={22} wordmark label="Marg" />
        <span style={{ flex: 1 }} />
        {step >= 0 && <Button variant="ghost" size="sm" onClick={() => finish('proposals')}>Skip setup</Button>}
      </div>

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22, padding: '10px 24px 56px' }}>
        {step >= 0 && <StepTrack step={step} onPick={(i) => i <= step && setPhase(i as 0 | 1 | 2 | 3)} />}

        <div key={phase} className="screen-in" style={{ width: 'min(860px,100%)' }}>
          {phase === 'welcome' && <Welcome firstName={firstName} onStart={next} />}
          {phase === 0 && <BusinessStep business={business} setBusiness={setBusiness} category={category} setCategory={setCategory} onNext={next} />}
          {phase === 1 && <BrandStep onNext={next} />}
          {phase === 2 && <PreviewStep business={business} onNext={next} />}
          {phase === 3 && <FirstProposalStep onCreate={() => finish('new')} onLater={() => finish('proposals')} />}
        </div>
      </div>
    </div>
  )
}
