'use client'

import * as React from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Icon } from '@/components/ui/Icon'
import { Logo } from '@/components/ui/Logo'
import { Badge } from '@/components/ui/Badge'
import { createClient } from '@/lib/supabase/client'
import { Textarea } from '@/components/ui/Textarea'
import { extractFromUrl, extractFromImage, extractFromText, saveBrandKit } from './actions'

type SourceId = 'url' | 'file' | 'code' | 'assets' | 'describe'

const SOURCES: { id: SourceId; icon: string; label: string; hint: string; live: boolean }[] = [
  { id: 'url', icon: 'globe', label: 'Scan my website', hint: 'We visit it and read your brand off the page', live: true },
  { id: 'file', icon: 'file-text', label: 'Upload a brand guide', hint: 'design.md, a PDF, or a style doc', live: false },
  { id: 'code', icon: 'code', label: 'Connect a codebase', hint: 'Reads your tokens and CSS variables', live: false },
  { id: 'assets', icon: 'image', label: 'Upload assets', hint: 'Screenshots, a deck, old proposals', live: true },
  { id: 'describe', icon: 'message-square', label: 'Describe it in words', hint: '"Warm, editorial, deep green"', live: true },
]

const SCAN_STEPS = [
  { label: 'Opening the page' },
  { label: 'Reading the page' },
  { label: 'Sampling colours' },
  { label: 'Matching fonts' },
  { label: 'Reading heading styles' },
  { label: 'Brand read complete' },
]

const FONT_OPTIONS = { heading: ['Inter Tight', 'Söhne', 'Fraunces'], body: ['Inter Tight', 'Söhne', 'Georgia'], accent: ['Instrument Serif', 'Fraunces', 'None'] }

const reduced = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

type Extracted = { colors: Record<string, string>; fonts: Record<string, string>; logoUrl?: string; is_low_confidence?: boolean }

export function BrandExtract({ onConfirm, onSkip, kitNameDefault, accountId }: {
  onConfirm: () => void
  onSkip: () => void
  kitNameDefault: string
  accountId: string
}) {
  const [source, setSource] = React.useState<SourceId | null>(null)
  const [phase, setPhase] = React.useState<'pick' | 'input' | 'scan' | 'review'>('pick')
  const [url, setUrl] = React.useState('')
  const [assetFile, setAssetFile] = React.useState<File | null>(null)
  const [description, setDescription] = React.useState('')
  const [extracted, setExtracted] = React.useState<Extracted | null>(null)
  const [error, setError] = React.useState<string | null>(null)
  const extractionRef = React.useRef<Promise<Extracted> | null>(null)

  const runExtraction = async (src: SourceId) => {
    setError(null)
    try {
      if (src === 'url') {
        extractionRef.current = extractFromUrl(url) as Promise<Extracted>
      } else if (src === 'assets' && assetFile) {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader()
          reader.onload = () => resolve(reader.result as string)
          reader.onerror = reject
          reader.readAsDataURL(assetFile)
        })
        extractionRef.current = extractFromImage(base64) as Promise<Extracted>
      } else if (src === 'describe' && description.trim()) {
        extractionRef.current = extractFromText(description) as Promise<Extracted>
      }
      setPhase('scan')
    } catch (err: any) {
      setError(err.message || 'Failed to start extraction')
    }
  }

  const handleScanDone = async () => {
    try {
      const data = extractionRef.current ? await extractionRef.current : null
      if (data) setExtracted(data)
      setPhase('review')
    } catch (err: any) {
      setError(err.message || 'Extraction failed')
      setPhase('input')
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      {phase === 'pick' && (
        <SourcePicker
          onPick={(id) => { setSource(id); setPhase('input') }}
          onSkip={onSkip}
          url={url} setUrl={setUrl}
          onScan={() => { setSource('url'); runExtraction('url') }}
        />
      )}

      {phase === 'input' && source && (
        <SourceInput
          source={source} url={url} setUrl={setUrl}
          assetFile={assetFile} setAssetFile={setAssetFile}
          description={description} setDescription={setDescription}
          error={error}
          onBack={() => { setSource(null); setPhase('pick'); setError(null) }}
          onRun={() => runExtraction(source)}
        />
      )}

      {phase === 'scan' && source && (
        source === 'url'
          ? <SiteScan url={url} onDone={handleScanDone} />
          : <GenericScan source={source} onDone={handleScanDone} />
      )}

      {phase === 'review' && source && (
        <BrandReview
          source={source} extracted={extracted} kitNameDefault={kitNameDefault} accountId={accountId}
          onRedo={() => { setPhase('pick'); setSource(null); setExtracted(null) }}
          onConfirm={onConfirm}
        />
      )}
    </div>
  )
}

