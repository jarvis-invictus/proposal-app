/** Derives a slide sequence from the same proposal `content` JSON the static document already
 * renders — no parallel AI schema, no persisted data, computed fresh at render time. */

export type DeckBrand = { primary?: string; secondary?: string; accent?: string; name?: string | null } | null

export type DeckSlide =
  | { id: string; kind: 'cover'; title: string; clientName: string; preparedFor: string; preparedBy: string; dateIssued: string; validUntil: string }
  | { id: string; kind: 'packages'; packages: any[] }
  | { id: string; kind: 'addOns'; addOns: any[] }
  | { id: string; kind: 'timeline'; timeline: any[] }
  | { id: string; kind: 'attachments'; attachments: any[] }
  | { id: string; kind: 'terms'; terms: string[]; paymentSection: { schedule: string; terms: string } | null }
  | { id: string; kind: 'closing'; clientName: string }

export function buildDeckSlides(content: any): DeckSlide[] {
  const slides: DeckSlide[] = [
    {
      id: 'cover', kind: 'cover',
      title: content?.title || 'Untitled proposal',
      clientName: content?.clientName || '',
      preparedFor: content?.preparedFor || '',
      preparedBy: content?.preparedBy || '',
      dateIssued: content?.dateIssued || '',
      validUntil: content?.validUntil || '',
    },
  ]
  if (Array.isArray(content?.packages) && content.packages.length > 0) {
    slides.push({ id: 'packages', kind: 'packages', packages: content.packages })
  }
  if (Array.isArray(content?.addOns) && content.addOns.length > 0) {
    slides.push({ id: 'addOns', kind: 'addOns', addOns: content.addOns })
  }
  if (Array.isArray(content?.timeline) && content.timeline.length > 0) {
    slides.push({ id: 'timeline', kind: 'timeline', timeline: content.timeline })
  }
  if (Array.isArray(content?.attachments) && content.attachments.length > 0) {
    slides.push({ id: 'attachments', kind: 'attachments', attachments: content.attachments })
  }
  if ((Array.isArray(content?.terms) && content.terms.length > 0) || content?.paymentSection) {
    slides.push({ id: 'terms', kind: 'terms', terms: content?.terms || [], paymentSection: content?.paymentSection || null })
  }
  slides.push({ id: 'closing', kind: 'closing', clientName: content?.clientName || 'you' })
  return slides
}
