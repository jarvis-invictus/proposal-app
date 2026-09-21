/**
 * Render-time context for the free-form layout primitives — threads brand data the same way
 * PublicProposalView already threads it into DeckView's `brand` prop, and the structured data
 * (packages/timeline/attachments/payment/terms) that data-reference primitives render verbatim.
 */
export type LayoutContext = {
  accent: string
  headingFontFamily?: string
  currency: string
  packages: Array<{
    name: string
    description: string
    originalPrice: number | null
    discountedPrice: number
    popular: boolean
    deliverables: string[]
  }>
  timeline: Array<{ phase: string; duration: string; description: string }>
  attachments: Array<{ url: string; type: 'image' | 'video'; caption?: string }>
  logoUrl: string | null
  paymentSection: { schedule: string; terms: string } | null
  paymentDisplay: { payment_upi_id: string | null; payment_link: string | null; payment_qr_url: string | null } | null
  terms: string[]
  onAcceptClick?: () => void
}