/* ---------- 1. Pick a source ---------- */

function SourcePicker({ onPick, onSkip, url, setUrl, onScan }: {
  onPick: (id: SourceId) => void; onSkip: () => void; url: string; setUrl: (v: string) => void; onScan: () => void
}) {
  return (
    <div>
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 26, letterSpacing: 'var(--tracking-tight)' }}>
          Where should we look for your <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, letterSpacing: 0 }}>brand</em>?
        </h2>
        <p style={{ marginTop: 7, fontSize: 'var(--text-body)', color: 'var(--text-muted)', maxWidth: 500 }}>
          If you have a website, that&apos;s the fastest route by a mile — we read your brand straight off the page.
        </p>
      </div>

      <ScanHero url={url} setUrl={setUrl} onScan={onScan} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '24px 0 14px' }}>
        <span style={{ height: 1, flex: 1, background: 'var(--border-hairline)' }} />
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>No website? Use one of these instead</span>
        <span style={{ height: 1, flex: 1, background: 'var(--border-hairline)' }} />
      </div>

      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 10 }}>
        {SOURCES.filter((s) => s.id !== 'url').map((s) => <SourceRow key={s.id} source={s} onClick={() => onPick(s.id)} />)}
      </div>

      <button type="button" onClick={onSkip} style={{ marginTop: 18, border: 'none', background: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', textDecoration: 'underline' }}>
        I&apos;ll set this up later — proposals will use Marg&apos;s default styling until I do
      </button>
    </div>
  )
}

function ScanHero({ url, setUrl, onScan }: { url: string; setUrl: (v: string) => void; onScan: () => void }) {
  const [focus, setFocus] = React.useState(false)
  return (
    <div className="liquid liquid-drift" style={{ padding: '26px 26px 24px', borderRadius: 'var(--radius-card-lg)' }}>
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 38, height: 38, borderRadius: 'var(--radius-pill)', background: 'var(--brand-22)', border: '1px solid var(--brand-38)', color: 'var(--brand-deep)' }}>
            <Icon name="globe" size={19} />
          </span>
          <span style={{ minWidth: 0 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 'var(--text-h4)', fontWeight: 600, letterSpacing: 'var(--tracking-tight)', color: 'var(--brand-ink)' }}>Scan my website</span>
              <Badge tone="new">Recommended</Badge>
            </span>
            <span style={{ display: 'block', marginTop: 3, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
              We visit the page, read your colours, fonts and heading styles, and show you what we found.
            </span>
          </span>
        </div>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 9, padding: '7px 7px 7px 15px', borderRadius: 'var(--radius-pill)',
          background: 'var(--surface-card)', border: '1px solid ' + (focus ? 'var(--brand)' : 'var(--brand-38)'),
          boxShadow: focus ? 'var(--ring-focus)' : 'none', transition: 'border-color var(--duration-base) var(--ease-standard),box-shadow var(--duration-base) var(--ease-standard)',
        }}>
          <Icon name="lock" size={14} color="var(--text-muted)" />
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="yourwebsite.com"
            onFocus={() => setFocus(true)} onBlur={() => setFocus(false)}
            onKeyDown={(e) => { if (e.key === 'Enter' && url) onScan() }}
            style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-body)', color: 'var(--text-primary)' }} />
          <Button variant="primary" icon="scan-search" onClick={onScan} disabled={!url}>Scan it</Button>
        </div>
      </div>
    </div>
  )
}

