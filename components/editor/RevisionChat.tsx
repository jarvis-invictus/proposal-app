'use client'

import * as React from 'react'
import { PromptInput } from '@/components/ui/PromptInput'
import { Icon } from '@/components/ui/Icon'

type Msg = { id: string; role: 'user' | 'assistant' | 'error'; text: string }

export function RevisionChat({ proposalId, content, brandKitId, disabled, onApply }: {
  proposalId: string
  content: any
  brandKitId: string | null
  disabled?: boolean
  onApply: (changes: Record<string, any>) => void
}) {
  const [messages, setMessages] = React.useState<Msg[]>([
    { id: 'intro', role: 'assistant', text: 'Tell me what to change — "make the Essential package $500 cheaper", "make the tone more premium", "add a third package". I\'ll update the document directly.' },
  ])
  const [input, setInput] = React.useState('')
  const [loading, setLoading] = React.useState(false)
  const endRef = React.useRef<HTMLDivElement>(null)

  React.useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }) }, [messages, loading])

  const send = async () => {
    const instruction = input.trim()
    if (!instruction || loading) return
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
      onApply(data.changes || {})
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'assistant', text: data.summary || 'Done.' }])
    } catch (err: any) {
      setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: 'error', text: err.message || "Couldn't process that — try rephrasing it." }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', borderLeft: '1px solid var(--border-hairline)', background: 'var(--surface-page)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 18px', borderBottom: '1px solid var(--border-hairline)', flex: 'none' }}>
        <Icon name="sparkles" size={16} color="var(--brand-deep)" />
        <span style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--text-primary)' }}>Ask for changes</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {messages.map((m) => <ChatBubble key={m.id} msg={m} />)}
        {loading && (
          <div style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 7, padding: '8px 2px', color: 'var(--text-muted)', fontSize: 'var(--text-sm)' }}>
            <Icon name="loader-circle" size={13} style={{ animation: 'spin 900ms linear infinite' }} />
            Rewriting…
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
          placeholder={disabled ? 'Locked — signed proposals can\'t be revised' : 'e.g. make the Complete package cheaper'}
          style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
        />
      </div>
    </div>
  )
}

// Deliberately a plain solid surface, not the glass-panel-per-bubble treatment the intake chat
// uses — that reads fine for a couple of isolated messages, but looks noisy over a long,
// densely-scrolling log, which is exactly what this panel becomes.
function ChatBubble({ msg }: { msg: Msg }) {
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
