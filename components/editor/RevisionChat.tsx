'use client'

import * as React from 'react'
import { PromptInput } from '@/components/ui/PromptInput'
import { Icon } from '@/components/ui/Icon'
import { Button } from '@/components/ui/Button'

type Msg =
  | { id: string; role: 'user' | 'assistant' | 'error'; text: string }
  | { id: string; role: 'pending'; text: string; changes: Record<string, any> }
  | { id: string; role: 'applied' | 'discarded'; text: string }

export function RevisionChat({ proposalId, content, brandKitId, disabled, onApply }: {
  proposalId: string
  content: any
  brandKitId: string | null
  disabled?: boolean
  onApply: (changes: Record<string, any>) => void
}) {
  const [messages, setMessages] = React.useState<Msg[]>([
    { id: 'intro', role: 'assistant', text: 'Tell me what to change — "make the Essential package $500 cheaper", "make the tone more premium", "add a third package". I\'ll show you what I\'d change before anything is applied.' },
  ])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const endRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages, loading])

  // Only one open request at a time — a pending change should be resolved (applied or
  // discarded) before asking for another, so it's always clear what "apply" would apply.
  const hasPending = messages.some((m) => m.role === 'pending')

  const send = async () => {
    const instruction = input.trim()
    if (!instruction || loading || hasPending) return
    setInput('')
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'user', text: instruction }])
    setLoading(true)
    try {
      const res = await fetch(`/api/proposals/${proposalId}/revise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, instruction, brandKitId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Something went wrong')
      const changes = data.changes || {}
      if (!Object.keys(changes).length) {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: data.summary || "Nothing to change." }])
      } else {
        setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'pending', text: data.summary || 'Ready to apply this change.', changes }])
      }
    } catch (err: any) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'error', text: err.message || "Couldn't process that — try rephrasing it." }])
    } finally {
      setLoading(false)
    }
  }

  const resolvePending = (id: string, apply: boolean, changes?: Record<string, any>) => {
    if (apply && changes) onApply(changes)
    setMessages((prev) => prev.map((m) => m.id === id
      ? { id, role: apply ? 'applied' : 'discarded', text: apply ? 'Applied.' : 'Discarded — nothing changed.' }
      : m))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid var(--border-hairline)', background: 'var(--surface-page)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 18px', borderBottom: '1px solid var(--border-hairline)', flex: 'none' }}>
        <Icon name="sparkles" size={16} color="var(--brand-deep)" />
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>Ask for changes</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m) => (
          m.role === 'pending'
            ? <PendingBubble key={m.id} msg={m} onResolve={(apply) => resolvePending(m.id, apply, m.changes)} />
            : <ChatBubble key={m.id} msg={m} />
        ))}
        {loading && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7, padding: '8px 2px', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            <Icon name="loader-circle" size={13} style={{ animation: 'spin 900ms linear infinite' }} />
            Working it out…
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ padding: '12px 14px 14px', flex: 'none' }}>
        <PromptInput
          size="sm"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onSubmit={send}
          placeholder={disabled ? 'Locked — signed proposals can\'t be revised' : hasPending ? 'Resolve the change above first' : 'e.g. make the Complete package cheaper'}
          style={disabled || hasPending ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
        />
      </div>
    </div>
  )
}

// A proposed change the model hasn't applied yet — shown with an explicit Apply/Discard choice
// instead of taking effect the moment a response comes back. Fields it would actually touch are
// listed by name so "what will this do" is answerable before committing, not after.
function PendingBubble({ msg, onResolve }: { msg: Extract<Msg, { role: 'pending' }>; onResolve: (apply: boolean) => void }) {
  const fields = Object.keys(msg.changes)
  return (
    <div style={{ alignSelf: 'flex-start', maxWidth: '92%', width: '92%' }}>
      <div style={{
        padding: '10px 13px', borderRadius: 'var(--radius-card)', fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-snug)',
        background: 'var(--surface-card)', border: '1px solid var(--brand-38)', color: 'var(--text-primary)',
      }}>
        <div style={{ marginBottom: 8 }}>{msg.text}</div>
        {fields.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
            {fields.map((f) => (
              <span key={f} style={{ fontSize: 'var(--text-xs)', padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: 'var(--brand-12)', color: 'var(--brand-deep)', fontFamily: 'var(--font-mono)' }}>
                {f}
              </span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="primary" size="sm" onClick={() => onResolve(true)}>Apply</Button>
          <Button variant="ghost" size="sm" onClick={() => onResolve(false)}>Discard</Button>
        </div>
      </div>
    </div>
  )
}

// Deliberately a plain solid surface, not the glass-panel-per-bubble treatment the intake chat
// uses — that reads fine for a couple of isolated messages, but looks noisy over a long,
// densely-scrolling log, which is exactly what this panel becomes.
function ChatBubble({ msg }: { msg: Exclude<Msg, { role: 'pending' }> }) {
  const you = msg.role === 'user'
  const isError = msg.role === 'error'
  return (
    <div style={{ display: 'flex', justifyContent: you ? 'flex-end' : 'flex-start' }}>
      <div style={{
        maxWidth: '88%', padding: '9px 13px', borderRadius: 'var(--radius-card)',
        fontSize: 'var(--text-sm)', lineHeight: 'var(--leading-snug)',
        background: you ? 'var(--brand-deep)' : isError ? 'var(--status-caution-surface)' : 'var(--surface-card)',
        color: you ? 'var(--text-inverse)' : isError ? 'var(--status-caution-text)' : 'var(--text-primary)',
        border: you ? 'none' : `1px solid ${isError ? 'var(--status-caution-border)' : 'var(--border-hairline)'}`,
        whiteSpace: 'pre-wrap',
      }}>
        {msg.text}
      </div>
    </div>
  )
}