function SourceRow({ source, onClick }: { source: typeof SOURCES[number]; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="liquid liquid-hover" style={{
      display: 'flex', alignItems: 'center', gap: 11, padding: '13px 15px', textAlign: 'left', cursor: 'pointer',
      borderRadius: 'var(--radius-card)', fontFamily: 'var(--font-sans)', position: 'relative',
    }}>
      <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, flex: 'none', borderRadius: 'var(--radius-pill)', background: 'var(--brand-12)', color: 'var(--brand-deep)' }}>
        <Icon name={source.icon} size={15} />
      </span>
      <span style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 'var(--text-sm)', fontWeight: 500 }}>{source.label}</span>
          {!source.live && <Badge tone="draft">Coming soon</Badge>}
        </span>
        <span style={{ display: 'block', marginTop: 1, fontSize: 'var(--text-xs)', color: 'var(--text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{source.hint}</span>
      </span>
    </button>
  )
}

/* ---------- 2. Give us the thing ---------- */

function SourceInput({ source, url, setUrl, assetFile, setAssetFile, description, setDescription, error, onBack, onRun }: {
  source: SourceId; url: string; setUrl: (v: string) => void
  assetFile: File | null; setAssetFile: (f: File | null) => void
  description: string; setDescription: (v: string) => void
  error: string | null; onBack: () => void; onRun: () => void
}) {
  const meta: Record<SourceId, { title: string; cta: string; icon: string }> = {
    url: { title: 'What’s your website?', cta: 'Visit and scan it', icon: 'globe' },
    file: { title: 'Upload your brand guide', cta: 'Read the file', icon: 'file-text' },
    code: { title: 'Point us at your codebase', cta: 'Read the tokens', icon: 'code' },
    assets: { title: 'Upload a few assets', cta: 'Read the assets', icon: 'image' },
    describe: { title: 'Describe your brand', cta: 'Build it from this', icon: 'message-square' },
  }
  const m = meta[source]
  const live = SOURCES.find((s) => s.id === source)?.live

  return (
    <div>
      <button type="button" onClick={onBack} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, border: 'none', background: 'none', padding: 0, color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)' }}>
        <Icon name="arrow-left" size={14} /> Other options
      </button>
      <h2 style={{ fontSize: 24, letterSpacing: 'var(--tracking-tight)', marginBottom: 16 }}>{m.title}</h2>

      {source === 'url' && (
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
          <Input icon="globe" placeholder="yourwebsite.com" value={url} onChange={(e) => setUrl(e.target.value)} wrapperStyle={{ flex: 1 }} />
          <Button variant="primary" icon="scan-search" onClick={onRun} disabled={!url}>{m.cta}</Button>
        </div>
      )}

      {source === 'assets' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, padding: '40px 24px', textAlign: 'center',
            borderRadius: 'var(--radius-card-lg)', border: '1px dashed var(--brand-38)', background: 'var(--glass-quiet)', cursor: 'pointer',
          }}>
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 'var(--radius-pill)', background: 'var(--brand-12)', color: 'var(--brand-deep)' }}>
              <Icon name="image" size={19} />
            </span>
            <span style={{ fontSize: 'var(--text-body)', fontWeight: 500 }}>{assetFile ? assetFile.name : 'Drop screenshots or a deck'}</span>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>PNG, JPG, PDF</span>
            <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={(e) => setAssetFile(e.target.files?.[0] || null)} />
          </label>
          <Button variant="primary" icon="image" onClick={onRun} disabled={!assetFile} style={{ alignSelf: 'flex-start' }}>{m.cta}</Button>
        </div>
      )}

      {source === 'describe' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder='"Warm, editorial, deep green — like a design studio that also makes furniture. Serif headings, plenty of whitespace."'
            rows={5}
            hint="A few sentences is enough — what it feels like, any colours or references that come to mind."
          />
          <Button variant="primary" icon="message-square" onClick={onRun} disabled={!description.trim()} style={{ alignSelf: 'flex-start' }}>{m.cta}</Button>
        </div>
      )}

      {!live && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <DropZonePreview source={source} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Button variant="primary" icon={m.icon} disabled>{m.cta}</Button>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Coming soon — try &quot;Scan my website&quot;, &quot;Upload assets&quot;, or &quot;Describe it in words&quot; for now.</span>
          </div>
        </div>
      )}

      {error && <p style={{ marginTop: 12, fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)' }}>{error}</p>}
    </div>
  )
}

