'use client'

import * as React from 'react'
import { Check } from 'lucide-react'
import { Icon } from '@/components/ui/Icon'
import { formatCurrency } from '@/lib/formatCurrency'
import type { LayoutPrimitive } from '@/lib/layout/registry'
import type { LayoutContext } from './context'

/**
 * One function component per layout primitive `type`. Every component pulls color/font from
 * `ctx` (accent, headingFontFamily) rather than any value the model could invent — brand
 * consistency is enforced structurally here, not left to the model's memory. The four
 * data-reference components (Pricing/Timeline/Payment/Terms) are near-direct ports of
 * PublicProposalView's existing fixed-render JSX, so the free-layout path and the legacy
 * fallback path render pricing/timeline/payment/terms identically.
 */

const HEAD_SIZE: Record<'1' | '2' | '3', string> = {
  '1': 'var(--text-h2)',
  '2': 'var(--text-h3)',
  '3': 'var(--text-h4)',
}

function HeadingPrimitive({ node, ctx }: { node: Extract<LayoutPrimitive, { type: 'heading' }>; ctx: LayoutContext }) {
  return (
    <h2 style={{ fontSize: HEAD_SIZE[node.level], fontWeight: 700, margin: '0 0 16px', fontFamily: ctx.headingFontFamily, color: 'var(--text-primary)' }}>
      {node.text}
    </h2>
  )
}

function ParagraphPrimitive({ node }: { node: Extract<LayoutPrimitive, { type: 'paragraph' }> }) {
  return <p style={{ fontSize: 'var(--text-body)', color: 'var(--text-secondary)', lineHeight: 'var(--leading-body)', whiteSpace: 'pre-wrap', margin: '0 0 16px' }}>{node.text}</p>
}

