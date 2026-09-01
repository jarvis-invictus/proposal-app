'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
import { useChat } from 'ai/react'
import { SkyBackdrop } from '@/components/app/AppShell'
import { Modal } from '@/components/app/Modal'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { Badge } from '@/components/ui/Badge'
import { Pill } from '@/components/ui/Pill'
import { PromptInput } from '@/components/ui/PromptInput'
import { SelectMenu } from '@/components/ui/SelectMenu'
import { Logo } from '@/components/ui/Logo'
import { GeneratingScreen, type Preview } from './GeneratingScreen'

export type PastProposalRef = { id: string; title: string; client: string }
export type BrandKitPreview = { name: string; colors: { primary?: string; secondary?: string; accent?: string } | null; headingFont: string | null }
export type TemplateSeed = { id: string; name: string; category: string } | null

const STARTERS = [
  { id: 'fixed', icon: 'briefcase', q: 'A project with a fixed scope and price', hint: 'Redesign, build, launch — one deliverable, one number.',
    seed: 'Fixed-scope project: dashboard redesign. Two tiers — $32k design only, $50k with the React build. 12 weeks, two rounds of revisions per milestone, 50% upfront.' },
  { id: 'retainer', icon: 'repeat', q: 'An ongoing retainer', hint: 'Monthly work, rolling deliverables.',
    seed: 'Monthly design retainer, 6 months.' },
  { id: 'discovery', icon: 'search', q: 'A discovery or audit engagement', hint: 'A short paid diagnosis before the real work.',
    seed: 'Two-week discovery sprint, $12k.' },
  { id: 'notes', icon: 'file-text', q: 'I already have notes — let me paste them', hint: "Dump anything. I'll sort it out.", seed: '' },
] as const

type GenResult = { ok: true; id: string } | { ok: false; error: string; partial?: unknown }