function DropZonePreview({ source }: { source: SourceId }) {
  const copy: Partial<Record<SourceId, { title: string; hint: string; icon: string }>> = {
    file: { title: 'Drop your brand guide here', hint: 'design.md, PDF, DOCX · up to 10 MB', icon: 'file-text' },
    code: { title: 'Drop a folder, or paste a repo URL', hint: 'We look for tokens, tailwind.config, CSS variables', icon: 'code' },
  }
  const c = copy[source]
  if (!c) return null
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 9, padding: '40px 24px', textAlign: 'center',
      borderRadius: 'var(--radius-card-lg)', border: '1px dashed var(--brand-38)', background: 'var(--glass-quiet)', opacity: 0.6,
    }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 42, height: 42, borderRadius: 'var(--radius-pill)', background: 'var(--brand-12)', color: 'var(--brand-deep)' }}>
        <Icon name={c.icon} size={19} />
      </span>
      <span style={{ fontSize: 'var(--text-body)', fontWeight: 500 }}>{c.title}</span>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{c.hint}</span>
      {source === 'code' && <Input icon="github" placeholder="github.com/you/site" disabled style={{ marginTop: 8, width: 'min(340px,100%)' }} />}
    </div>
  )
}

/* ---------- 3a. The site scan — we actually go there ---------- */

function SiteScan({ url, onDone }: { url: string; onDone: () => void }) {
  const [step, setStep] = React.useState(0)
  const doneRef = React.useRef(false)

  React.useEffect(() => {
    if (reduced()) { setStep(5); if (!doneRef.current) { doneRef.current = true; const t = setTimeout(onDone, 400); return () => clearTimeout(t) } return }
    if (step >= SCAN_STEPS.length - 1) {
      if (doneRef.current) return
      doneRef.current = true
      const t = setTimeout(onDone, 900)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setStep((s) => s + 1), step === 0 ? 900 : 820)
    return () => clearTimeout(t)
  }, [step])

  const scanning = step >= 1 && step < 5

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 11, marginBottom: 16 }}>
        {step >= 5 ? <Icon name="circle-check-big" size={19} color="var(--brand-deep)" /> : <Icon name="loader-circle" size={19} color="var(--brand-deep)" style={{ animation: 'spin 900ms linear infinite' }} />}
        <span style={{ fontSize: 'var(--text-body-lg)', fontWeight: 500, color: 'var(--brand-ink)' }}>{SCAN_STEPS[step].label}</span>
        {step < 5 && (
          <span style={{ display: 'inline-flex', gap: 3, alignItems: 'center' }}>
            {[0, 1, 2].map((i) => <span key={i} style={{ width: 4, height: 4, borderRadius: '50%', background: 'var(--brand-deep)', animation: 'dot-bounce 1.2s ' + (i * 160) + 'ms infinite ease-in-out' }} />)}
          </span>
        )}
      </div>

      <div style={{ borderRadius: 'var(--radius-card)', overflow: 'hidden', border: '1px solid var(--border-strong)', boxShadow: 'var(--shadow-raised)', background: 'var(--surface-card)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px', borderBottom: '1px solid var(--border-hairline)', background: 'var(--glass-quiet)' }}>
          <span style={{ display: 'flex', gap: 5 }}>
            {['#e5554e', '#e5b34e', '#4eb56a'].map((c) => <span key={c} style={{ width: 9, height: 9, borderRadius: '50%', background: c, opacity: 0.75 }} />)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 7, flex: 1, padding: '5px 11px', borderRadius: 'var(--radius-pill)', background: 'var(--surface-card)', border: '1px solid var(--border-hairline)', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-secondary)' }}>
            <Icon name="lock" size={10} color="var(--text-muted)" />{url}
          </span>
          <Icon name="scan-search" size={14} color="var(--brand-deep)" />
        </div>
        <div style={{ position: 'relative', height: 270, overflow: 'hidden', opacity: step === 0 ? 0 : 1, transition: 'opacity var(--duration-slow) var(--ease-standard)' }}>
          <MockSite />
          {scanning && (
            <>
              <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, height: 80, background: 'linear-gradient(180deg,rgba(124,188,220,0) 0%,rgba(124,188,220,0.22) 70%,rgba(124,188,220,0.55) 100%)', animation: 'scan-sweep 2.6s var(--ease-standard) infinite' }} />
              <span aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, height: 2, background: 'var(--brand-deep)', boxShadow: '0 0 14px var(--brand)', animation: 'scan-line 2.6s var(--ease-standard) infinite' }} />
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
        {SCAN_STEPS.slice(1, 5).map((s, i) => (
          <span key={s.label} style={{
            display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 12px', borderRadius: 'var(--radius-pill)', fontSize: 'var(--text-xs)',
            border: '1px solid ' + (step > i + 1 ? 'var(--brand-38)' : 'var(--border-hairline)'),
            background: step > i + 1 ? 'var(--brand-12)' : 'transparent', color: step > i + 1 ? 'var(--brand-ink)' : 'var(--text-muted)',
            transition: 'all var(--duration-base) var(--ease-standard)',
          }}>
            {step > i + 1 && <Icon name="check" size={11} color="var(--brand-deep)" />}{s.label}
          </span>
        ))}
      </div>
    </div>
  )
}