function ListPrimitiveComponent({ node, ctx }: { node: Extract<LayoutPrimitive, { type: 'list' }>; ctx: LayoutContext }) {
  if (node.style === 'check') {
    return (
      <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {node.items.map((item, i) => (
          <li key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
            <Check size={17} style={{ flex: 'none', marginTop: 2, color: ctx.accent }} />
            <span style={{ whiteSpace: 'pre-wrap' }}>{item}</span>
          </li>
        ))}
      </ul>
    )
  }
  const Tag = node.style === 'numbered' ? 'ol' : 'ul'
  return (
    <Tag style={{ margin: '0 0 16px', paddingLeft: 20, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {node.items.map((item, i) => (
        <li key={i} style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{item}</li>
      ))}
    </Tag>
  )
}

function DividerPrimitive() {
  return <hr style={{ border: 'none', borderTop: '1px solid var(--border-hairline)', margin: '20px 0' }} />
}

const SPACER_SIZE: Record<'sm' | 'md' | 'lg', number> = { sm: 16, md: 32, lg: 56 }
function SpacerPrimitive({ node }: { node: Extract<LayoutPrimitive, { type: 'spacer' }> }) {
  return <div style={{ height: SPACER_SIZE[node.size] }} />
}

function QuotePrimitive({ node, ctx }: { node: Extract<LayoutPrimitive, { type: 'quote' }>; ctx: LayoutContext }) {
  return (
    <blockquote style={{ margin: '0 0 16px', padding: '4px 0 4px 20px', borderLeft: `3px solid ${ctx.accent}` }}>
      <p style={{ fontSize: 'var(--text-body-lg)', color: 'var(--text-primary)', fontStyle: 'italic', margin: '0 0 8px', lineHeight: 'var(--leading-body)' }}>&ldquo;{node.quote}&rdquo;</p>
      <cite style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', fontStyle: 'normal' }}>{node.attribution}</cite>
    </blockquote>
  )
}

function StatRowPrimitive({ node, ctx }: { node: Extract<LayoutPrimitive, { type: 'statRow' }>; ctx: LayoutContext }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${node.stats.length}, 1fr)`, gap: 16, margin: '0 0 16px' }}>
      {node.stats.map((s, i) => (
        <div key={i} style={{ padding: '14px 16px', borderRadius: 'var(--radius-card)', border: '1px solid var(--border-hairline)' }}>
          <div style={{ fontSize: 28, fontWeight: 700, color: ctx.accent }}>{s.value}</div>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 500, color: 'var(--text-primary)', marginTop: 2 }}>{s.label}</div>
          {s.caption && <div style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)', marginTop: 2 }}>{s.caption}</div>}
        </div>
      ))}
    </div>
  )
}

function TablePrimitive({ node }: { node: Extract<LayoutPrimitive, { type: 'table' }> }) {
  return (
    <div style={{ overflowX: 'auto', margin: '0 0 16px' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
        <thead>
          <tr>
            {node.headers.map((h, i) => (
              <th key={i} style={{ textAlign: 'left', padding: '8px 12px', borderBottom: '2px solid var(--border-hairline)', color: 'var(--text-primary)', fontWeight: 700 }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {node.rows.map((row, ri) => (
            <tr key={ri}>
              {row.map((cell, ci) => (
                <td key={ci} style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-hairline)', color: 'var(--text-secondary)' }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ButtonLinkPrimitive({ node, ctx }: { node: Extract<LayoutPrimitive, { type: 'buttonLink' }>; ctx: LayoutContext }) {
  return (
    <button
      type="button"
      onClick={ctx.onAcceptClick}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8, padding: '12px 22px', borderRadius: 'var(--radius-pill)',
        border: 'none', background: ctx.accent, color: '#fff', fontSize: 'var(--text-body)', fontWeight: 600,
        cursor: 'pointer', fontFamily: 'var(--font-sans)',
      }}
    >
      <Icon name="check" size={16} />{node.label}
    </button>
  )
}

function ImagePrimitive({ node, ctx }: { node: Extract<LayoutPrimitive, { type: 'image' }>; ctx: LayoutContext }) {
  const src = node.source.kind === 'logo' ? ctx.logoUrl : ctx.attachments[node.source.attachmentIndex]?.url
  if (!src) return null
  return (
    <figure style={{ margin: '0 0 16px' }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={node.caption || 'Image'} loading="lazy" style={{ maxWidth: '100%', display: 'block', borderRadius: 'var(--radius-card)' }} />
      {node.caption && <figcaption style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 8 }}>{node.caption}</figcaption>}
    </figure>
  )
}

// Near-direct port of PublicProposalView's packages grid.
function PricingTablePrimitive({ node, ctx }: { node: Extract<LayoutPrimitive, { type: 'pricingTable' }>; ctx: LayoutContext }) {
  const pkgs = node.packageRefs.map((i) => ctx.packages[i]).filter(Boolean)
  if (pkgs.length === 0) return null
  return (
    <div style={{ margin: '0 0 16px' }}>
      <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 700, marginBottom: 24, fontFamily: ctx.headingFontFamily, color: 'var(--text-primary)' }}>{node.heading}</h2>
      {node.intro && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 20 }}>{node.intro}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: pkgs.length === 1 ? '1fr' : 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
        {pkgs.map((pkg, idx) => (
          <div key={idx} style={{ position: 'relative', borderRadius: 12, padding: 24, border: pkg.popular ? `2px solid ${ctx.accent}` : '1px solid var(--border-hairline)' }}>
            {pkg.popular && (
              <div style={{ position: 'absolute', top: -12, left: '50%', transform: 'translateX(-50%)', padding: '4px 12px', borderRadius: 999, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#fff', background: ctx.accent }}>
                Most Popular
              </div>
            )}
            <h3 style={{ fontSize: 'var(--text-h4)', fontWeight: 700, marginBottom: 8, color: 'var(--text-primary)' }}>{pkg.name}</h3>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 24, minHeight: 40, whiteSpace: 'pre-wrap' }}>{pkg.description}</p>
            <div style={{ marginBottom: 24, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-primary)' }}>{formatCurrency(pkg.discountedPrice, ctx.currency)}</span>
              {pkg.originalPrice > 0 && (
                <span style={{ fontSize: 'var(--text-body-lg)', textDecoration: 'line-through', color: 'var(--text-muted)' }}>{formatCurrency(pkg.originalPrice, ctx.currency)}</span>
              )}
            </div>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {pkg.deliverables?.map((d, di) => (
                <li key={di} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                  <Check size={20} style={{ flex: 'none', marginTop: 2, color: ctx.accent }} />
                  <span style={{ flex: 1, whiteSpace: 'pre-wrap' }}>{d}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

// Near-direct port of PublicProposalView's timeline list.
function TimelineListPrimitive({ node, ctx }: { node: Extract<LayoutPrimitive, { type: 'timelineList' }>; ctx: LayoutContext }) {
  if (ctx.timeline.length === 0) return null
  return (
    <div style={{ margin: '0 0 16px' }}>
      <h2 style={{ fontSize: 'var(--text-h3)', fontWeight: 700, marginBottom: 24, fontFamily: ctx.headingFontFamily, color: 'var(--text-primary)' }}>{node.heading}</h2>
      {node.intro && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', marginBottom: 20 }}>{node.intro}</p>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {ctx.timeline.map((phase, idx) => (
          <div key={idx} style={{ display: 'flex', gap: 16 }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: '50%', background: ctx.accent, marginTop: 6, flex: 'none' }} />
            <div style={{ width: 128, flex: 'none' }}>
              <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{phase.phase}</div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>{phase.duration}</div>
            </div>
            <div style={{ flex: 1, paddingBottom: 20, borderBottom: '1px solid var(--border-hairline)' }}>
              <p style={{ color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', margin: 0 }}>{phase.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// Near-direct port of PublicProposalView's payment schedule + UPI/QR card.
function PaymentInfoPrimitive({ node, ctx }: { node: Extract<LayoutPrimitive, { type: 'paymentInfo' }>; ctx: LayoutContext }) {
  if (!ctx.paymentSection) return null
  const pd = ctx.paymentDisplay
  return (
    <div style={{ margin: '0 0 16px' }}>
      {node.heading && <h2 style={{ fontSize: 'var(--text-body-lg)', fontWeight: 700, marginBottom: 16, fontFamily: ctx.headingFontFamily, color: 'var(--text-primary)' }}>{node.heading}</h2>}
      <p style={{ fontWeight: 500, marginBottom: 8, color: 'var(--text-primary)', fontSize: 'var(--text-sm)' }}>{ctx.paymentSection.schedule}</p>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>{ctx.paymentSection.terms}</p>
      {pd && (pd.payment_upi_id || pd.payment_link || pd.payment_qr_url) && (
        <div style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--border-hairline)', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-hairline)' }}>
          {pd.payment_qr_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={pd.payment_qr_url} alt="Payment QR code" width={56} height={56} style={{ borderRadius: 8, flex: 'none' }} />
          ) : (
            <Icon name="qr-code" size={30} />
          )}
          <div>
            <div style={{ fontSize: 'var(--text-body)', fontWeight: 500, color: 'var(--text-primary)' }}>Pay via UPI or QR</div>
            <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              {pd.payment_upi_id && `UPI: ${pd.payment_upi_id}`}
              {pd.payment_upi_id && pd.payment_link && ' · '}
              {pd.payment_link && <a href={pd.payment_link} target="_blank" rel="noreferrer" style={{ color: 'var(--brand-deep)', fontWeight: 500 }}>Payment link</a>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function TermsListPrimitive({ node, ctx }: { node: Extract<LayoutPrimitive, { type: 'termsList' }>; ctx: LayoutContext }) {
  if (ctx.terms.length === 0) return null
  return (
    <div style={{ margin: '0 0 16px' }}>
      {node.heading && <h2 style={{ fontSize: 'var(--text-body-lg)', fontWeight: 700, marginBottom: 16, fontFamily: ctx.headingFontFamily, color: 'var(--text-primary)' }}>{node.heading}</h2>}
      <ul style={{ listStyle: 'disc', paddingLeft: 18, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
        {ctx.terms.map((term, idx) => <li key={idx} style={{ whiteSpace: 'pre-wrap' }}>{term}</li>)}
      </ul>
    </div>
  )
}

function CardPrimitive({ node, ctx }: { node: Extract<LayoutPrimitive, { type: 'card' }>; ctx: LayoutContext }) {
  return (
    <div style={{ padding: 20, borderRadius: 'var(--radius-card)', border: '1px solid var(--border-hairline)', background: node.tone === 'sunken' ? 'var(--surface-sunken)' : 'transparent', margin: '0 0 16px' }}>
      {node.children.map((child, i) => renderPrimitive(child, ctx, i))}
    </div>
  )
}

function ColumnsPrimitive({ node, ctx }: { node: Extract<LayoutPrimitive, { type: 'columns' }>; ctx: LayoutContext }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${node.columns.length}, 1fr)`, gap: 24, margin: '0 0 16px' }}>
      {node.columns.map((col, ci) => (
        <div key={ci}>{col.map((child, i) => renderPrimitive(child, ctx, i))}</div>
      ))}
    </div>
  )
}