export function NewProposalClient({
  firstName, pastProposals, brandKit, starter, template,
}: {
  firstName: string
  pastProposals: PastProposalRef[]
  brandKit: BrandKitPreview | null
  starter: string | null
  template: TemplateSeed
}) {
  const router = useRouter()
  const [phase, setPhase] = React.useState<'intake' | 'review' | 'generating' | 'error'>('intake')
  const [summary, setSummary] = React.useState('')
  const [preview, setPreview] = React.useState<Preview | null>(null)
  const [showRaw, setShowRaw] = React.useState(false)
  const [confirmClient, setConfirmClient] = React.useState('')
  const [saveError, setSaveError] = React.useState('')
  const [generatedProposal, setGeneratedProposal] = React.useState<unknown>(null)
  const [listening, setListening] = React.useState(false)
  const [reference, setReference] = React.useState<PastProposalRef | null>(null)
  const recognitionRef = React.useRef<any>(null)
  const endRef = React.useRef<HTMLSpanElement>(null)
  const seededRef = React.useRef(false)

  const { messages, input, handleInputChange, handleSubmit, append, setMessages, isLoading } = useChat({
    onToolCall: ({ toolCall }) => {
      if (toolCall.toolName === 'finalize_proposal_details') {
        const args = toolCall.args as any
        setSummary(args.summary)
        setPreview(args.preview)
        setConfirmClient(args.preview?.clientName || '')
        setPhase('review')
      }
    },
  })

  React.useEffect(() => {
    if (endRef.current) endRef.current.scrollIntoView({ block: 'end' })
  }, [messages, isLoading])

  // Arriving from a template ("Use this template") or a dashboard quick-start chip (?starter=).
  React.useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    if (template) {
      append({ role: 'user', content: `I'd like to use the "${template.name}" template (${template.category}). Let's start from there.` })
    } else if (starter) {
      const s = STARTERS.find((x) => x.id === starter)
      if (s?.seed) append({ role: 'user', content: s.seed })
      else if (s) setMessages([{ id: 'seed-notes', role: 'assistant', content: "Go ahead and paste whatever you have — notes, a transcript, a rough email. I'll pull out what matters." }])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const start = (s: (typeof STARTERS)[number]) => {
    if (!s.seed) {
      setMessages([{ id: 'seed-notes', role: 'assistant', content: "Go ahead and paste whatever you have — notes, a transcript, a rough email. I'll pull out what matters." }])
      return
    }
    append({ role: 'user', content: s.seed })
  }

  const toggleMic = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return
    if (listening) {
      recognitionRef.current?.stop()
      return
    }
    const recognition = new SpeechRecognition()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = false
    recognition.onresult = (e: any) => {
      const transcript = Array.from(e.results).map((r: any) => r[0].transcript).join(' ')
      handleInputChange({ target: { value: (input ? input + ' ' : '') + transcript } } as any)
    }
    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  const runGeneration = async (finalSummary: string): Promise<GenResult> => {
    const res = await fetch('/api/generate-proposal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ summary: finalSummary }),
    })
    const data = await res.json()
    if (!res.ok) return { ok: false, error: data.error || 'Failed to generate the proposal.' }
    const saveRes = await fetch('/api/proposals', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content: data }),
    })
    const saved = await saveRes.json()
    if (!saveRes.ok) return { ok: false, error: saved.error || 'Failed to save the proposal.', partial: data }
    return { ok: true, id: saved.id }
  }

  if (phase === 'error') {
    return (
      <div style={{ maxWidth: 640, margin: '48px auto 0', padding: 28, borderRadius: 'var(--radius-card-lg)', background: 'var(--surface-card)', border: '1px solid var(--border-hairline)', fontFamily: 'var(--font-sans)' }}>
        <h2 style={{ fontSize: 'var(--text-h4)', margin: '0 0 8px' }}>Couldn&apos;t save the proposal</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 16 }}>{saveError}</p>
        {!!generatedProposal && (
          <>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginBottom: 8 }}>The generated content is below — nothing was lost, it just didn&apos;t save. Try again or copy it manually.</p>
            <pre style={{ background: 'var(--surface-sunken)', padding: 16, borderRadius: 'var(--radius-sm)', overflow: 'auto', fontSize: 'var(--text-xs)', fontFamily: 'var(--font-mono)', border: '1px solid var(--border-hairline)' }}>
              {JSON.stringify(generatedProposal, null, 2)}
            </pre>
          </>
        )}
        <Button variant="primary" style={{ marginTop: 16 }} onClick={() => setPhase('review')}>Back to review</Button>
      </div>
    )
  }

  if (phase === 'generating' && preview) {
    return (
      <GeneratingScreen preview={preview} brandKit={brandKit}
        onGenerate={() => runGeneration(summary)}
        onDone={(result) => router.push(`/dashboard/proposals/${result.id}/edit`)}
        onError={(message, partial) => { setSaveError(message); setGeneratedProposal(partial ?? null); setPhase('error') }} />
    )
  }

  const started = messages.length > 0

  return (
    <div style={{ position: 'relative', height: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--gradient-app)' }}>
      <SkyBackdrop />
      <div style={{ position: 'relative', zIndex: 2, display: 'flex', alignItems: 'center', padding: '18px 24px' }}>
        <Button variant="ghost" size="sm" icon="arrow-left" onClick={() => router.push('/dashboard')}>Back</Button>
        <span style={{ flex: 1 }} />
        <Button variant="ghost" size="sm" icon="layout-template" onClick={() => router.push('/dashboard/templates')}>Use a template</Button>
      </div>

      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: started ? 'flex-start' : 'center', padding: '0 24px 30px' }}>
        <div style={{ width: 'min(720px,100%)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
          {!started && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px 14px 16px', borderRadius: 'var(--radius-card-lg)', background: 'var(--surface-glass-sky)', backdropFilter: 'var(--blur-glass)', border: '1px solid var(--brand-38)', boxShadow: 'var(--shadow-brand)' }}>
                <Logo size={26} />
                <span style={{ fontSize: 'var(--text-body-lg)', color: 'var(--brand-ink)' }}>
                  Hi {firstName} — what kind of work are we <em style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic' }}>proposing</em>?
                </span>
              </div>
              <div style={{ width: '100%', display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 12 }}>
                {STARTERS.map((s) => <StarterCard key={s.id} starter={s} onClick={() => start(s)} />)}
              </div>
            </div>
          )}

          {started && (
            <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 8 }}>
              {messages.filter((m) => m.role === 'user' || m.role === 'assistant').map((m) => {
                if (m.role === 'assistant' && (m as any).toolInvocations?.length) return null
                if (!m.content) return null
                return <Bubble key={m.id} who={m.role === 'user' ? 'you' : 'ai'} text={m.content} />
              })}
              {isLoading && <TypingBubble />}
              <span ref={endRef} />
            </div>
          )}

          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', bottom: 0, paddingBottom: 4 }}>
            <PromptInput size={started ? 'sm' : 'lg'} value={input} onChange={(e) => handleInputChange(e as React.ChangeEvent<HTMLTextAreaElement>)} onSubmit={() => handleSubmit()}
              listening={listening} onToggleMic={toggleMic}
              placeholder={started ? 'Type your answer…' : 'Or just describe the deal in your own words…'} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <ReferenceChip value={reference} options={pastProposals} onSelect={setReference} />
              <span style={{ flex: 1 }} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
                <Icon name="lock" size={14} /> Private until you share it.
              </span>
            </div>
          </div>
        </div>
      </div>

      <Modal open={phase === 'review'} eyebrow="Confirm before we build" title="Here's what we'll generate" onClose={() => setPhase('intake')} width={580}
        footer={
          <>
            <SelectMenu label="Creating for:" value={confirmClient}
              options={Array.from(new Set(pastProposals.map((p) => p.client)))}
              onSelect={setConfirmClient} />
            <span style={{ flex: 1 }} />
            <Button variant="ghost" onClick={() => setPhase('intake')}>Back</Button>
            <Button variant="primary" iconRight="arrow-right" onClick={() => setPhase('generating')}>Generate proposal</Button>
          </>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 2 }}>
            {brandKit && <Pill tone="solid" size="sm" icon="palette">{brandKit.name}</Pill>}
            {preview && <Pill tone="solid" size="sm" icon="layers">{preview.packageCount} {preview.packageCount === 1 ? 'package' : 'tiers'}</Pill>}
            {preview && <Pill tone="solid" size="sm" icon="calendar">{preview.timeline}</Pill>}
            {reference && <Pill tone="solid" size="sm" icon="files">Styled like &ldquo;{reference.title}&rdquo;</Pill>}
          </div>
          {([
            ['Header & cover', 'Client name, date, validity window'],
            ['Executive summary', 'A short summary in your voice'],
            ['Packages', preview ? `${preview.packageCount} ${preview.packageCount === 1 ? 'package' : 'packages'} · ${preview.priceRange}` : ''],
            ['Deliverables', 'Listed per package as a checklist'],
            ['Terms', preview?.terms || ''],
            ['Payment schedule', preview?.paymentSchedule || ''],
          ] as const).map(([t, d]) => (
            <div key={t} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '11px 13px', borderRadius: 'var(--radius-sm)', background: 'var(--glass-card)', border: '1px solid var(--border-glass)' }}>
              <Icon name="check" size={15} color="var(--brand-deep)" style={{ marginTop: 3 }} />
              <div><div style={{ fontSize: 'var(--text-body)', fontWeight: 500 }}>{t}</div><div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{d}</div></div>
            </div>
          ))}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
            <Badge tone="new">Editable after generating</Badge>
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>Payment details come from Settings — nothing to enter here.</span>
          </div>
          <button type="button" onClick={() => setShowRaw((v) => !v)}
            style={{ alignSelf: 'flex-start', marginTop: 6, border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--brand-deep)', fontFamily: 'var(--font-sans)' }}>
            {showRaw ? 'Hide extracted details' : 'Edit the extracted details'}
          </button>
          {showRaw && (
            <textarea value={summary} onChange={(e) => setSummary(e.target.value)}
              style={{ width: '100%', height: 180, padding: 14, resize: 'vertical', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)', background: 'var(--surface-sunken)', outline: 'none', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--text-primary)' }} />
          )}
        </div>
      </Modal>
    </div>
  )
}