function MockSite() {
  return (
    <div style={{ padding: '16px 20px', fontFamily: 'var(--font-sans)', transform: 'scale(0.92)', transformOrigin: 'top left', width: '109%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
        <span style={{ fontSize: 15, fontWeight: 600, letterSpacing: '-0.03em', color: '#17384f' }}>yourbrand</span>
        <span style={{ flex: 1 }} />
        {['Work', 'Studio', 'Contact'].map((x) => <span key={x} style={{ fontSize: 10, color: '#6b7280' }}>{x}</span>)}
        <span style={{ padding: '4px 11px', borderRadius: 999, background: '#cfe4f2', border: '1px solid #7cbcdc', fontSize: 9, color: '#17384f' }}>Enquire</span>
      </div>
      <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.03em', lineHeight: 1.1, color: '#17384f', maxWidth: 330, marginBottom: 9 }}>
        Design that earns its <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400 }}>keep</em>
      </div>
      <div style={{ fontSize: 11, lineHeight: 1.6, color: '#6b7280', maxWidth: 300, marginBottom: 16 }}>
        A two-person studio building interfaces for teams who care about the details.
      </div>
      <div style={{ display: 'flex', gap: 9 }}>
        {[0, 1, 2].map((i) => <div key={i} style={{ flex: 1, height: 70, borderRadius: 8, background: i === 0 ? '#cfe4f2' : '#f1f5f8', border: '1px solid rgba(23,56,79,0.09)' }} />)}
      </div>
      <div style={{ display: 'flex', gap: 9, marginTop: 9 }}>
        {[0, 1].map((i) => <div key={i} style={{ flex: 1, height: 44, borderRadius: 8, background: '#f7f7f7', border: '1px solid rgba(23,56,79,0.07)' }} />)}
      </div>
    </div>
  )
}

/* ---------- 3b. Non-URL live sources get an honest, quieter read ---------- */