const PRIMITIVE_COMPONENTS: Record<string, React.FC<{ node: any; ctx: LayoutContext }>> = {
  heading: HeadingPrimitive,
  paragraph: ParagraphPrimitive,
  list: ListPrimitiveComponent,
  divider: DividerPrimitive,
  spacer: SpacerPrimitive,
  quote: QuotePrimitive,
  statRow: StatRowPrimitive,
  table: TablePrimitive,
  buttonLink: ButtonLinkPrimitive,
  image: ImagePrimitive,
  pricingTable: PricingTablePrimitive,
  timelineList: TimelineListPrimitive,
  paymentInfo: PaymentInfoPrimitive,
  termsList: TermsListPrimitive,
  card: CardPrimitive,
  columns: ColumnsPrimitive,
}

// Shared by LayoutRenderer (top-level sections) and Card/Columns (nested children) — a node of
// an unrecognized type is skipped gracefully rather than crashing the whole page, the same
// pattern the rejected block-catalogue prototype's BlockRenderer already validated.
export function renderPrimitive(node: any, ctx: LayoutContext, key: React.Key): React.ReactNode {
  const Component = PRIMITIVE_COMPONENTS[node?.type]
  if (!Component) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[LayoutRenderer] unknown primitive type "${node?.type}" — skipped`)
    }
    return null
  }
  return <Component key={key} node={node} ctx={ctx} />
}
