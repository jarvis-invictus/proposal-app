'use client'

import * as React from 'react'
import { IconButton } from '@/components/ui/IconButton'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'
import { uploadAttachment, type Attachment } from '@/lib/attachments'

export interface AttachmentsBlockProps {
  attachments: Attachment[]
  onChange: (next: Attachment[]) => void
  accountId: string
  proposalId: string
}

export function AttachmentsBlock({ attachments, onChange, accountId, proposalId }: AttachmentsBlockProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState('')

  const updateCaption = (index: number, caption: string) => {
    onChange(attachments.map((a, i) => (i === index ? { ...a, caption } : a)))
  }

  const removeAttachment = (index: number) => {
    const label = attachments[index]?.caption || `this ${attachments[index]?.type || 'attachment'}`
    if (!window.confirm(`Remove ${label}? This can't be undone.`)) return
    onChange(attachments.filter((_, i) => i !== index))
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setError('')
    try {
      const attachment = await uploadAttachment(accountId, proposalId, file)
      onChange([...attachments, attachment])
    } catch (err: any) {
      setError(err.message || 'Failed to upload')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div style={{ padding: '32px 40px', borderBottom: '1px solid var(--border-hairline)' }}>
      <h2 style={{ fontFamily: 'var(--font-serif)', fontStyle: 'italic', fontWeight: 400, fontSize: 25, letterSpacing: 0, marginBottom: 20 }}>Attachments</h2>
      {attachments.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 16, marginBottom: 16 }}>
          {attachments.map((a, idx) => (
            <div key={a.url} style={{ borderRadius: 'var(--radius-card)', border: '1px solid var(--border-hairline)', overflow: 'hidden', background: 'var(--surface-sunken)' }}>
              <div style={{ position: 'relative', aspectRatio: '16/10', background: 'var(--ink-06)' }}>
                {a.type === 'video' ? (
                  <video src={a.url} controls preload="metadata" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={a.url} alt={a.caption || 'Attachment'} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                )}
                <span style={{ position: 'absolute', top: 6, left: 6, display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 'var(--radius-pill)', background: 'rgba(0,0,0,0.55)', color: '#fff', fontSize: 'var(--text-micro)' }}>
                  <Icon name={a.type === 'video' ? 'video' : 'image'} size={11} color="#fff" />{a.type}
                </span>
                <span style={{ position: 'absolute', top: 4, right: 4 }}>
                  <IconButton icon="x" size="sm" variant="solid" label="Remove attachment" onClick={() => removeAttachment(idx)} />
                </span>
              </div>
              <input value={a.caption || ''} onChange={(e) => updateCaption(idx, e.target.value)} placeholder="Add a caption (optional)"
                style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', padding: '8px 10px', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }} />
            </div>
          ))}
        </div>
      )}
      <input ref={fileInputRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={handleFileChange} />
      <Button variant="secondary" size="sm" icon="upload" onClick={() => fileInputRef.current?.click()} loading={uploading}>
        Add photo or video
      </Button>
      {error && <p style={{ marginTop: 8, fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)' }}>{error}</p>}
    </div>
  )
}