function GenericScan({ source, onDone }: { source: SourceId; onDone: () => void }) {
  const lines: Partial<Record<SourceId, string[]>> = {
    assets: ['Reading the image', 'Sampling dominant colours', 'Matching closest fonts', 'Brand read complete'],
    describe: ['Reading your description', 'Choosing colours that fit', 'Pairing fonts', 'Brand read complete'],
  }
  const seq = lines[source] || ['Reading', 'Brand read complete']
  const [step, setStep] = React.useState(0)
  const doneRef = React.useRef(false)

  React.useEffect(() => {
    if (reduced()) { setStep(seq.length - 1); if (!doneRef.current) { doneRef.current = true; const t = setTimeout(onDone, 400); return () => clearTimeout(t) } return }
    if (step >= seq.length - 1) {
      if (doneRef.current) return
      doneRef.current = true
      const t = setTimeout(onDone, 800)
      return () => clearTimeout(t)
    }
    const t = setTimeout(() => setStep((s) => s + 1), 760)
    return () => clearTimeout(t)
  }, [step])

  return (
    <div style={{ padding: '28px 26px', borderRadius: 'var(--radius-card-lg)', background: 'var(--glass-card)', border: '1px solid var(--border-glass)', backdropFilter: 'var(--blur-glass)' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {seq.map((l, i) => (
          <div key={l} style={{ display: 'flex', alignItems: 'center', gap: 11, opacity: i <= step ? 1 : 0.34, transition: 'opacity var(--duration-slow) var(--ease-standard)' }}>
            <Icon name={i < step ? 'circle-check-big' : 'loader-circle'} size={16} color={i < step ? 'var(--brand-deep)' : 'var(--text-muted)'} style={i === step ? { animation: 'spin 900ms linear infinite' } : undefined} />
            <span style={{ fontSize: 'var(--text-body)', color: i <= step ? 'var(--text-primary)' : 'var(--text-muted)' }}>{l}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------- 4. Review, upload the logo, confirm ---------- */

function BrandReview({ source, extracted, kitNameDefault, accountId, onRedo, onConfirm }: {
  source: SourceId; extracted: Extracted | null; kitNameDefault: string; accountId: string
  onRedo: () => void; onConfirm: () => void
}) {
  const seedColors = extracted
    ? [extracted.colors.primary, extracted.colors.secondary, extracted.colors.accent, extracted.colors.background, extracted.colors.text].filter(Boolean)
    : ['#7cbcdc', '#cfe4f2', '#17384f', '#f7f7f7']
  const [colors, setColors] = React.useState<string[]>(seedColors)
  const [heading, setHeading] = React.useState(extracted?.fonts.heading || FONT_OPTIONS.heading[0])
  const [body, setBody] = React.useState(extracted?.fonts.body || FONT_OPTIONS.body[0])
  const [accent, setAccent] = React.useState('None')
  const [name, setName] = React.useState(kitNameDefault)
  const scrapedLogo = extracted?.logoUrl || null
  const [logoUrl, setLogoUrl] = React.useState<string | null>(null)
  const [rejectedScrapedLogo, setRejectedScrapedLogo] = React.useState(false)
  const [uploadingLogo, setUploadingLogo] = React.useState(false)
  const [saving, setSaving] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const handleLogoUpload = async (file: File) => {
    setUploadingLogo(true)
    setError(null)
    try {
      const supabase = createClient()
      const ext = file.name.split('.').pop() || 'png'
      const path = `${accountId}/logo.${ext}`
      const { error: uploadError } = await supabase.storage.from('public-assets').upload(path, file, { upsert: true })
      if (uploadError) throw new Error(uploadError.message)
      setLogoUrl(supabase.storage.from('public-assets').getPublicUrl(path).data.publicUrl)
    } catch (err: any) {
      setError(err.message || 'Failed to upload logo')
    } finally {
      setUploadingLogo(false)
    }
  }

  const handleConfirm = async () => {
    if (!logoUrl) return
    setSaving(true)
    setError(null)
    try {
      await saveBrandKit({
        name,
        // source_type_enum is only ever 'url' | 'image' | 'document' | 'manual' — every other
        // SourceId (assets/describe/file/code) maps onto one of those four real values.
        source_type: source === 'assets' ? 'image' : source === 'describe' ? 'manual' : source === 'url' ? 'url' : 'document',
        source_reference: source,
        colors: { primary: colors[0], secondary: colors[1], accent: colors[2], background: colors[3], text: colors[4], extra: colors.slice(5) },
        fonts: { heading, body, accent },
        logoUrl,
      })
      onConfirm()
    } catch (err: any) {
      setError(err.message || 'Failed to save')
      setSaving(false)
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
        <Badge tone="accepted">Brand read</Badge>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
          {source === 'url' ? 'From your website' : 'From what you uploaded'}
        </span>
      </div>
      <h2 style={{ fontSize: 24, letterSpacing: 'var(--tracking-tight)', marginBottom: 6 }}>
        Here&apos;s what we <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, letterSpacing: 0 }}>found</em>
      </h2>
      <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-muted)', marginBottom: 20, maxWidth: 480 }}>
        Change anything that looks wrong. This is a starting point, not a verdict.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        <ReviewBlock title="Kit name">
          <Input value={name} onChange={(e) => setName(e.target.value)} wrapperStyle={{ maxWidth: 280 }} />
        </ReviewBlock>

        <ReviewBlock title="Colours" note="Click a swatch to change it">
          <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
            {colors.map((c, i) => <SwatchEdit key={i} value={c} onChange={(v) => setColors((cs) => cs.map((x, j) => j === i ? v : x))} index={i} />)}
            <button type="button" onClick={() => setColors((cs) => [...cs, '#3d4451'])} style={{ width: 44, height: 44, borderRadius: 'var(--radius-sm)', cursor: 'pointer', border: '1px dashed var(--brand-38)', background: 'transparent', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="plus" size={15} />
            </button>
          </div>
        </ReviewBlock>

        <ReviewBlock title="Type">
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            <TypeSlot label="Headings" value={heading} onChange={setHeading} options={FONT_OPTIONS.heading} />
            <TypeSlot label="Body" value={body} onChange={setBody} options={FONT_OPTIONS.body} />
            <TypeSlot label="Accent" value={accent} onChange={setAccent} options={FONT_OPTIONS.accent} serif />
          </div>
        </ReviewBlock>

        <ReviewBlock title="Logo" note={scrapedLogo && !rejectedScrapedLogo && !logoUrl ? 'We found this on your site — confirm it looks right' : 'Upload your own if the automatic grab isn’t good enough'}>
          {scrapedLogo && !rejectedScrapedLogo && !logoUrl ? (
            <ScrapedLogoChoice logoUrl={scrapedLogo} onAccept={() => setLogoUrl(scrapedLogo)} onReject={() => setRejectedScrapedLogo(true)} />
          ) : (
            <LogoUpload uploaded={logoUrl} uploading={uploadingLogo} onUpload={handleLogoUpload} onClear={() => setLogoUrl(null)} />
          )}
        </ReviewBlock>
      </div>

      {error && <p style={{ marginBottom: 12, fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)' }}>{error}</p>}

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
        <Button variant="primary" iconRight="arrow-right" disabled={!logoUrl} loading={saving} onClick={handleConfirm}>
          {logoUrl ? 'This is right — save my kit' : 'Upload a logo to continue'}
        </Button>
        <Button variant="ghost" icon="rotate-ccw" onClick={onRedo}>Try a different source</Button>
      </div>
    </div>
  )
}

function ReviewBlock({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '16px 18px', borderRadius: 'var(--radius-card)', background: 'var(--surface-card)', border: '1px solid var(--border-hairline)' }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <span className="eyebrow">{title}</span>
        {note && <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{note}</span>}
      </div>
      {children}
    </div>
  )
}

function SwatchEdit({ value, onChange, index }: { value: string; onChange: (v: string) => void; index: number }) {
  const [open, setOpen] = React.useState(false)
  const options = ['#7cbcdc', '#cfe4f2', '#17384f', '#f7f7f7', '#2f7fbf', '#3d4451', '#e8dcc8', '#1f4d3d']
  return (
    <span style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label={'Colour ' + (index + 1) + ', ' + value} style={{
        width: 44, height: 44, borderRadius: 'var(--radius-sm)', background: value, cursor: 'pointer',
        border: '1px solid ' + (open ? 'var(--brand-deep)' : 'var(--border-strong)'), boxShadow: open ? 'var(--ring-focus)' : 'none',
        transition: 'box-shadow var(--duration-base) var(--ease-standard)',
      }} />
      {open && (
        <span style={{ position: 'absolute', top: 52, left: 0, zIndex: 30, display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 6, padding: 8, borderRadius: 'var(--radius-card)', background: 'var(--glass-panel)', backdropFilter: 'var(--blur-glass)', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-raised)', animation: 'fade-up var(--duration-base) var(--ease-out-soft) both' }}>
          {options.map((o) => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false) }} aria-label={o} style={{ width: 26, height: 26, borderRadius: 'var(--radius-xs)', background: o, cursor: 'pointer', border: '1px solid ' + (o === value ? 'var(--brand-deep)' : 'var(--border-hairline)') }} />
          ))}
        </span>
      )}
    </span>
  )
}

function TypeSlot({ label, value, onChange, options, serif }: { label: string; value: string; onChange: (v: string) => void; options: string[]; serif?: boolean }) {
  const [open, setOpen] = React.useState(false)
  const allOptions = options.includes(value) ? options : [value, ...options]
  return (
    <span style={{ position: 'relative' }}>
      <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginBottom: 5 }}>{label}</span>
      <button type="button" onClick={() => setOpen((o) => !o)} style={{
        display: 'inline-flex', alignItems: 'center', gap: 9, padding: '7px 13px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
        background: 'transparent', border: '1px solid ' + (open ? 'var(--brand)' : 'var(--border-hairline)'),
        fontFamily: serif ? 'var(--font-serif)' : 'var(--font-sans)', fontStyle: serif ? 'italic' : 'normal', fontSize: 'var(--text-body)', color: 'var(--text-primary)',
      }}>
        {value}<Icon name="chevron-down" size={14} color="var(--text-muted)" />
      </button>
      {open && (
        <span style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, zIndex: 30, minWidth: 170, padding: 6, borderRadius: 'var(--radius-card)', background: 'var(--glass-panel)', backdropFilter: 'var(--blur-glass)', border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-raised)', animation: 'fade-up var(--duration-base) var(--ease-out-soft) both' }}>
          {allOptions.map((o) => (
            <button key={o} type="button" onClick={() => { onChange(o); setOpen(false) }} style={{ display: 'block', width: '100%', padding: '8px 10px', border: 'none', borderRadius: 'var(--radius-sm)', textAlign: 'left', cursor: 'pointer', background: o === value ? 'var(--brand-12)' : 'transparent', fontFamily: serif ? 'var(--font-serif)' : 'var(--font-sans)', fontStyle: serif ? 'italic' : 'normal', fontSize: 'var(--text-sm)', color: 'var(--text-primary)' }}>{o}</button>
          ))}
        </span>
      )}
    </span>
  )
}

function LogoUpload({ uploaded, uploading, onUpload, onClear }: { uploaded: string | null; uploading: boolean; onUpload: (f: File) => void; onClear: () => void }) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  if (uploaded) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 'var(--radius-card)', background: 'var(--brand-12)', border: '1px solid var(--brand-38)' }}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 'var(--radius-sm)', background: 'var(--surface-card)', border: '1px solid var(--border-hairline)', overflow: 'hidden' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={uploaded} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 'var(--text-body)', fontWeight: 500 }}>Logo uploaded</span>
          <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>Shown on every proposal in this kit</span>
        </span>
        <Button variant="ghost" size="sm" onClick={onClear}>Replace</Button>
      </div>
    )
  }
  return (
    <label onClick={() => inputRef.current?.click()} style={{
      display: 'flex', alignItems: 'center', gap: 14, padding: '18px 16px', cursor: uploading ? 'wait' : 'pointer',
      borderRadius: 'var(--radius-card)', border: '1px dashed var(--brand-38)', background: 'transparent', transition: 'all var(--duration-base) var(--ease-standard)',
    }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 44, height: 44, flex: 'none', borderRadius: 'var(--radius-pill)', background: 'var(--brand-12)', color: 'var(--brand-deep)' }}>
        <Icon name={uploading ? 'loader-circle' : 'upload'} size={19} style={uploading ? { animation: 'spin 900ms linear infinite' } : undefined} />
      </span>
      <span>
        <span style={{ display: 'block', fontSize: 'var(--text-body)', fontWeight: 500 }}>{uploading ? 'Uploading…' : 'Drop your logo, or click to choose'}</span>
        <span style={{ display: 'block', marginTop: 2, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>SVG or transparent PNG · required</span>
      </span>
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }} disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f) }} />
    </label>
  )
}