function StarterCard({ starter, onClick }: { starter: (typeof STARTERS)[number]; onClick: () => void }) {
  const [hover, setHover] = React.useState(false)
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 8, padding: '16px 18px', textAlign: 'left',
        borderRadius: 'var(--radius-card)', cursor: 'pointer', fontFamily: 'var(--font-sans)',
        background: hover ? 'var(--glass-card-hover)' : 'var(--glass-card)',
        backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
        border: '1px solid ' + (hover ? 'var(--brand)' : 'var(--border-glass)'),
        boxShadow: hover ? 'var(--shadow-brand)' : 'none', transform: hover ? 'translateY(-3px)' : 'none',
        transition: 'all var(--duration-base) var(--ease-spring)',
      }}>
      <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 'var(--radius-pill)', background: 'var(--brand-12)', color: 'var(--brand-deep)' }}>
        <Icon name={starter.icon} size={15} />
      </span>
      <span style={{ fontSize: 'var(--text-body)', fontWeight: 500, color: 'var(--brand-ink)' }}>{starter.q}</span>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', lineHeight: 'var(--leading-snug)' }}>{starter.hint}</span>
    </button>
  )
}

function Bubble({ who, text }: { who: 'you' | 'ai'; text: string }) {
  const you = who === 'you'
  return (
    <div style={{ display: 'flex', justifyContent: you ? 'flex-end' : 'flex-start', gap: 10 }}>
      {!you && <Logo size={22} style={{ marginTop: 9, opacity: 0.9 }} />}
      <div style={{ maxWidth: '76%', display: 'flex', flexDirection: 'column', gap: 10, alignItems: you ? 'flex-end' : 'flex-start' }}>
        <div style={{
          padding: '13px 17px', borderRadius: 'var(--radius-card)', fontSize: 'var(--text-body)', lineHeight: 'var(--leading-body)',
          background: you ? 'var(--brand-deep)' : 'var(--glass-panel)', color: you ? 'var(--text-inverse)' : 'var(--text-primary)',
          backdropFilter: you ? 'none' : 'var(--blur-glass)', border: '1px solid ' + (you ? 'var(--brand-deep)' : 'var(--border-glass)'),
          whiteSpace: 'pre-wrap',
        }}>{text}</div>
      </div>
    </div>
  )
}

