'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { extractFromUrl, extractFromImage, saveBrandKit } from './actions'
import { FilterChip } from '@/components/ui/FilterChip'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Icon } from '@/components/ui/Icon'

export function BrandKitClient() {
  const router = useRouter()
  const [sourceType, setSourceType] = useState<'url' | 'image' | 'manual'>('url')
  const [sourceRef, setSourceRef] = useState('')
  const [isExtracting, setIsExtracting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')

  const [brandData, setBrandData] = useState({
    colors: { primary: '#000000', secondary: '#ffffff', accent: '#000000', background: '#ffffff', text: '#000000' },
    fonts: { heading: 'sans-serif', body: 'sans-serif' },
    logoUrl: ''
  })

  const [hasExtracted, setHasExtracted] = useState(false)

  const handleUrlExtraction = async () => {
    try {
      setIsExtracting(true)
      setError('')
      const data = await extractFromUrl(sourceRef)
      setBrandData(data as any)
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
        setBrandData(data as any)
        setHasExtracted(true)
      } catch (err: any) {
        setError(err.message || 'Failed to extract from Image')
      } finally {
        setIsExtracting(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    try {
      setIsSaving(true)
      await saveBrandKit({
        source_type: sourceType,
        source_reference: sourceRef,
        ...brandData
      })
      router.push('/dashboard/templates')
    } catch (err: any) {
      setError(err.message || 'Failed to save')
      setIsSaving(false)
    }
  }

  return (
    <div style={{ maxWidth: 880, margin: '0 auto' }}>
      <h1 style={{ margin: '0 0 32px', fontSize: 'var(--text-h2)', fontWeight: 'var(--weight-semibold)', letterSpacing: 'var(--tracking-tight)', color: 'var(--text-primary)' }}>
        Set up your Brand Kit
      </h1>

      {!hasExtracted ? (
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-card-lg)', padding: 24 }}>
          <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--weight-semibold)', margin: '0 0 16px', color: 'var(--text-primary)' }}>
            Extract from existing assets
          </h2>

          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <FilterChip active={sourceType === 'url'} onClick={() => setSourceType('url')} icon="link">From Website URL</FilterChip>
            <FilterChip active={sourceType === 'image'} onClick={() => setSourceType('image')} icon="upload">From Document/Image</FilterChip>
            <FilterChip active={sourceType === 'manual'} onClick={() => { setSourceType('manual'); setHasExtracted(true) }} icon="signature">Enter Manually</FilterChip>
          </div>

          {sourceType === 'url' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <Input
                type="url"
                value={sourceRef}
                onChange={e => setSourceRef(e.target.value)}
                placeholder="https://yourwebsite.com"
                icon="link"
              />
              <div>
                <Button
                  variant="primary"
                  icon="sparkles"
                  loading={isExtracting}
                  disabled={!sourceRef}
                  onClick={handleUrlExtraction}
                >
                  {isExtracting ? 'Extracting via AI...' : 'Extract Brand Kit'}
                </Button>
              </div>
            </div>
          )}

          {sourceType === 'image' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <label style={{
                display: 'flex', alignItems: 'center', gap: 10, height: 'var(--control-h)', padding: '0 14px',
                borderRadius: 'var(--radius-pill)', border: '1px dashed var(--border-strong)', cursor: isExtracting ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-secondary)',
                opacity: isExtracting ? 0.5 : 1,
              }}>
                <Icon name="upload" size={16} color="var(--text-muted)" />
                {sourceRef || 'Choose an image or PDF…'}
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleImageUpload}
                  disabled={isExtracting}
                  style={{ display: 'none' }}
                />
              </label>
              {isExtracting && (
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--brand-deep)' }}>Analyzing image with Claude Vision...</span>
              )}
            </div>
          )}

          {error && (
            <p style={{ marginTop: 16, fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)' }}>{error}</p>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--surface-card)', border: '1px solid var(--border-hairline)', borderRadius: 'var(--radius-card-lg)', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
            <h2 style={{ fontSize: 'var(--text-h4)', fontWeight: 'var(--weight-semibold)', margin: 0, color: 'var(--text-primary)' }}>
              Review &amp; Edit Brand Kit
            </h2>
            <button
              onClick={() => setHasExtracted(false)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}
            >
              Start Over
            </button>
          </div>

          {(brandData as any).is_low_confidence && (
            <div style={{
              marginBottom: 24, padding: 14, borderRadius: 'var(--radius-sm)', display: 'flex', alignItems: 'flex-start', gap: 10,
              background: 'var(--status-caution-surface)', border: '1px solid var(--status-caution-border)',
            }}>
              <Icon name="triangle-alert" size={16} color="var(--status-caution)" style={{ marginTop: 2, flex: 'none' }} />
              <div>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-medium)', color: 'var(--status-caution-text)', margin: 0 }}>
                  Low Confidence Extraction
                </h3>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)', margin: '4px 0 0' }}>
                  We couldn&apos;t extract much from this site (missing logo or minimal colors detected). Please double-check these fields.
                </p>
              </div>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0,1fr))', gap: 32 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', margin: 0 }}>Colors</h3>
              {Object.entries(brandData.colors).map(([key, val]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 36, height: 36, flex: 'none', borderRadius: '50%', backgroundColor: val,
                    border: '1px solid var(--border-hairline)', boxShadow: 'var(--shadow-hover)',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <label style={{ display: 'block', fontSize: 'var(--text-micro)', color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 2 }}>{key}</label>
                    <input
                      type="text"
                      value={val}
                      onChange={e => setBrandData({ ...brandData, colors: { ...brandData.colors, [key]: e.target.value } })}
                      style={{
                        width: '100%', border: 'none', borderBottom: '1px solid var(--border-hairline)', outline: 'none',
                        padding: '4px 0', background: 'transparent', fontFamily: 'var(--font-mono)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--brand)' }}
                      onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'var(--border-hairline)' }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', margin: 0 }}>Typography</h3>
                {Object.entries(brandData.fonts).map(([key, val]) => (
                  <div key={key}>
                    <label style={{ display: 'block', fontSize: 'var(--text-micro)', color: 'var(--text-muted)', textTransform: 'capitalize', marginBottom: 2 }}>{key} Font</label>
                    <input
                      type="text"
                      value={val}
                      onChange={e => setBrandData({ ...brandData, fonts: { ...brandData.fonts, [key]: e.target.value } })}
                      style={{
                        width: '100%', border: 'none', borderBottom: '1px solid var(--border-hairline)', outline: 'none',
                        padding: '4px 0', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)',
                      }}
                      onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--brand)' }}
                      onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'var(--border-hairline)' }}
                    />
                  </div>
                ))}
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--weight-semibold)', color: 'var(--text-primary)', margin: 0 }}>Logo</h3>
                <input
                  type="url"
                  value={brandData.logoUrl}
                  onChange={e => setBrandData({ ...brandData, logoUrl: e.target.value })}
                  placeholder="https://..."
                  style={{
                    width: '100%', border: 'none', borderBottom: '1px solid var(--border-hairline)', outline: 'none',
                    padding: '4px 0', background: 'transparent', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = 'var(--brand)' }}
                  onBlur={(e) => { e.currentTarget.style.borderBottomColor = 'var(--border-hairline)' }}
                />
                {brandData.logoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={brandData.logoUrl} alt="Logo Preview" style={{ height: 64, objectFit: 'contain' }} />
                )}
              </div>
            </div>
          </div>

          {error && (
            <p style={{ marginTop: 16, fontSize: 'var(--text-sm)', color: 'var(--status-caution-text)' }}>{error}</p>
          )}

          <div style={{ marginTop: 32, display: 'flex', justifyContent: 'flex-end' }}>
            <Button variant="primary" size="lg" icon="check" loading={isSaving} onClick={handleSave}>
              Save &amp; Continue to Templates
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