function ScrapedLogoChoice({ logoUrl, onAccept, onReject }: { logoUrl: string; onAccept: () => void; onReject: () => void }) {
  const [broken, setBroken] = React.useState(false)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 'var(--radius-card)', background: 'var(--surface-card)', border: '1px solid var(--border-hairline)' }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 'var(--radius-sm)', background: 'var(--glass-quiet)', border: '1px solid var(--border-hairline)', overflow: 'hidden', flex: 'none' }}>
        {broken ? (
          <Icon name="image" size={19} color="var(--text-muted)" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="Logo found on your site" onError={() => setBroken(true)} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
        )}
      </span>
      <span style={{ flex: 1, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 'var(--text-body)', fontWeight: 500 }}>{broken ? 'Couldn’t load the logo we found' : 'Is this your logo?'}</span>
        <span style={{ display: 'block', fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{broken ? 'Upload your own instead' : 'Pulled from your site — use it, or upload your own'}</span>
      </span>
      {broken ? (
        <Button variant="ghost" size="sm" onClick={onReject}>Upload instead</Button>
      ) : (
        <span style={{ display: 'flex', gap: 8, flex: 'none' }}>
          <Button variant="ghost" size="sm" onClick={onReject}>Not this</Button>
          <Button variant="primary" size="sm" onClick={onAccept}>Use this logo</Button>
        </span>
      )}
    </div>
  )
}