function TypingBubble() {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
      <Logo size={22} style={{ opacity: 0.9 }} />
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '14px 18px', borderRadius: 'var(--radius-card)', background: 'var(--glass-panel)', backdropFilter: 'var(--blur-glass)', border: '1px solid var(--border-glass)' }}>
        {[0, 1, 2].map((i) => <span key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--brand-deep)', animation: 'dot-bounce 1.2s ' + (i * 160) + 'ms infinite ease-in-out' }} />)}
      </div>
    </div>
  )
}

function ReferenceChip({ value, options, onSelect }: { value: PastProposalRef | null; options: PastProposalRef[]; onSelect: (v: PastProposalRef | null) => void }) {
  const [open, setOpen] = React.useState(false)
  return (
    <span style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8, padding: '7px 14px', borderRadius: 'var(--radius-pill)', cursor: 'pointer',
          border: '1px solid ' + (value ? 'var(--brand)' : 'var(--border-hairline)'),
          background: value ? 'var(--brand-tint)' : 'var(--glass-quiet)',
          color: value ? 'var(--brand-ink)' : 'var(--text-secondary)', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)',
        }}>
        <Icon name="files" size={15} />{value ? `Referencing "${value.title}"` : 'Reference a past proposal'}
      </button>
      {open && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, width: 280, padding: 6, zIndex: 40,
          background: 'var(--glass-panel)', backdropFilter: 'var(--blur-glass)', WebkitBackdropFilter: 'var(--blur-glass)',
          border: '1px solid var(--border-glass)', borderRadius: 'var(--radius-card)', boxShadow: 'var(--shadow-brand)',
        }}>
          {options.length === 0 && <div style={{ padding: '10px 12px', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>No past proposals yet</div>}
          {options.map((p) => (
            <MenuRow key={p.id} onClick={() => { onSelect(p); setOpen(false) }}>{p.client} — {p.title}</MenuRow>
          ))}
          {value && <MenuRow onClick={() => { onSelect(null); setOpen(false) }}>Clear reference</MenuRow>}
        </div>
      )}
    </span>
  )
}

function MenuRow({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  const [hover, setHover] = React.useState(false)
  return (
    <button type="button" onClick={onClick} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 10px', border: 'none', textAlign: 'left',
        borderRadius: 'var(--radius-sm)', background: hover ? 'var(--ink-06)' : 'transparent', cursor: 'pointer',
        fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)',
      }}>
      <Icon name="file-text" size={14} color="var(--text-muted)" />
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{children}</span>
    </button>
  )
}
